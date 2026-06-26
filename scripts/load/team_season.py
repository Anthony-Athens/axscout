from datetime import date

from scripts.transform.team_season import build_team_season_rows
from scripts.utils.supabase_client import supabase


def build_and_load_team_season() -> int:
    current_season = date.today().year

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_daily_rows = supabase.table("agg_team_daily").select(
        "game_date, team_key, team_abbreviation, games_played, wins, losses, runs_scored, runs_allowed, run_differential"
    ).execute().data

    rows = build_team_season_rows(team_daily_rows)

    existing_keys = {
        (row["season"], row["team_key"])
        for row in rows
    }

    for team in teams:
        key = (current_season, team["team_key"])

        if key not in existing_keys:
            rows.append({
                "season": current_season,
                "team_key": team["team_key"],
                "team_abbreviation": team["abbreviation"],
                "games_played": 0,
                "wins": 0,
                "losses": 0,
                "winning_percentage": None,
                "runs_scored": 0,
                "runs_allowed": 0,
                "run_differential": 0,
            })

    if not rows:
        return 0

    supabase.table("agg_team_season").upsert(
        rows,
        on_conflict="season,team_key",
    ).execute()

    return len(rows)