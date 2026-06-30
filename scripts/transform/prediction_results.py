from collections import defaultdict
from dataclasses import dataclass

from scripts.transform.team_daily import is_completed_decision


@dataclass(frozen=True)
class PredictionResultBuild:
    rows: list[dict]
    completed_games_considered: int
    predictions_found: int
    games_skipped_missing_predictions: int
    games_skipped_incomplete: int
    games_skipped_missing_teams: int


def build_prediction_result_rows(
    fact_games: list[dict],
    predictions: list[dict],
    dim_teams: list[dict],
) -> PredictionResultBuild:
    teams_by_key = {
        int(team["team_key"]): team["abbreviation"]
        for team in dim_teams
        if team.get("team_key") is not None and team.get("abbreviation")
    }
    predictions_by_game: dict[int, list[dict]] = defaultdict(list)
    for prediction in predictions:
        game_pk = prediction.get("mlb_game_pk")
        if game_pk is not None:
            predictions_by_game[int(game_pk)].append(prediction)

    rows = []
    completed_games = 0
    predictions_found = 0
    missing_predictions = 0
    incomplete_games = 0
    missing_teams = 0

    for game in fact_games:
        if not is_completed_decision(game):
            incomplete_games += 1
            continue

        completed_games += 1
        home_team = teams_by_key.get(game.get("home_team_key"))
        away_team = teams_by_key.get(game.get("away_team_key"))
        if not home_team or not away_team:
            missing_teams += 1
            continue

        game_predictions = [
            prediction
            for prediction in predictions_by_game.get(
                int(game["mlb_game_pk"]),
                [],
            )
            if prediction.get("predicted_winner")
            and prediction.get("model_name")
            and prediction.get("model_version")
        ]
        if not game_predictions:
            missing_predictions += 1
            continue

        home_won = game["home_score"] > game["away_score"]
        actual_winner = home_team if home_won else away_team
        actual_loser = away_team if home_won else home_team

        for prediction in game_predictions:
            predictions_found += 1
            rows.append(
                {
                    "mlb_game_pk": int(game["mlb_game_pk"]),
                    "game_date": game["game_date"],
                    "home_team": prediction.get("home_team") or home_team,
                    "away_team": prediction.get("away_team") or away_team,
                    "home_score": int(game["home_score"]),
                    "away_score": int(game["away_score"]),
                    "actual_winner": actual_winner,
                    "actual_loser": actual_loser,
                    "predicted_winner": prediction["predicted_winner"],
                    "predicted_loser": prediction.get("predicted_loser"),
                    "prediction_correct": (
                        prediction["predicted_winner"] == actual_winner
                    ),
                    "home_win_probability": prediction.get(
                        "home_win_probability"
                    ),
                    "away_win_probability": prediction.get(
                        "away_win_probability"
                    ),
                    "confidence": prediction.get("confidence"),
                    "confidence_score": prediction.get("confidence_score"),
                    "axscout_lean": prediction.get("axscout_lean"),
                    "market_favorite": prediction.get("market_favorite"),
                    "market_home_moneyline": prediction.get(
                        "market_home_moneyline"
                    ),
                    "market_away_moneyline": prediction.get(
                        "market_away_moneyline"
                    ),
                    "implied_home_probability": prediction.get(
                        "implied_home_probability"
                    ),
                    "implied_away_probability": prediction.get(
                        "implied_away_probability"
                    ),
                    "edge_summary": prediction.get("edge_summary"),
                    "model_name": prediction["model_name"],
                    "model_version": prediction["model_version"],
                    "prediction_created_at": prediction.get("created_at"),
                }
            )

    return PredictionResultBuild(
        rows=rows,
        completed_games_considered=completed_games,
        predictions_found=predictions_found,
        games_skipped_missing_predictions=missing_predictions,
        games_skipped_incomplete=incomplete_games,
        games_skipped_missing_teams=missing_teams,
    )
