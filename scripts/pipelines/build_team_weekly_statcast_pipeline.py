from scripts.config.settings import STATCAST_LOOKBACK_DAYS
from scripts.extract.statcast import fetch_statcast
from scripts.load.team_weekly_statcast import (
    load_team_season_statcast,
    load_team_weekly_statcast,
)
from scripts.transform.team_weekly_statcast import (
    build_team_season_statcast_rows,
    build_team_weekly_statcast_rows,
)
from scripts.utils.date_windows import resolve_statcast_window
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_team_weekly_statcast_pipeline"


def main(lookback_days: int | None = None) -> None:
    days = STATCAST_LOOKBACK_DAYS if lookback_days is None else lookback_days
    window = resolve_statcast_window(days)
    print(
        "Team Statcast refresh window: "
        f"start={window.start_date}, end={window.end_date} "
        f"({window.source})."
    )
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(window.end_date),
    )

    try:
        statcast_data = fetch_statcast(
            start_date=str(window.start_date),
            end_date=str(window.end_date),
        )
        print(f"Team Statcast rows extracted: {len(statcast_data)}.")
        offense_rows, pitching_rows = build_team_weekly_statcast_rows(
            statcast_data
        )
        offense_loaded, pitching_loaded = load_team_weekly_statcast(
            offense_rows,
            pitching_rows,
        )
        season_offense_loaded = 0
        season_pitching_loaded = 0
        if window.covers_season_to_date:
            season_offense_rows, season_pitching_rows = (
                build_team_season_statcast_rows(statcast_data)
            )
            season_offense_loaded, season_pitching_loaded = (
                load_team_season_statcast(
                    season_offense_rows,
                    season_pitching_rows,
                )
            )
        else:
            print(
                "Skipping team season Statcast aggregates because the "
                "extraction window does not cover the season start."
            )

        records_loaded = (
            offense_loaded
            + pitching_loaded
            + season_offense_loaded
            + season_pitching_loaded
        )
        print(f"Team Statcast aggregate rows loaded: {records_loaded}.")

        mark_refresh_success(
            run_id=run_id,
            records_loaded=records_loaded,
        )

        print(
            "Team weekly Statcast refresh complete: "
            f"{offense_loaded} offense rows, "
            f"{pitching_loaded} pitching rows, "
            f"{season_offense_loaded} season offense rows, "
            f"{season_pitching_loaded} season pitching rows."
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
