def _probable_pitcher(team: dict) -> tuple[int | None, str | None]:
    pitcher = team.get("probablePitcher") or {}
    player_id = pitcher.get("id")
    full_name = str(pitcher.get("fullName") or "").strip() or None
    return (int(player_id) if player_id is not None else None, full_name)


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
            home_pitcher_id, home_pitcher_name = _probable_pitcher(home)
            away_pitcher_id, away_pitcher_name = _probable_pitcher(away)

            games_by_pk[game_pk] = {
                "mlb_game_pk": game_pk,
                "game_date": game_date,
                "home_team": home["team"].get("abbreviation"),
                "away_team": away["team"].get("abbreviation"),
                "home_score": home.get("score"),
                "away_score": away.get("score"),
                "status": game.get("status", {}).get("detailedState"),
                "home_probable_pitcher_mlb_id": home_pitcher_id,
                "home_probable_pitcher_name": home_pitcher_name,
                "away_probable_pitcher_mlb_id": away_pitcher_id,
                "away_probable_pitcher_name": away_pitcher_name,
            }

    return list(games_by_pk.values())
