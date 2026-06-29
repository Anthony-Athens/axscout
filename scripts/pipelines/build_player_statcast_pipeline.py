from scripts.config.settings import PLAYER_STATCAST_LOOKBACK_DAYS
from scripts.extract.statcast import fetch_statcast
from scripts.load.player_statcast import load_player_statcast
from scripts.transform.player_season_statcast import (
    build_player_season_statcast_rows,
)
from scripts.transform.player_weekly_statcast import (
    build_player_weekly_statcast_rows,
)
from scripts.utils.date_windows import resolve_statcast_window
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_player_statcast_pipeline"


def main(lookback_days: int | None = None) -> None:
    days = (
        PLAYER_STATCAST_LOOKBACK_DAYS
        if lookback_days is None
        else lookback_days
    )
    window = resolve_statcast_window(days)
    print(
        "Player Statcast refresh window: "
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
        print(f"Player Statcast rows extracted: {len(statcast_data)}.")
        offense_weekly, pitching_weekly = build_player_weekly_statcast_rows(
            statcast_data
        )
        if window.covers_season_to_date:
            offense_season, pitching_season = (
                build_player_season_statcast_rows(statcast_data)
            )
        else:
            offense_season, pitching_season = [], []
            print(
                "Skipping player season aggregates: this refresh does not "
                "cover SEASON_START_DATE. Existing season rows are preserved."
            )
        counts = load_player_statcast(
            offense_weekly,
            pitching_weekly,
            offense_season,
            pitching_season,
        )
        records_loaded = sum(counts.values())
        print(f"Player Statcast rows loaded: {records_loaded}.")
        mark_refresh_success(run_id, records_loaded)

        print(
            "Player Statcast refresh complete: "
            + ", ".join(
                f"{count} {name} rows" for name, count in counts.items()
            )
            + "."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Player Statcast refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
