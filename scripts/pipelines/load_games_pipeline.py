from datetime import date

from scripts.config.settings import GAMES_LOOKAHEAD_DAYS, GAMES_LOOKBACK_DAYS

from scripts.extract.mlb_schedule import fetch_mlb_schedule
from scripts.load.games import upsert_games, upsert_probable_pitchers
from scripts.transform.games import transform_games
from scripts.utils.date_windows import resolve_games_window
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "load_games_pipeline"


def main() -> None:
    source_date = date.today()
    window = resolve_games_window(
        GAMES_LOOKBACK_DAYS,
        GAMES_LOOKAHEAD_DAYS,
        today=source_date,
    )
    print(
        f"Games start date: {window.start_date} ({window.source})."
    )
    print(f"Games end date: {window.end_date}.")

    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(source_date),
    )

    try:
        payload = fetch_mlb_schedule(
            start_date=str(window.start_date),
            end_date=str(window.end_date),
        )

        games = transform_games(payload)
        print(f"Game rows extracted and transformed: {len(games)}.")

        games_loaded = upsert_games(games)
        probable_pitchers_loaded = upsert_probable_pitchers(games)
        records_loaded = games_loaded + probable_pitchers_loaded
        print(f"Games loaded: {games_loaded}.")
        print(f"Probable pitcher dimensions loaded: {probable_pitchers_loaded}.")

        mark_refresh_success(
            run_id=run_id,
            records_loaded=records_loaded,
        )

        print(
            f"Successfully loaded {games_loaded} games and "
            f"{probable_pitchers_loaded} probable pitcher dimensions."
        )

    except Exception as error:
        mark_refresh_failed(
            run_id=run_id,
            error_message=str(error),
        )
        raise


if __name__ == "__main__":
    main()
