from datetime import date

from scripts.load.warehouse import sync_dim_teams, sync_fact_games
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_warehouse_pipeline"


def main() -> None:
    source_date = date.today()
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(source_date),
    )

    try:
        teams_loaded = sync_dim_teams()
        games_loaded = sync_fact_games()

        total_records = teams_loaded + games_loaded

        mark_refresh_success(
            run_id=run_id,
            records_loaded=total_records,
        )

        print(f"Synced {teams_loaded} dim teams.")
        print(f"Synced {games_loaded} fact games.")

    except Exception as error:
        mark_refresh_failed(
            run_id=run_id,
            error_message=str(error),
        )
        raise


if __name__ == "__main__":
    main()