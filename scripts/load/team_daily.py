from scripts.transform.team_daily import build_team_daily_rows
from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches, select_all


def replace_table(table_name: str, rows: list[dict], conflict_key: str) -> None:
    supabase.table(table_name).delete().neq("team_key", -1).execute()

    for row_batch in batches(rows):
        supabase.table(table_name).upsert(
            row_batch,
            on_conflict=conflict_key,
        ).execute()


def build_and_load_team_daily() -> int:
    fact_games = select_all(
        "fact_games",
        (
            "mlb_game_pk, game_date, home_team_key, away_team_key, "
            "home_score, away_score, status"
        ),
        order_by=("mlb_game_pk",),
    )

    teams = supabase.table("dim_teams").select(
        "team_key, abbreviation"
    ).execute().data

    team_lookup = {
        team["team_key"]: team
        for team in teams
    }

    rows = build_team_daily_rows(fact_games, team_lookup)
    print(
        f"Completed games included in agg_team_daily: {len(rows) // 2}."
    )

    replace_table(
        "agg_team_daily",
        rows,
        "mlb_game_pk,team_key",
    )

    return len(rows)
