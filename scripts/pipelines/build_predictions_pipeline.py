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


def _archetype_context(fact_games: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    pitcher_ids = sorted({
        int(player_id)
        for game in fact_games
        for player_id in (
            game.get("home_probable_pitcher_mlb_id"),
            game.get("away_probable_pitcher_mlb_id"),
        )
        if player_id is not None
    })
    team_keys = {
        team_key
        for game in fact_games
        for team_key in (game.get("home_team_key"), game.get("away_team_key"))
        if team_key is not None
    }
    if not pitcher_ids or not team_keys:
        return [], [], []

    try:
        profiles = (
            supabase.table("pitcher_profiles")
            .select(
                "mlb_player_id,season,period_end,primary_archetype_id,"
                "model_version,refreshed_at"
            )
            .in_("mlb_player_id", pitcher_ids)
            .order("season", desc=True)
            .order("period_end", desc=True)
            .execute()
            .data
            or []
        )
        archetype_ids = sorted({
            str(row["primary_archetype_id"])
            for row in profiles
            if row.get("primary_archetype_id")
        })
        if not archetype_ids:
            return profiles, [], []

        teams = (
            supabase.table("dim_teams")
            .select("team_key,abbreviation")
            .in_("team_key", list(team_keys))
            .execute()
            .data
            or []
        )
        abbreviations = sorted({
            str(row["abbreviation"])
            for row in teams
            if row.get("abbreviation")
        })
        archetypes = (
            supabase.table("pitcher_archetypes")
            .select("archetype_id,archetype_name")
            .in_("archetype_id", archetype_ids)
            .execute()
            .data
            or []
        )
        matchups = []
        if abbreviations:
            matchups = (
                supabase.table("team_vs_pitcher_archetype")
                .select(
                    "team_abbreviation,season,period_end,archetype_id,"
                    "model_version,plate_appearances,ops,xwoba,"
                    "strikeout_rate,walk_rate,sample_quality,updated_at"
                )
                .in_("archetype_id", archetype_ids)
                .in_("team_abbreviation", abbreviations)
                .order("period_end", desc=True)
                .execute()
                .data
                or []
            )
        return profiles, archetypes, matchups
    except Exception as error:
        print(
            "Pitcher archetype matchup context unavailable; continuing with "
            f"neutral values. {error}"
        )
        return [], [], []


def main() -> None:
    source_date = date.today().isoformat()
    print(f"Starting rules-based prediction refresh for {source_date}.")
    run_id = start_refresh(PIPELINE_NAME, source_date)

    try:
        fact_games = _upcoming_games(source_date)
        game_ids = [int(row["mlb_game_pk"]) for row in fact_games]
        pitcher_profiles, pitcher_archetypes, team_matchups = (
            _archetype_context(fact_games)
        )
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
            pitcher_profiles=pitcher_profiles,
            pitcher_archetypes=pitcher_archetypes,
            team_archetype_matchups=team_matchups,
        )
        predictions = build_predictions(features.features)
        loaded = load_game_predictions(predictions)
        print(f"Games considered: {features.games_considered}.")
        print(f"Predictions created: {len(predictions)}.")
        print(f"Games skipped: {features.games_skipped}.")
        print(f"Games missing odds: {features.missing_odds_count}.")
        print(f"Games missing at least one starter: {features.missing_starter_count}.")
        print(
            "Archetype context rows: "
            f"{len(pitcher_profiles)} starter profiles, "
            f"{len(team_matchups)} team matchups."
        )
        mark_refresh_success(run_id, loaded)
        print(f"Rules-based prediction refresh complete: {loaded} rows loaded.")
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Rules-based prediction refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
