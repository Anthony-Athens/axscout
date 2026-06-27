from scripts.pipelines.build_warehouse_pipeline import main as build_warehouse_pipeline
from scripts.pipelines.load_games_pipeline import main as load_games_pipeline
from scripts.pipelines.build_team_daily_pipeline import main as build_team_daily_pipeline
from scripts.pipelines.build_team_season_pipeline import main as build_team_season_pipeline
from scripts.pipelines.build_team_rolling_14_pipeline import (
    main as build_team_rolling_14_pipeline,
)
from scripts.config.settings import ENABLE_TEAM_WEEKLY_STATCAST



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

    print("AX Scout daily data refresh complete")


if __name__ == "__main__":
    main()
