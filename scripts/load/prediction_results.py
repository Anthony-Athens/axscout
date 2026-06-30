from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

PREDICTION_RESULT_CONFLICT_KEY = "mlb_game_pk,model_name,model_version"


def load_prediction_results(rows: list[dict]) -> int:
    if not rows:
        print("No prediction result rows to load.")
        return 0

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [{**row, "updated_at": updated_at} for row in rows]
    for payload_batch in batches(payload):
        supabase.table("prediction_results").upsert(
            payload_batch,
            on_conflict=PREDICTION_RESULT_CONFLICT_KEY,
        ).execute()
    print(f"Upserted {len(payload)} rows into prediction_results.")
    return len(payload)
