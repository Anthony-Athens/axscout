from datetime import date

from scripts.config.settings import ODDS_API_ODDS_FORMAT
from scripts.extract.odds_api import fetch_mlb_odds
from scripts.load.odds_snapshots import (
    fetch_odds_match_games,
    load_odds_snapshots,
)
from scripts.transform.odds import transform_odds_events
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "load_odds"


def main() -> None:
    source_date = date.today().isoformat()
    print(f"Starting MLB odds snapshot refresh for {source_date}.")
    run_id = start_refresh(PIPELINE_NAME, source_date)

    try:
        events = fetch_mlb_odds()
        print(f"Odds events extracted: {len(events)}.")
        games = fetch_odds_match_games()
        transformed = transform_odds_events(
            events,
            games,
            ODDS_API_ODDS_FORMAT,
        )
        print(f"Odds rows transformed: {len(transformed.rows)}.")
        loaded = load_odds_snapshots(transformed.rows)
        print(f"Odds rows loaded: {loaded}.")
        print(f"Odds events unmatched to MLB games: {transformed.unmatched_event_count}.")
        mark_refresh_success(run_id, loaded)
        print("MLB odds snapshot refresh complete.")
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"MLB odds snapshot refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
