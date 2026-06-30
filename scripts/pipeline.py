from scripts.pipelines.build_warehouse_pipeline import main as build_warehouse_pipeline
from scripts.pipelines.load_games_pipeline import main as load_games_pipeline
from scripts.pipelines.build_team_daily_pipeline import main as build_team_daily_pipeline
from scripts.pipelines.build_team_season_pipeline import main as build_team_season_pipeline
from scripts.pipelines.build_team_rolling_14_pipeline import (
    main as build_team_rolling_14_pipeline,
)
from scripts.config.settings import (
    ENABLE_PITCHING_SUMMARY,
    ENABLE_PLAYER_INJURIES,
    ENABLE_PLAYER_ROLLING_7,
    ENABLE_PLAYER_STATCAST,
    ENABLE_TEAM_OFFENSE_SEASON,
    ENABLE_TEAM_WEEKLY_STATCAST,
    SEASON_START_DATE,
)



def run_pipeline(name: str, pipeline_func) -> None:
    print(f"Starting pipeline: {name}")

    try:
        pipeline_func()
        print(f"Completed pipeline: {name}")
    except Exception as error:
        print(f"Failed pipeline: {name}")
        print(error)
        raise


def main() -> None:
    print("Starting AX Scout daily data refresh")

    run_pipeline("Load Games", load_games_pipeline)
    run_pipeline("Build Warehouse", build_warehouse_pipeline)
    run_pipeline("Build Team Daily Aggregates", build_team_daily_pipeline)
    run_pipeline("Build Team Season Aggregates", build_team_season_pipeline)
    run_pipeline("Build Team Rolling 14 Aggregates", build_team_rolling_14_pipeline)

    # Enable after deploying the weekly tables. Keep disabled for faster local
    # game-result refreshes with ENABLE_TEAM_WEEKLY_STATCAST=false (the default).
    if ENABLE_TEAM_WEEKLY_STATCAST:
        from scripts.pipelines.build_team_weekly_statcast_pipeline import (
            main as build_team_weekly_statcast_pipeline,
        )

        run_pipeline(
            "Build Team Weekly Statcast Aggregates",
            build_team_weekly_statcast_pipeline,
        )
    else:
        print("Skipping Team Weekly Statcast Aggregates (disabled).")

    if ENABLE_TEAM_OFFENSE_SEASON:
        if ENABLE_TEAM_WEEKLY_STATCAST and SEASON_START_DATE:
            print(
                "Team Offense Season Aggregates were included in the "
                "full-season Team Weekly Statcast refresh."
            )
        else:
            from scripts.pipelines.build_team_offense_season_pipeline import (
                main as build_team_offense_season_pipeline,
            )

            run_pipeline(
                "Build Team Offense Season Aggregates",
                build_team_offense_season_pipeline,
            )
    elif not (ENABLE_TEAM_WEEKLY_STATCAST and SEASON_START_DATE):
        print("Skipping Team Offense Season Aggregates (disabled).")

    if ENABLE_PLAYER_STATCAST:
        from scripts.pipelines.build_player_statcast_pipeline import (
            main as build_player_statcast_pipeline,
        )

        run_pipeline(
            "Build Player Statcast Aggregates",
            build_player_statcast_pipeline,
        )
    else:
        print("Skipping Player Statcast Aggregates (disabled).")

    if ENABLE_PLAYER_ROLLING_7:
        from scripts.pipelines.build_player_rolling_7_statcast_pipeline import (
            main as build_player_rolling_7_statcast_pipeline,
        )

        run_pipeline(
            "Build Player Rolling 7 Statcast Aggregates",
            build_player_rolling_7_statcast_pipeline,
        )
    else:
        print("Skipping Player Rolling 7 Statcast Aggregates (disabled).")

    if ENABLE_PLAYER_INJURIES:
        from scripts.pipelines.load_player_injuries_pipeline import (
            main as load_player_injuries_pipeline,
        )

        print("Starting pipeline: Load Player Injuries")
        if load_player_injuries_pipeline():
            print("Completed pipeline: Load Player Injuries")
        else:
            print(
                "Player Injuries refresh failed; continuing because the "
                "optional source must not block the daily pipeline."
            )
    else:
        print("Skipping Player Injuries (disabled).")

    if ENABLE_PITCHING_SUMMARY:
        from scripts.pipelines.build_pitching_summary_pipeline import (
            main as build_pitching_summary_pipeline,
        )

        run_pipeline(
            "Build Official Pitching Summaries",
            build_pitching_summary_pipeline,
        )
    else:
        print("Skipping Official Pitching Summaries (disabled).")

    print("AX Scout daily data refresh complete")


if __name__ == "__main__":
    main()
