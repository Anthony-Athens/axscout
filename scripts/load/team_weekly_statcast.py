from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase

WEEKLY_CONFLICT_KEY = "season,week_start_date,team_abbreviation"
SEASON_CONFLICT_KEY = "season,team_abbreviation"


def _upsert_weekly_rows(table_name: str, rows: list[dict]) -> int:
    if not rows:
        print(f"No rows to load into {table_name}.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [
        {
            **row,
            "updated_at": updated_at,
        }
        for row in rows
    ]

    supabase.table(table_name).upsert(
        payload,
        on_conflict=WEEKLY_CONFLICT_KEY,
    ).execute()

    print(f"Upserted {len(payload)} rows into {table_name}.")
    return len(payload)


def _upsert_season_rows(table_name: str, rows: list[dict]) -> int:
    if not rows:
        print(f"No rows to load into {table_name}.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    supabase.table(table_name).upsert(
        payload,
        on_conflict=SEASON_CONFLICT_KEY,
    ).execute()
    print(f"Upserted {len(payload)} rows into {table_name}.")
    return len(payload)


def load_team_weekly_statcast(
    offense_rows: list[dict],
    pitching_rows: list[dict],
) -> tuple[int, int]:
    offense_loaded = _upsert_weekly_rows(
        "agg_team_offense_weekly",
        offense_rows,
    )
    pitching_loaded = _upsert_weekly_rows(
        "agg_team_pitching_weekly",
        pitching_rows,
    )

    return offense_loaded, pitching_loaded


def load_team_season_statcast(
    offense_rows: list[dict],
    pitching_rows: list[dict],
) -> tuple[int, int]:
    offense_loaded = load_team_offense_season(offense_rows)
    pitching_loaded = _upsert_season_rows(
        "agg_team_pitching_season",
        pitching_rows,
    )
    return offense_loaded, pitching_loaded


def load_team_offense_season(rows: list[dict]) -> int:
    return _upsert_season_rows("agg_team_offense_season", rows)
