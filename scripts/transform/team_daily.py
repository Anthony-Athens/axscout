def build_team_daily_rows(fact_games: list[dict], team_lookup: dict[int, dict]) -> list[dict]:
    rows = []

    for game in fact_games:
        if game["home_score"] is None or game["away_score"] is None:
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
            "game_date": game["game_date"],
            "team_key": game["home_team_key"],
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
            "game_date": game["game_date"],
            "team_key": game["away_team_key"],
        })

    return rows