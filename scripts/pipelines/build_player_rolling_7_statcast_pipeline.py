from dataclasses import dataclass
from datetime import date, timedelta

from scripts.config.settings import ROLLING_7_END_DATE, ROLLING_7_START_DATE
from scripts.extract.mlb_pitching_stats import fetch_mlb_pitching_stats
from scripts.extract.statcast import fetch_statcast
from scripts.load.player_rolling_7_statcast import (
    load_player_rolling_7_statcast,
)
from scripts.transform.player_rolling_7_statcast import (
    build_player_rolling_7_statcast_rows,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_player_rolling_7_statcast"


@dataclass(frozen=True)
class Rolling7Window:
    start_date: date
    end_date: date


def _parse_date(value: str, variable_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(
            f"{variable_name} must use YYYY-MM-DD format; received {value!r}."
        ) from error


def resolve_rolling_7_window(today: date | None = None) -> Rolling7Window:
    end_date = (
        _parse_date(ROLLING_7_END_DATE, "ROLLING_7_END_DATE")
        if ROLLING_7_END_DATE
        else today or date.today()
    )
    start_date = (
        _parse_date(ROLLING_7_START_DATE, "ROLLING_7_START_DATE")
        if ROLLING_7_START_DATE
        else end_date - timedelta(days=6)
    )
    if end_date - start_date != timedelta(days=6):
        raise ValueError(
            "The rolling 7 window must contain exactly seven calendar days "
            "inclusive."
        )
    return Rolling7Window(start_date=start_date, end_date=end_date)


def main() -> None:
    window = resolve_rolling_7_window()
    print(
        "Player rolling 7 Statcast window: "
        f"start={window.start_date}, end={window.end_date}."
    )
    run_id = start_refresh(PIPELINE_NAME, str(window.end_date))

    try:
        statcast_data = fetch_statcast(
            start_date=str(window.start_date),
            end_date=str(window.end_date),
        )
        print(f"Player rolling 7 source rows: {len(statcast_data)}.")

        official_pitching_rows: list[dict] = []
        try:
            official_pitching_rows = fetch_mlb_pitching_stats(
                window.end_date.year,
                start_date=str(window.start_date),
                end_date=str(window.end_date),
            )
        except Exception as error:
            print(
                "Official rolling pitching enrichment was unavailable; "
                f"ERA and WHIP will remain null: {error}"
            )

        offense_rows, pitching_rows = build_player_rolling_7_statcast_rows(
            statcast_data,
            window.start_date,
            window.end_date,
            official_pitching_rows,
        )
        print(f"Player rolling 7 offense rows transformed: {len(offense_rows)}.")
        print(f"Player rolling 7 pitching rows transformed: {len(pitching_rows)}.")
        counts = load_player_rolling_7_statcast(offense_rows, pitching_rows)
        aggregate_rows_loaded = (
            counts.get("offense_rolling_7", 0)
            + counts.get("pitching_rolling_7", 0)
        )
        print(f"Player rolling 7 aggregate rows loaded: {aggregate_rows_loaded}.")
        mark_refresh_success(run_id, aggregate_rows_loaded)
        print(
            "Player rolling 7 Statcast refresh complete: "
            + ", ".join(
                f"{count} {name} rows" for name, count in counts.items()
            )
            + "."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Player rolling 7 Statcast refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
