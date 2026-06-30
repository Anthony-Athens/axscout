from datetime import date

from scripts.config.settings import SEASON_START_DATE
from scripts.extract.mlb_injuries import fetch_mlb_injuries
from scripts.load.player_injuries import load_player_injuries
from scripts.transform.player_injuries import build_player_injury_rows
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)

PIPELINE_NAME = "load_player_injuries_pipeline"


def _season_start(today: date) -> date:
    if SEASON_START_DATE:
        return date.fromisoformat(SEASON_START_DATE)
    return date(today.year, 1, 1)


def main(*, raise_on_error: bool = False) -> bool:
    today = date.today()
    start_date = _season_start(today)
    season = start_date.year
    print(
        "Player injury refresh window: "
        f"start={start_date}, end={today}, season={season}."
    )
    run_id = None

    try:
        run_id = start_refresh(PIPELINE_NAME, str(today))
        extracted = fetch_mlb_injuries(
            season,
            start_date.isoformat(),
            today.isoformat(),
        )
        print(f"Player injury source rows: {len(extracted.rows)}.")
        rows = build_player_injury_rows(extracted.rows)
        print(f"Player injury transformed rows: {len(rows)}.")
        counts = load_player_injuries(
            rows,
            season,
            extracted.team_abbreviations,
        )
        records_loaded = (
            counts["active_injuries"] + counts["injuries_deactivated"]
        )
        print(f"Player injury loaded rows: {records_loaded}.")
        mark_refresh_success(run_id, records_loaded)
        print(
            "Player injury refresh complete: "
            + ", ".join(
                f"{count} {name} rows" for name, count in counts.items()
            )
            + "."
        )
        return True
    except Exception as error:
        if run_id is not None:
            try:
                mark_refresh_failed(run_id, str(error))
            except Exception as logging_error:
                print(
                    "Unable to record the player injury refresh failure: "
                    f"{logging_error}"
                )
        print(
            "Player injury refresh failed without stopping the master "
            f"pipeline: {error}"
        )
        if raise_on_error:
            raise
        return False


if __name__ == "__main__":
    main(raise_on_error=True)
