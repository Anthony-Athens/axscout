from datetime import date, datetime

from scripts.config.settings import SEASON_START_DATE
from scripts.transform.team_season import build_team_season_rows
from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import select_all


def replace_team_season_rows(rows: list[dict]) -> None:
    supabase.table("agg_team_season").delete().neq("team_key", -1).execute()

    if rows:
        supabase.table("agg_team_season").upsert(
            rows,
            on_conflict="season,team_key",
        ).execute()


def validate_team_season_rows(
    rows: list[dict],
    *,
    full_season: int | None = None,
) -> None:
    mismatches = 0
    for row in rows:
        if row["games_played"] != row["wins"] + row["losses"]:
            mismatches += 1
            print(
                "WARNING: Team season decision mismatch: "
                f"{row['team_abbreviation']} "
                f"games_played={row['games_played']} "
                f"wins={row['wins']} losses={row['losses']}"
            )

        if (
            full_season is not None
            and row["season"] == full_season
            and row["games_played"] < 70
        ):
            print(
                "WARNING: Full-season team has fewer than 70 completed "
                f"games: {row['team_abbreviation']} "
                f"games_played={row['games_played']}"
            )

    if mismatches == 0:
        print(
            "Validated agg_team_season: games_played equals wins + losses "
            "for every team row."
        )


def build_and_load_team_season() -> int:
    full_season = (
        datetime.strptime(SEASON_START_DATE, "%Y-%m-%d").year
        if SEASON_START_DATE
        else None
    )
    target_season = full_season or date.today().year

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_daily_rows = select_all(
        "agg_team_daily",
        (
            "game_date, team_key, team_abbreviation, games_played, wins, "
            "losses, runs_scored, runs_allowed, run_differential"
        ),
        order_by=("id",),
    )

    rows = build_team_season_rows(team_daily_rows)

    existing_keys = {
        (row["season"], row["team_key"])
        for row in rows
    }

    for team in teams:
        key = (target_season, team["team_key"])

        if key not in existing_keys:
            rows.append({
                "season": target_season,
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

    validate_team_season_rows(rows, full_season=full_season)
    replace_team_season_rows(rows)

    return len(rows)
