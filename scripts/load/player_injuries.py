from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upsert_dim_players(rows: list[dict]) -> int:
    candidates = {
        int(row["mlb_player_id"]): row
        for row in rows
        if row.get("mlb_player_id") is not None
    }
    if not candidates:
        return 0

    existing = {}
    player_ids = sorted(candidates)
    for player_id_batch in batches(player_ids):
        current_rows = (
            supabase.table("dim_players")
            .select(
                "mlb_player_id,full_name,current_team_abbreviation,"
                "bats,throws,primary_position"
            )
            .in_("mlb_player_id", player_id_batch)
            .execute()
            .data
            or []
        )
        existing.update(
            {int(row["mlb_player_id"]): row for row in current_rows}
        )

    updated_at = _utc_now_iso()
    payload = []
    for player_id, candidate in candidates.items():
        current = existing.get(player_id, {})
        payload.append(
            {
                "mlb_player_id": player_id,
                "full_name": current.get("full_name")
                or candidate.get("player_name"),
                "current_team_abbreviation": candidate.get(
                    "team_abbreviation"
                )
                or current.get("current_team_abbreviation"),
                "bats": current.get("bats"),
                "throws": current.get("throws"),
                "primary_position": current.get("primary_position")
                or candidate.get("primary_position"),
                "updated_at": updated_at,
            }
        )
    for payload_batch in batches(payload):
        supabase.table("dim_players").upsert(
            payload_batch,
            on_conflict="mlb_player_id",
        ).execute()
    print(f"Upserted {len(payload)} injured players into dim_players.")
    return len(payload)


def load_player_injuries(
    rows: list[dict],
    season: int,
    refreshed_teams: list[str],
) -> dict[str, int]:
    if len(set(refreshed_teams)) != 30:
        raise RuntimeError(
            "Refusing to reconcile active injuries without all 30 MLB teams."
        )

    dimensions_loaded = _upsert_dim_players(rows)
    updated_at = _utc_now_iso()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    for payload_batch in batches(payload):
        supabase.table("player_injuries").upsert(
            payload_batch,
            on_conflict="injury_key",
        ).execute()

    existing_active = (
        supabase.table("player_injuries")
        .select("id,injury_key")
        .eq("season", season)
        .eq("is_active", True)
        .in_("team_abbreviation", refreshed_teams)
        .execute()
        .data
        or []
    )
    active_keys = {row["injury_key"] for row in rows}
    inactive_ids = [
        row["id"]
        for row in existing_active
        if row["injury_key"] not in active_keys
    ]
    for id_batch in batches(inactive_ids):
        (
            supabase.table("player_injuries")
            .update({"is_active": False, "updated_at": updated_at})
            .in_("id", id_batch)
            .execute()
        )

    print(f"Upserted {len(payload)} active rows into player_injuries.")
    print(f"Marked {len(inactive_ids)} prior injury rows inactive.")
    return {
        "dim_players": dimensions_loaded,
        "active_injuries": len(payload),
        "injuries_deactivated": len(inactive_ids),
    }
