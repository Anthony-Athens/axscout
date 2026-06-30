from datetime import date

from scripts.config.settings import PITCHING_SUMMARY_SEASON, SEASON_START_DATE
from scripts.extract.mlb_pitching_stats import fetch_mlb_pitching_stats
from scripts.load.pitching_summary import (
    fetch_pitching_summary_targets,
    load_pitching_summary,
    weekly_periods,
)
from scripts.transform.pitching_summary import (
    build_player_pitching_updates,
    build_team_pitching_updates,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "build_pitching_summary_pipeline"


def _default_season() -> int:
    if PITCHING_SUMMARY_SEASON is not None:
        return PITCHING_SUMMARY_SEASON
    if SEASON_START_DATE:
        return date.fromisoformat(SEASON_START_DATE).year
    return date.today().year


def main(season: int | None = None) -> None:
    target_season = _default_season() if season is None else season
    source_date = date.today().isoformat()
    print(f"Starting official MLB pitching summary refresh for {target_season}.")
    run_id = start_refresh(PIPELINE_NAME, source_date)

    try:
        targets = fetch_pitching_summary_targets(target_season)
        periods = weekly_periods(targets)
        print(f"Weekly pitching periods to enrich: {len(periods)}.")

        season_source = fetch_mlb_pitching_stats(target_season)
        if not season_source:
            raise RuntimeError(
                f"MLB returned no season pitching rows for {target_season}."
            )

        weekly_sources: dict[tuple[str, str], list[dict]] = {}
        for start_date, end_date in periods:
            weekly_sources[(start_date, end_date)] = fetch_mlb_pitching_stats(
                target_season,
                start_date=start_date,
                end_date=end_date,
            )

        player_season_updates = [
            {"season": target_season, **row}
            for row in build_player_pitching_updates(season_source)
        ]
        team_season_updates = [
            {"season": target_season, **row}
            for row in build_team_pitching_updates(season_source)
        ]
        player_weekly_updates = []
        team_weekly_updates = []
        for (start_date, _end_date), source_rows in weekly_sources.items():
            player_weekly_updates.extend(
                {
                    "season": target_season,
                    "week_start_date": start_date,
                    **row,
                }
                for row in build_player_pitching_updates(source_rows)
            )
            team_weekly_updates.extend(
                {
                    "season": target_season,
                    "week_start_date": start_date,
                    **row,
                }
                for row in build_team_pitching_updates(source_rows)
            )

        counts = load_pitching_summary(
            targets,
            team_season_updates,
            player_season_updates,
            player_weekly_updates,
            team_weekly_updates,
        )
        records_loaded = sum(counts.values())
        mark_refresh_success(run_id, records_loaded)
        print(
            "Official MLB pitching summary refresh complete: "
            + ", ".join(f"{count} {name}" for name, count in counts.items())
            + "."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Official MLB pitching summary refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
