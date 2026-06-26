def transform_games(schedule_payload: dict) -> list[dict]:
    games_by_pk = {}

    for day in schedule_payload.get("dates", []):
        game_date = day.get("date")

        for game in day.get("games", []):
            game_pk = game.get("gamePk")

            if not game_pk:
                continue

            home = game["teams"]["home"]
            away = game["teams"]["away"]

            games_by_pk[game_pk] = {
                "mlb_game_pk": game_pk,
                "game_date": game_date,
                "home_team": home["team"].get("abbreviation"),
                "away_team": away["team"].get("abbreviation"),
                "home_score": home.get("score"),
                "away_score": away.get("score"),
                "status": game.get("status", {}).get("detailedState"),
            }

    return list(games_by_pk.values())