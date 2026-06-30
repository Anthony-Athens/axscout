from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches, select_all


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
    games = select_all(
        "games",
        (
            "mlb_game_pk, game_date, home_team, away_team, home_score, "
            "away_score, status, home_probable_pitcher_mlb_id, "
            "home_probable_pitcher_name, away_probable_pitcher_mlb_id, "
            "away_probable_pitcher_name"
        ),
        order_by=("mlb_game_pk",),
    )

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_lookup = {
        team["abbreviation"]: team["team_key"]
     for team in teams
    }

    # MLB Stats API sometimes uses different abbreviations
    TEAM_ABBREVIATION_ALIASES = {
        "AZ": "ARI",
    }

    for source_abbr, canonical_abbr in TEAM_ABBREVIATION_ALIASES.items():
        if canonical_abbr in team_lookup:
            team_lookup[source_abbr] = team_lookup[canonical_abbr]

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
            "home_probable_pitcher_mlb_id": game[
                "home_probable_pitcher_mlb_id"
            ],
            "home_probable_pitcher_name": game[
                "home_probable_pitcher_name"
            ],
            "away_probable_pitcher_mlb_id": game[
                "away_probable_pitcher_mlb_id"
            ],
            "away_probable_pitcher_name": game[
                "away_probable_pitcher_name"
            ],
        })

    if not fact_games:
        return 0

    for game_batch in batches(fact_games):
        supabase.table("fact_games").upsert(
            game_batch,
            on_conflict="mlb_game_pk",
        ).execute()

    return len(fact_games)
