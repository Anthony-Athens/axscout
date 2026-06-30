from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches, select_all


def fetch_odds_match_games() -> list[dict]:
    return select_all(
        "games",
        "mlb_game_pk,game_date,home_team,away_team",
        order_by=("game_date", "mlb_game_pk"),
    )


def load_odds_snapshots(rows: list[dict]) -> int:
    if not rows:
        print("No odds snapshot rows to load.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    for payload_batch in batches(payload):
        supabase.table("odds_snapshots").insert(payload_batch).execute()

    print(f"Inserted {len(payload)} append-only rows into odds_snapshots.")
    return len(payload)
