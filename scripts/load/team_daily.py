from scripts.transform.team_daily import build_team_daily_rows
from scripts.utils.supabase_client import supabase


def build_and_load_team_daily() -> int:
    fact_games = supabase.table("fact_games").select(
        "mlb_game_pk, game_date, home_team_key, away_team_key, home_score, away_score, status"
    ).execute().data

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_lookup = {
        team["team_key"]: team
        for team in teams
    }

    rows = build_team_daily_rows(fact_games, team_lookup)

    if not rows:
        return 0

    supabase.table("agg_team_daily").upsert(
        rows,
        on_conflict="mlb_game_pk,team_key",
    ).execute()

    return len(rows)