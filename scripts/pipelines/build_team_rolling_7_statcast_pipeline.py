from dataclasses import dataclass
from datetime import date, timedelta

from scripts.config.settings import (
    TEAM_ROLLING_7_END_DATE,
    TEAM_ROLLING_7_START_DATE,
)
from scripts.extract.mlb_pitching_stats import fetch_mlb_pitching_stats
from scripts.extract.statcast import fetch_statcast
from scripts.load.team_rolling_7_statcast import load_team_rolling_7_statcast
from scripts.transform.team_rolling_7_statcast import (
    build_team_rolling_7_statcast_rows,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_team_rolling_7_statcast"


@dataclass(frozen=True)
class TeamRolling7Window:
    start_date: date
    end_date: date


def _parse_date(value: str, variable_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(
            f"{variable_name} must use YYYY-MM-DD format; received {value!r}."
        ) from error


def resolve_team_rolling_7_window(
    today: date | None = None,
) -> TeamRolling7Window:
    end_date = (
        _parse_date(TEAM_ROLLING_7_END_DATE, "TEAM_ROLLING_7_END_DATE")
        if TEAM_ROLLING_7_END_DATE
        else today or date.today()
    )
    start_date = (
        _parse_date(TEAM_ROLLING_7_START_DATE, "TEAM_ROLLING_7_START_DATE")
        if TEAM_ROLLING_7_START_DATE
        else end_date - timedelta(days=6)
    )
    if end_date - start_date != timedelta(days=6):
        raise ValueError(
            "The team rolling 7 window must contain exactly seven calendar "
            "days inclusive."
        )
    return TeamRolling7Window(start_date=start_date, end_date=end_date)


def main() -> None:
    window = resolve_team_rolling_7_window()
    print(
        "Team rolling 7 Statcast window: "
        f"start={window.start_date}, end={window.end_date}."
    )
    run_id = start_refresh(PIPELINE_NAME, str(window.end_date))

    try:
        statcast_data = fetch_statcast(
            start_date=str(window.start_date),
            end_date=str(window.end_date),
        )
        print(f"Team rolling 7 source rows: {len(statcast_data)}.")

        official_pitching_rows: list[dict] = []
        try:
            official_pitching_rows = fetch_mlb_pitching_stats(
                window.end_date.year,
                start_date=str(window.start_date),
                end_date=str(window.end_date),
            )
        except Exception as error:
            print(
                "Official team rolling pitching enrichment was unavailable; "
                f"ERA and WHIP will remain null: {error}"
            )

        offense_rows, pitching_rows = build_team_rolling_7_statcast_rows(
            statcast_data,
            window.start_date,
            window.end_date,
            official_pitching_rows,
        )
        print(f"Team rolling 7 offense rows transformed: {len(offense_rows)}.")
        print(f"Team rolling 7 pitching rows transformed: {len(pitching_rows)}.")
        offense_loaded, pitching_loaded = load_team_rolling_7_statcast(
            offense_rows,
            pitching_rows,
        )
        records_loaded = offense_loaded + pitching_loaded
        print(f"Team rolling 7 offense rows loaded: {offense_loaded}.")
        print(f"Team rolling 7 pitching rows loaded: {pitching_loaded}.")
        mark_refresh_success(run_id, records_loaded)
        print(
            "Team rolling 7 Statcast refresh complete: "
            f"{offense_loaded} offense rows, "
            f"{pitching_loaded} pitching rows."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Team rolling 7 Statcast refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
