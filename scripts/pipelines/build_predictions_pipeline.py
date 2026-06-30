from datetime import date

from scripts.load.game_predictions import load_game_predictions
from scripts.models.rules_based_predictions import build_predictions
from scripts.transform.prediction_features import build_prediction_features
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)
from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import select_all

PIPELINE_NAME = "build_predictions"


def _upcoming_games(today: str) -> list[dict]:
    rows = (
        supabase.table("fact_games")
        .select(
            "mlb_game_pk,game_date,status,home_team_key,away_team_key,"
            "home_probable_pitcher_mlb_id,away_probable_pitcher_mlb_id"
        )
        .gte("game_date", today)
        .order("game_date")
        .order("mlb_game_pk")
        .limit(200)
        .execute()
        .data
        or []
    )
    return [
        row
        for row in rows
        if (row.get("status") or "").strip().lower()
        not in {"final", "game over"}
    ]


def _active_injuries() -> list[dict]:
    return (
        supabase.table("player_injuries")
        .select("team_abbreviation,is_active")
        .eq("is_active", True)
        .execute()
        .data
        or []
    )


def _moneylines(game_ids: list[int], today: str) -> list[dict]:
    if not game_ids:
        return []
    game_id_set = set(game_ids)
    rows = []
    offset = 0
    page_size = 1000
    while True:
        page = (
            supabase.table("odds_snapshots")
            .select(
                "mlb_game_pk,market_key,odds_format,sportsbook,home_price,"
                "away_price,market_last_update,snapshot_at"
            )
            .gte("commence_time", today)
            .eq("market_key", "h2h")
            .eq("odds_format", "american")
            .order("snapshot_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
            .data
            or []
        )
        rows.extend(
            row
            for row in page
            if row.get("mlb_game_pk") in game_id_set
        )
        if len(page) < page_size:
            break
        offset += page_size
    return rows


def main() -> None:
    source_date = date.today().isoformat()
    print(f"Starting rules-based prediction refresh for {source_date}.")
    run_id = start_refresh(PIPELINE_NAME, source_date)

    try:
        fact_games = _upcoming_games(source_date)
        game_ids = [int(row["mlb_game_pk"]) for row in fact_games]
        features = build_prediction_features(
            fact_games=fact_games,
            dim_teams=select_all(
                "dim_teams",
                "team_key,abbreviation",
                order_by=("team_key",),
            ),
            team_season=select_all(
                "agg_team_season",
                "season,team_abbreviation,games_played,winning_percentage,"
                "run_differential",
                order_by=("season", "team_abbreviation"),
            ),
            team_offense_season=select_all(
                "agg_team_offense_season",
                "season,team_abbreviation,ops",
                order_by=("season", "team_abbreviation"),
            ),
            team_pitching_season=select_all(
                "agg_team_pitching_season",
                "season,team_abbreviation,era",
                order_by=("season", "team_abbreviation"),
            ),
            team_rolling_14=select_all(
                "agg_team_rolling_14",
                "season,team_abbreviation,winning_percentage,"
                "run_differential_per_game",
                order_by=("season", "team_abbreviation"),
            ),
            team_offense_rolling_7=select_all(
                "agg_team_offense_rolling_7",
                "season,window_end_date,team_abbreviation,ops",
                order_by=("window_end_date", "team_abbreviation"),
            ),
            team_pitching_rolling_7=select_all(
                "agg_team_pitching_rolling_7",
                "season,window_end_date,team_abbreviation,era",
                order_by=("window_end_date", "team_abbreviation"),
            ),
            player_pitching_season=select_all(
                "agg_player_pitching_season",
                "season,mlb_player_id,era,whip,strikeouts",
                order_by=("season", "mlb_player_id"),
            ),
            active_injuries=_active_injuries(),
            odds_snapshots=_moneylines(game_ids, source_date),
        )
        predictions = build_predictions(features.features)
        loaded = load_game_predictions(predictions)
        print(f"Games considered: {features.games_considered}.")
        print(f"Predictions created: {len(predictions)}.")
        print(f"Games skipped: {features.games_skipped}.")
        print(f"Games missing odds: {features.missing_odds_count}.")
        print(f"Games missing at least one starter: {features.missing_starter_count}.")
        mark_refresh_success(run_id, loaded)
        print(f"Rules-based prediction refresh complete: {loaded} rows loaded.")
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Rules-based prediction refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
