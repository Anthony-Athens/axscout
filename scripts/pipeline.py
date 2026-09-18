import re
import traceback
from time import perf_counter

from scripts.pipelines.build_warehouse_pipeline import main as build_warehouse_pipeline
from scripts.pipelines.load_games_pipeline import main as load_games_pipeline
from scripts.pipelines.build_team_daily_pipeline import main as build_team_daily_pipeline
from scripts.pipelines.build_team_season_pipeline import main as build_team_season_pipeline
from scripts.pipelines.build_team_rolling_14_pipeline import (
    main as build_team_rolling_14_pipeline,
)
from scripts.config.settings import (
    ENABLE_ARCHETYPE_MATCHUPS,
    ENABLE_ODDS,
    ENABLE_PITCHER_ARCHETYPES,
    ENABLE_PREDICTION_TRACKING,
    ENABLE_PREDICTIONS,
    ENABLE_PITCHING_SUMMARY,
    ENABLE_PLAYER_INJURIES,
    ENABLE_PLAYER_ROLLING_7,
    ENABLE_PLAYER_STATCAST,
    ENABLE_TEAM_OFFENSE_SEASON,
    ENABLE_TEAM_ROLLING_7,
    ENABLE_TEAM_WEEKLY_STATCAST,
    SEASON_START_DATE,
    ODDS_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
)



def _safe_traceback(error: Exception) -> str:
    output = "".join(traceback.format_exception(error))
    for secret in (SUPABASE_SERVICE_ROLE_KEY, ODDS_API_KEY):
        if secret:
            output = output.replace(secret, "[REDACTED]")
    # URLs and HTTP exception messages can contain auth query parameters.
    output = re.sub(
        r"(?i)(api[_-]?key|apikey|authorization|service[_-]?role[_-]?key)"
        r"(\s*[:=]\s*)[^\s&,]+",
        r"\1\2[REDACTED]",
        output,
    )
    return output


def run_pipeline(name: str, pipeline_func, *, optional: bool = False):
    started = perf_counter()
    print(f"::group::Pipeline: {name}", flush=True)
    print(f"Starting pipeline: {name}", flush=True)

    try:
        result = pipeline_func()
        if result is False and optional:
            print(f"Optional pipeline reported failure: {name}", flush=True)
        else:
            print(f"Completed pipeline: {name}", flush=True)
        return result
    except Exception as error:
        print(f"Failed pipeline: {name}", flush=True)
        print(_safe_traceback(error), flush=True)
        # Avoid Python printing the unsanitized exception a second time.
        raise SystemExit(1) from None
    finally:
        print(f"Pipeline elapsed: {name}: {perf_counter() - started:.2f}s", flush=True)
        print("::endgroup::", flush=True)


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

    if ENABLE_TEAM_ROLLING_7:
        from scripts.pipelines.build_team_rolling_7_statcast_pipeline import (
            main as build_team_rolling_7_statcast_pipeline,
        )

        run_pipeline(
            "Build Team Rolling 7 Statcast Aggregates",
            build_team_rolling_7_statcast_pipeline,
        )
    else:
        print("Skipping Team Rolling 7 Statcast Aggregates (disabled).")

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

    if ENABLE_PITCHER_ARCHETYPES:
        print(
            "ENABLE_PITCHER_ARCHETYPES=true; running pitcher archetype pipeline"
        )
        from scripts.pipelines.build_pitcher_archetypes_pipeline import (
            main as build_pitcher_archetypes_pipeline,
        )

        run_pipeline("Build Pitcher Archetypes", build_pitcher_archetypes_pipeline)
    else:
        print(
            "ENABLE_PITCHER_ARCHETYPES not enabled; skipping pitcher "
            "archetype pipeline"
        )

    if ENABLE_ARCHETYPE_MATCHUPS:
        print(
            "ENABLE_ARCHETYPE_MATCHUPS=true; running archetype matchup pipeline"
        )
        from scripts.pipelines.build_archetype_matchups_pipeline import (
            main as build_archetype_matchups_pipeline,
        )

        run_pipeline("Build Archetype Matchups", build_archetype_matchups_pipeline)
    else:
        print(
            "ENABLE_ARCHETYPE_MATCHUPS not enabled; skipping archetype "
            "matchup pipeline"
        )

    if ENABLE_PITCHING_SUMMARY:
        print(
            "ENABLE_PITCHING_SUMMARY=true; running pitching summary pipeline"
        )
        from scripts.pipelines.build_pitching_summary_pipeline import (
            main as build_pitching_summary_pipeline,
        )

        run_pipeline(
            "Build Official Pitching Summaries",
            build_pitching_summary_pipeline,
        )
    else:
        print(
            "ENABLE_PITCHING_SUMMARY not enabled; skipping pitching summary "
            "pipeline"
        )

    if ENABLE_PLAYER_INJURIES:
        print(
            "ENABLE_PLAYER_INJURIES=true; running player injuries pipeline"
        )
        from scripts.pipelines.load_player_injuries_pipeline import (
            main as load_player_injuries_pipeline,
        )

        if not run_pipeline(
            "Load Player Injuries", load_player_injuries_pipeline, optional=True
        ):
            print(
                "Player Injuries refresh failed; continuing because the "
                "optional source must not block the daily pipeline."
            )
    else:
        print(
            "ENABLE_PLAYER_INJURIES not enabled; skipping player injuries "
            "pipeline"
        )

    if ENABLE_ODDS:
        print("ENABLE_ODDS=true; running odds pipeline")
        from scripts.pipelines.load_odds_pipeline import main as load_odds_pipeline

        run_pipeline("Load MLB Odds Snapshots", load_odds_pipeline)
    else:
        print("ENABLE_ODDS not enabled; skipping odds pipeline")

    if ENABLE_PREDICTIONS:
        print("ENABLE_PREDICTIONS=true; running predictions pipeline")
        from scripts.pipelines.build_predictions_pipeline import (
            main as build_predictions_pipeline,
        )

        run_pipeline("Build Rules-Based Predictions", build_predictions_pipeline)
    else:
        print("ENABLE_PREDICTIONS not enabled; skipping predictions pipeline")

    if ENABLE_PREDICTION_TRACKING:
        print(
            "ENABLE_PREDICTION_TRACKING=true; running prediction scoring "
            "pipeline"
        )
        from scripts.pipelines.score_predictions_pipeline import (
            main as score_predictions_pipeline,
        )

        run_pipeline("Score Completed Predictions", score_predictions_pipeline)
    else:
        print(
            "ENABLE_PREDICTION_TRACKING not enabled; skipping prediction "
            "scoring pipeline"
        )

    print("AX Scout daily data refresh complete")


if __name__ == "__main__":
    main()
