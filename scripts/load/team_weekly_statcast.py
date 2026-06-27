from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase

WEEKLY_CONFLICT_KEY = "season,week_start_date,team_abbreviation"


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
