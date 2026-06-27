from datetime import date, timedelta

from scripts.config.settings import STATCAST_LOOKBACK_DAYS
from scripts.extract.statcast import fetch_statcast
from scripts.load.team_weekly_statcast import load_team_weekly_statcast
from scripts.transform.team_weekly_statcast import build_team_weekly_statcast_rows
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_team_weekly_statcast_pipeline"


def main(lookback_days: int | None = None) -> None:
    days = STATCAST_LOOKBACK_DAYS if lookback_days is None else lookback_days

    if days < 1:
        raise ValueError("Statcast lookback must be at least one day.")

    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(end_date),
    )

    try:
        statcast_data = fetch_statcast(
            start_date=str(start_date),
            end_date=str(end_date),
        )
        offense_rows, pitching_rows = build_team_weekly_statcast_rows(
            statcast_data
        )
        offense_loaded, pitching_loaded = load_team_weekly_statcast(
            offense_rows,
            pitching_rows,
        )
        records_loaded = offense_loaded + pitching_loaded

        mark_refresh_success(
            run_id=run_id,
            records_loaded=records_loaded,
        )

        print(
            "Team weekly Statcast refresh complete: "
            f"{offense_loaded} offense rows, "
            f"{pitching_loaded} pitching rows."
        )

    except Exception as error:
        mark_refresh_failed(
            run_id=run_id,
            error_message=str(error),
        )
        print(f"Team weekly Statcast refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
