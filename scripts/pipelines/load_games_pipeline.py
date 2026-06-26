from datetime import date, timedelta
from scripts.config.settings import GAMES_LOOKAHEAD_DAYS, GAMES_LOOKBACK_DAYS

from scripts.extract.mlb_schedule import fetch_mlb_schedule
from scripts.load.games import upsert_games
from scripts.transform.games import transform_games
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "load_games_pipeline"


def main() -> None:
    source_date = date.today()
    start_date = source_date - timedelta(days=GAMES_LOOKBACK_DAYS)
    end_date = source_date + timedelta(days=GAMES_LOOKAHEAD_DAYS)

    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(source_date),
    )

    try:
        payload = fetch_mlb_schedule(
            start_date=str(start_date),
            end_date=str(end_date),
        )

        games = transform_games(payload)

        records_loaded = upsert_games(games)

        mark_refresh_success(
            run_id=run_id,
            records_loaded=records_loaded,
        )

        print(f"Successfully loaded {records_loaded} games.")

    except Exception as error:
        mark_refresh_failed(
            run_id=run_id,
            error_message=str(error),
        )
        raise


if __name__ == "__main__":
    main()