from datetime import date

from scripts.transform.team_season import build_team_season_rows
from scripts.utils.supabase_client import supabase


def replace_team_season_rows(rows: list[dict]) -> None:
    supabase.table("agg_team_season").delete().neq("team_key", -1).execute()

    if rows:
        supabase.table("agg_team_season").upsert(
            rows,
            on_conflict="season,team_key",
        ).execute()


def warn_on_invalid_decisions(rows: list[dict]) -> None:
    for row in rows:
        if row["games_played"] == row["wins"] + row["losses"]:
            continue

        print(
            "WARNING: Team season decision mismatch: "
            f"{row['team_abbreviation']} games_played={row['games_played']} "
            f"wins={row['wins']} losses={row['losses']}"
        )


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

    warn_on_invalid_decisions(rows)
    replace_team_season_rows(rows)

    return len(rows)
