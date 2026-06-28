from datetime import date, timedelta

import pandas as pd

from scripts.config.settings import PLAYER_STATCAST_LOOKBACK_DAYS
from scripts.extract.statcast import fetch_statcast
from scripts.load.player_statcast import load_player_statcast
from scripts.transform.player_season_statcast import (
    build_player_season_statcast_rows,
)
from scripts.transform.player_weekly_statcast import (
    build_player_weekly_statcast_rows,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_player_statcast_pipeline"


def _weekly_window(data: pd.DataFrame, start_date: date) -> pd.DataFrame:
    if data.empty:
        return data

    game_dates = pd.to_datetime(data["game_date"], errors="coerce")
    return data[game_dates.dt.date >= start_date].copy()


def main(lookback_days: int | None = None) -> None:
    days = (
        PLAYER_STATCAST_LOOKBACK_DAYS
        if lookback_days is None
        else lookback_days
    )
    if days < 1:
        raise ValueError("Player Statcast lookback must be at least one day.")

    end_date = date.today()
    weekly_start_date = end_date - timedelta(days=days - 1)
    season_start_date = date(end_date.year, 1, 1)
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(end_date),
    )

    try:
        # Season rows must be built from the full year-to-date source window.
        # The configured lookback limits only the weekly rows refreshed.
        statcast_data = fetch_statcast(
            start_date=str(season_start_date),
            end_date=str(end_date),
        )
        weekly_data = _weekly_window(statcast_data, weekly_start_date)
        offense_weekly, pitching_weekly = build_player_weekly_statcast_rows(
            weekly_data
        )
        offense_season, pitching_season = build_player_season_statcast_rows(
            statcast_data
        )
        counts = load_player_statcast(
            offense_weekly,
            pitching_weekly,
            offense_season,
            pitching_season,
        )
        records_loaded = sum(counts.values())
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
