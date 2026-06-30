from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_text(value) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _normalize_team_abbreviation(value) -> str | None:
    abbreviation = _clean_text(value)
    if abbreviation is None:
        return None
    abbreviation = abbreviation.upper()
    return TEAM_ABBREVIATION_ALIASES.get(abbreviation, abbreviation)


def upsert_probable_pitchers(games: list[dict]) -> int:
    candidates: dict[int, dict] = {}
    for game in games:
        for side in ("home", "away"):
            player_id = game.get(f"{side}_probable_pitcher_mlb_id")
            if player_id is None:
                continue
            candidates[int(player_id)] = {
                "mlb_player_id": int(player_id),
                "full_name": _clean_text(
                    game.get(f"{side}_probable_pitcher_name")
                ),
                "current_team_abbreviation": game.get(f"{side}_team"),
            }

    if not candidates:
        print("No probable pitchers available for dim_players.")
        return 0

    player_ids = sorted(candidates)
    existing: dict[int, dict] = {}
    for player_id_batch in batches(player_ids):
        rows = (
            supabase.table("dim_players")
            .select(
                "player_key,mlb_player_id,full_name,"
                "current_team_abbreviation,bats,throws,primary_position"
            )
            .in_("mlb_player_id", player_id_batch)
            .execute()
            .data
            or []
        )
        existing.update({int(row["mlb_player_id"]): row for row in rows})

    updated_at = _utc_now_iso()
    payload = []
    for player_id in player_ids:
        candidate = candidates[player_id]
        current = existing.get(player_id, {})
        payload.append(
            {
                "mlb_player_id": player_id,
                "full_name": (
                    _clean_text(current.get("full_name"))
                    or candidate["full_name"]
                ),
                "current_team_abbreviation": (
                    _normalize_team_abbreviation(
                        candidate["current_team_abbreviation"]
                    )
                    or current.get("current_team_abbreviation")
                ),
                "bats": current.get("bats"),
                "throws": current.get("throws"),
                "primary_position": current.get("primary_position"),
                "updated_at": updated_at,
            }
        )

    for player_batch in batches(payload):
        (
            supabase.table("dim_players")
            .upsert(player_batch, on_conflict="mlb_player_id")
            .execute()
        )
    print(f"Upserted {len(payload)} probable pitchers into dim_players.")
    return len(payload)


def upsert_games(games: list[dict]) -> int:
    print(f"Attempting to upsert {len(games)} games...")

    # Verify there are no duplicate game IDs
    game_ids = [g["mlb_game_pk"] for g in games]
    duplicates = len(game_ids) - len(set(game_ids))

    print(f"Duplicate game IDs found: {duplicates}")

    if duplicates > 0:
        duplicate_values = {
            game_id
            for game_id in game_ids
            if game_ids.count(game_id) > 1
        }
        print("Duplicate IDs:", duplicate_values)

    for game_batch in batches(games):
        supabase.table("games").upsert(
            game_batch,
            on_conflict="mlb_game_pk",
        ).execute()

    return len(games)
