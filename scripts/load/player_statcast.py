from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase

BATCH_SIZE = 500

AGGREGATE_CONFIG = (
    (
        "agg_player_offense_weekly",
        "season,week_start_date,mlb_player_id",
        "offense_weekly",
    ),
    (
        "agg_player_pitching_weekly",
        "season,week_start_date,mlb_player_id",
        "pitching_weekly",
    ),
    (
        "agg_player_offense_season",
        "season,mlb_player_id",
        "offense_season",
    ),
    (
        "agg_player_pitching_season",
        "season,mlb_player_id",
        "pitching_season",
    ),
)


def _chunks(values: list, size: int = BATCH_SIZE):
    for index in range(0, len(values), size):
        yield values[index : index + size]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_existing_players(player_ids: list[int]) -> dict[int, dict]:
    players: dict[int, dict] = {}
    for player_id_batch in _chunks(player_ids):
        result = (
            supabase.table("dim_players")
            .select(
                "player_key,mlb_player_id,full_name,"
                "current_team_abbreviation,bats,throws,primary_position"
            )
            .in_("mlb_player_id", player_id_batch)
            .execute()
        )
        for row in result.data or []:
            players[int(row["mlb_player_id"])] = row
    return players


def _fetch_operational_players(player_ids: list[int]) -> dict[int, dict]:
    players: dict[int, dict] = {}
    for player_id_batch in _chunks(player_ids):
        result = (
            supabase.table("players")
            .select(
                "mlb_player_id,full_name,current_team_abbreviation,"
                "bats,throws,position"
            )
            .in_("mlb_player_id", player_id_batch)
            .execute()
        )
        for row in result.data or []:
            players[int(row["mlb_player_id"])] = row
    return players


def _build_dimension_candidates(row_groups: list[list[dict]]) -> dict[int, dict]:
    candidates: dict[int, dict] = {}
    for rows in row_groups:
        for row in rows:
            player_id = row.get("mlb_player_id")
            if player_id is None:
                continue

            player_id = int(player_id)
            candidate = candidates.setdefault(
                player_id,
                {
                    "mlb_player_id": player_id,
                    "full_name": None,
                    "current_team_abbreviation": None,
                },
            )
            if row.get("full_name"):
                candidate["full_name"] = row["full_name"]
            if row.get("team_abbreviation"):
                candidate["current_team_abbreviation"] = row[
                    "team_abbreviation"
                ]
    return candidates


def _upsert_dim_players(row_groups: list[list[dict]]) -> dict[int, dict]:
    candidates = _build_dimension_candidates(row_groups)
    if not candidates:
        print("No players to load into dim_players.")
        return {}

    player_ids = sorted(candidates)
    existing = _fetch_existing_players(player_ids)
    operational = _fetch_operational_players(player_ids)
    updated_at = _utc_now_iso()
    payload = []

    for player_id in player_ids:
        candidate = candidates[player_id]
        current = existing.get(player_id, {})
        source = operational.get(player_id, {})
        payload.append(
            {
                "mlb_player_id": player_id,
                "full_name": (
                    candidate["full_name"]
                    or source.get("full_name")
                    or current.get("full_name")
                ),
                "current_team_abbreviation": (
                    candidate["current_team_abbreviation"]
                    or source.get("current_team_abbreviation")
                    or current.get("current_team_abbreviation")
                ),
                "bats": source.get("bats") or current.get("bats"),
                "throws": source.get("throws") or current.get("throws"),
                "primary_position": (
                    source.get("position") or current.get("primary_position")
                ),
                "updated_at": updated_at,
            }
        )

    for payload_batch in _chunks(payload):
        (
            supabase.table("dim_players")
            .upsert(payload_batch, on_conflict="mlb_player_id")
            .execute()
        )

    print(f"Upserted {len(payload)} rows into dim_players.")
    return _fetch_existing_players(player_ids)


def _upsert_aggregate_rows(
    table_name: str,
    conflict_key: str,
    rows: list[dict],
    players: dict[int, dict],
) -> int:
    if not rows:
        print(f"No rows to load into {table_name}.")
        return 0

    updated_at = _utc_now_iso()
    payload = []
    for row in rows:
        player_id = int(row["mlb_player_id"])
        player = players.get(player_id)
        if player is None:
            raise ValueError(
                f"dim_players has no row for MLB player {player_id}."
            )

        payload.append(
            {
                **row,
                "player_key": player["player_key"],
                "full_name": row.get("full_name") or player.get("full_name"),
                "team_abbreviation": (
                    row.get("team_abbreviation")
                    or player.get("current_team_abbreviation")
                ),
                "updated_at": updated_at,
            }
        )

    for payload_batch in _chunks(payload):
        (
            supabase.table(table_name)
            .upsert(payload_batch, on_conflict=conflict_key)
            .execute()
        )

    print(f"Upserted {len(payload)} rows into {table_name}.")
    return len(payload)


def load_player_statcast(
    offense_weekly_rows: list[dict],
    pitching_weekly_rows: list[dict],
    offense_season_rows: list[dict],
    pitching_season_rows: list[dict],
) -> dict[str, int]:
    row_groups = [
        offense_weekly_rows,
        pitching_weekly_rows,
        offense_season_rows,
        pitching_season_rows,
    ]
    players = _upsert_dim_players(row_groups)
    counts = {"dim_players": len(players)}

    for (table_name, conflict_key, count_key), rows in zip(
        AGGREGATE_CONFIG,
        row_groups,
        strict=True,
    ):
        counts[count_key] = _upsert_aggregate_rows(
            table_name,
            conflict_key,
            rows,
            players,
        )

    return counts
