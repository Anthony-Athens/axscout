from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

PREDICTION_CONFLICT_KEY = "mlb_game_pk,model_name,model_version"


def load_game_predictions(rows: list[dict]) -> int:
    if not rows:
        print("No game prediction rows to load.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    for payload_batch in batches(payload):
        supabase.table("game_predictions").upsert(
            payload_batch,
            on_conflict=PREDICTION_CONFLICT_KEY,
        ).execute()
    print(f"Upserted {len(payload)} rows into game_predictions.")
    return len(payload)
