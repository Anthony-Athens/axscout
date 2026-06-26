from scripts.transform.team_rolling import build_team_rolling_14_rows
from scripts.utils.supabase_client import supabase


def replace_team_rolling_14_rows(rows: list[dict]) -> None:
    supabase.table("agg_team_rolling_14").delete().neq("team_key", -1).execute()

    if rows:
        supabase.table("agg_team_rolling_14").upsert(
            rows,
            on_conflict="season,team_key",
        ).execute()


def build_and_load_team_rolling_14() -> int:
    team_daily_rows = (
        supabase.table("agg_team_daily")
        .select(
            "mlb_game_pk, game_date, team_key, team_abbreviation, games_played, wins, losses, runs_scored, runs_allowed, run_differential"
        )
        .execute()
        .data
    )

    rows = build_team_rolling_14_rows(team_daily_rows)

    replace_team_rolling_14_rows(rows)

    return len(rows)
