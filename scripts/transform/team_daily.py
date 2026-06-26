FINAL_STATUSES = {"final", "game over"}


def is_completed_decision(game: dict) -> bool:
    status = (game.get("status") or "").strip().lower()

    return (
        game.get("home_score") is not None
        and game.get("away_score") is not None
        and status in FINAL_STATUSES
        and game["home_score"] != game["away_score"]
    )


def build_team_daily_rows(fact_games: list[dict], team_lookup: dict[int, dict]) -> list[dict]:
    rows = []

    for game in fact_games:
        if not is_completed_decision(game):
            continue

        home_team = team_lookup.get(game["home_team_key"])
        away_team = team_lookup.get(game["away_team_key"])

        if not home_team or not away_team:
            continue

        home_score = game["home_score"]
        away_score = game["away_score"]

        rows.append({
            "game_date": game["game_date"],
            "team_key": game["home_team_key"],
            "team_abbreviation": home_team["abbreviation"],
            "opponent_team_key": game["away_team_key"],
            "opponent_abbreviation": away_team["abbreviation"],
            "is_home": True,
            "games_played": 1,
            "wins": 1 if home_score > away_score else 0,
            "losses": 1 if home_score < away_score else 0,
            "runs_scored": home_score,
            "runs_allowed": away_score,
            "run_differential": home_score - away_score,
            "mlb_game_pk": game["mlb_game_pk"],
        })

        rows.append({
            "game_date": game["game_date"],
            "team_key": game["away_team_key"],
            "team_abbreviation": away_team["abbreviation"],
            "opponent_team_key": game["home_team_key"],
            "opponent_abbreviation": home_team["abbreviation"],
            "is_home": False,
            "games_played": 1,
            "wins": 1 if away_score > home_score else 0,
            "losses": 1 if away_score < home_score else 0,
            "runs_scored": away_score,
            "runs_allowed": home_score,
            "run_differential": away_score - home_score,
            "mlb_game_pk": game["mlb_game_pk"],
        })

    return rows
