from datetime import date

from scripts.load.prediction_results import load_prediction_results
from scripts.transform.prediction_results import build_prediction_result_rows
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)
from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import PAGE_SIZE, select_all

PIPELINE_NAME = "score_predictions"


def _games_through(today: str) -> list[dict]:
    rows = []
    offset = 0
    while True:
        page = (
            supabase.table("fact_games")
            .select(
                "mlb_game_pk,game_date,status,home_team_key,away_team_key,"
                "home_score,away_score"
            )
            .lte("game_date", today)
            .order("game_date")
            .order("mlb_game_pk")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def main() -> None:
    source_date = date.today().isoformat()
    print(f"Starting prediction scoring refresh for {source_date}.")
    run_id = start_refresh(PIPELINE_NAME, source_date)

    try:
        result = build_prediction_result_rows(
            fact_games=_games_through(source_date),
            predictions=select_all(
                "game_predictions",
                "mlb_game_pk,home_team,away_team,predicted_winner,"
                "predicted_loser,home_win_probability,away_win_probability,"
                "confidence,confidence_score,axscout_lean,market_favorite,"
                "market_home_moneyline,market_away_moneyline,"
                "implied_home_probability,implied_away_probability,"
                "edge_summary,model_name,model_version,created_at",
                order_by=("mlb_game_pk", "model_name", "model_version"),
            ),
            dim_teams=select_all(
                "dim_teams",
                "team_key,abbreviation",
                order_by=("team_key",),
            ),
        )
        loaded = load_prediction_results(result.rows)
        print(
            "Completed games considered: "
            f"{result.completed_games_considered}."
        )
        print(f"Predictions found: {result.predictions_found}.")
        print(f"Results scored: {loaded}.")
        print(
            "Games skipped due to missing predictions: "
            f"{result.games_skipped_missing_predictions}."
        )
        print(
            "Games skipped due to incomplete status: "
            f"{result.games_skipped_incomplete}."
        )
        if result.games_skipped_missing_teams:
            print(
                "WARNING: Completed games skipped due to missing team "
                f"dimensions: {result.games_skipped_missing_teams}."
            )
        mark_refresh_success(run_id, loaded)
        print("Prediction scoring refresh complete.")
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Prediction scoring refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
