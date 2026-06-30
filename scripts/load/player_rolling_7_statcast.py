from scripts.load.player_statcast import load_player_statcast_aggregate_groups

ROLLING_7_CONFLICT_KEY = (
    "season,window_end_date,team_abbreviation,mlb_player_id"
)


def load_player_rolling_7_statcast(
    offense_rows: list[dict],
    pitching_rows: list[dict],
) -> dict[str, int]:
    return load_player_statcast_aggregate_groups(
        [
            (
                "agg_player_offense_rolling_7",
                ROLLING_7_CONFLICT_KEY,
                "offense_rolling_7",
                offense_rows,
            ),
            (
                "agg_player_pitching_rolling_7",
                ROLLING_7_CONFLICT_KEY,
                "pitching_rolling_7",
                pitching_rows,
            ),
        ]
    )
