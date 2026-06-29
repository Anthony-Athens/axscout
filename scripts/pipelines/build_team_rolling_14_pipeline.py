from datetime import date

from scripts.load.team_rolling import build_and_load_team_rolling_14
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_team_rolling_14_pipeline"


def main() -> None:
    source_date = date.today()

    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(source_date),
    )

    try:
        records_loaded = build_and_load_team_rolling_14()

        mark_refresh_success(
            run_id=run_id,
            records_loaded=records_loaded,
        )

        print(f"agg_team_rolling_14 rows loaded: {records_loaded}.")

    except Exception as error:
        mark_refresh_failed(
            run_id=run_id,
            error_message=str(error),
        )
        raise


if __name__ == "__main__":
    main()
