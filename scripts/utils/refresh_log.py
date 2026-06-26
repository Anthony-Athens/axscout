from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def start_refresh(pipeline_name: str, source_date: str) -> int:
    result = (
        supabase.table("data_refresh_runs")
        .insert(
            {
                "pipeline_name": pipeline_name,
                "status": "running",
                "source_date": source_date,
            }
        )
        .execute()
    )

    return result.data[0]["id"]


def mark_refresh_success(run_id: int, records_loaded: int) -> None:
    (
        supabase.table("data_refresh_runs")
        .update(
            {
                "status": "success",
                "finished_at": utc_now_iso(),
                "records_loaded": records_loaded,
                "error_message": None,
            }
        )
        .eq("id", run_id)
        .execute()
    )


def mark_refresh_failed(run_id: int, error_message: str) -> None:
    (
        supabase.table("data_refresh_runs")
        .update(
            {
                "status": "failed",
                "finished_at": utc_now_iso(),
                "error_message": error_message,
            }
        )
        .eq("id", run_id)
        .execute()
    )