from scripts.utils.supabase_client import supabase


def sync_dim_teams() -> int:
    teams = supabase.table("teams").select(
        "mlb_team_id, abbreviation, name, league, division"
    ).execute().data

    if not teams:
        return 0

    supabase.table("dim_teams").upsert(
        teams,
        on_conflict="mlb_team_id",
    ).execute()

    return len(teams)


def sync_fact_games() -> int:
    games = supabase.table("games").select(
        "mlb_game_pk, game_date, home_team, away_team, home_score, away_score, status"
    ).execute().data

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_lookup = {
        team["abbreviation"]: team["team_key"]
        for team in teams
    }

    fact_games = []

    for game in games:
        fact_games.append({
            "mlb_game_pk": game["mlb_game_pk"],
            "game_date": game["game_date"],
            "home_team_key": team_lookup.get(game["home_team"]),
            "away_team_key": team_lookup.get(game["away_team"]),
            "home_score": game["home_score"],
            "away_score": game["away_score"],
            "status": game["status"],
        })

    if not fact_games:
        return 0

    supabase.table("fact_games").upsert(
        fact_games,
        on_conflict="mlb_game_pk",
    ).execute()

    return len(fact_games)