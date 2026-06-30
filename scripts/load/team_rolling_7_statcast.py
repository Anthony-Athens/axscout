from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

ROLLING_7_CONFLICT_KEY = "season,window_end_date,team_abbreviation"


def _upsert_rows(table_name: str, rows: list[dict]) -> int:
    if not rows:
        print(f"No rows to load into {table_name}.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    for payload_batch in batches(payload):
        supabase.table(table_name).upsert(
            payload_batch,
            on_conflict=ROLLING_7_CONFLICT_KEY,
        ).execute()
    print(f"Upserted {len(payload)} rows into {table_name}.")
    return len(payload)


def load_team_rolling_7_statcast(
    offense_rows: list[dict],
    pitching_rows: list[dict],
) -> tuple[int, int]:
    offense_loaded = _upsert_rows(
        "agg_team_offense_rolling_7",
        offense_rows,
    )
    pitching_loaded = _upsert_rows(
        "agg_team_pitching_rolling_7",
        pitching_rows,
    )
    return offense_loaded, pitching_loaded
