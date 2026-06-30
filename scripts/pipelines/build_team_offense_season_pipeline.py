from scripts.config.settings import STATCAST_LOOKBACK_DAYS
from scripts.extract.statcast import fetch_statcast
from scripts.load.team_weekly_statcast import load_team_offense_season
from scripts.transform.team_weekly_statcast import (
    build_team_offense_season_statcast_rows,
)
from scripts.utils.date_windows import resolve_statcast_window
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_team_offense_season_pipeline"
EXPECTED_MLB_TEAMS = 30


def main(lookback_days: int | None = None) -> None:
    days = STATCAST_LOOKBACK_DAYS if lookback_days is None else lookback_days
    window = resolve_statcast_window(days)
    print(
        "Team offense season refresh window: "
        f"start={window.start_date}, end={window.end_date} "
        f"({window.source})."
    )
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(window.end_date),
    )

    try:
        if not window.covers_season_to_date:
            raise RuntimeError(
                "Team offense season refresh requires SEASON_START_DATE and "
                "a Statcast window that begins on or before that date."
            )

        statcast_data = fetch_statcast(
            start_date=str(window.start_date),
            end_date=str(window.end_date),
        )
        print(f"Team offense season source rows: {len(statcast_data)}.")
        season_rows = build_team_offense_season_statcast_rows(statcast_data)
        print(f"Team offense season transformed rows: {len(season_rows)}.")

        team_count = len(
            {
                row["team_abbreviation"]
                for row in season_rows
                if row.get("team_abbreviation")
            }
        )
        if team_count != EXPECTED_MLB_TEAMS:
            raise RuntimeError(
                "Refusing to load an incomplete team offense season set: "
                f"expected {EXPECTED_MLB_TEAMS} teams, found {team_count}."
            )

        records_loaded = load_team_offense_season(season_rows)
        print(f"Team offense season loaded rows: {records_loaded}.")
        mark_refresh_success(run_id, records_loaded)
        print("Team offense season refresh complete.")
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Team offense season refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
