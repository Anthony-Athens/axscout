import pandas as pd

from scripts.transform.player_weekly_statcast import (
    build_player_offense_rows,
    build_player_pitching_rows,
    prepare_player_statcast,
)


def build_player_season_statcast_rows(
    statcast_data: pd.DataFrame,
) -> tuple[list[dict], list[dict]]:
    data = prepare_player_statcast(statcast_data)
    if data.empty:
        print("No Statcast rows available for player season aggregation.")
        return [], []

    offense_rows = build_player_offense_rows(data, ["season"])
    pitching_rows = build_player_pitching_rows(data, ["season"])
    print(f"Built {len(offense_rows)} player offense season rows.")
    print(f"Built {len(pitching_rows)} player pitching season rows.")
    return offense_rows, pitching_rows
