from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class PredictionFeatureResult:
    features: list[dict]
    games_considered: int
    games_skipped: int
    missing_odds_count: int
    missing_starter_count: int


def _number(value) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _integer(value) -> int | None:
    number = _number(value)
    return int(number) if number is not None else None


def _latest_by_team(rows: list[dict], date_field: str | None = None) -> dict:
    ordered = sorted(
        rows,
        key=lambda row: (
            str(row.get(date_field) or "")
            if date_field
            else int(row.get("season") or 0)
        ),
        reverse=True,
    )
    result = {}
    for row in ordered:
        team = row.get("team_abbreviation")
        if team and team not in result:
            result[team] = row
    return result


def _latest_pitchers(rows: list[dict]) -> dict[int, dict]:
    ordered = sorted(rows, key=lambda row: int(row.get("season") or 0), reverse=True)
    result = {}
    for row in ordered:
        player_id = _integer(row.get("mlb_player_id"))
        if player_id is not None and player_id not in result:
            result[player_id] = row
    return result


def _latest_moneylines(rows: list[dict]) -> dict[int, dict]:
    eligible = [
        row
        for row in rows
        if row.get("market_key") == "h2h"
        and row.get("odds_format", "american") == "american"
        and _integer(row.get("mlb_game_pk")) is not None
    ]
    eligible.sort(
        key=lambda row: (
            str(row.get("snapshot_at") or ""),
            str(row.get("market_last_update") or ""),
            str(row.get("sportsbook") or ""),
        ),
        reverse=True,
    )
    result = {}
    for row in eligible:
        game_pk = _integer(row.get("mlb_game_pk"))
        if game_pk is not None and game_pk not in result:
            result[game_pk] = row
    return result


def _run_diff_per_game(row: dict) -> float | None:
    games_played = _number(row.get("games_played"))
    run_differential = _number(row.get("run_differential"))
    if not games_played or run_differential is None:
        return None
    return run_differential / games_played


def build_prediction_features(
    fact_games: list[dict],
    dim_teams: list[dict],
    team_season: list[dict],
    team_offense_season: list[dict],
    team_pitching_season: list[dict],
    team_rolling_14: list[dict],
    team_offense_rolling_7: list[dict],
    team_pitching_rolling_7: list[dict],
    player_pitching_season: list[dict],
    active_injuries: list[dict],
    odds_snapshots: list[dict],
) -> PredictionFeatureResult:
    teams_by_key = {
        _integer(row.get("team_key")): row.get("abbreviation")
        for row in dim_teams
        if _integer(row.get("team_key")) is not None
    }
    season = _latest_by_team(team_season)
    offense_season = _latest_by_team(team_offense_season)
    pitching_season = _latest_by_team(team_pitching_season)
    rolling_14 = _latest_by_team(team_rolling_14)
    offense_rolling_7 = _latest_by_team(
        team_offense_rolling_7,
        "window_end_date",
    )
    pitching_rolling_7 = _latest_by_team(
        team_pitching_rolling_7,
        "window_end_date",
    )
    pitchers = _latest_pitchers(player_pitching_season)
    injuries = Counter(
        row.get("team_abbreviation")
        for row in active_injuries
        if row.get("is_active", True) and row.get("team_abbreviation")
    )
    odds = _latest_moneylines(odds_snapshots)

    features = []
    skipped = 0
    missing_odds = 0
    missing_starter = 0
    for game in fact_games:
        game_pk = _integer(game.get("mlb_game_pk"))
        home_team = teams_by_key.get(_integer(game.get("home_team_key")))
        away_team = teams_by_key.get(_integer(game.get("away_team_key")))
        game_date = game.get("game_date")
        if game_pk is None or not home_team or not away_team or not game_date:
            skipped += 1
            continue

        home_season = season.get(home_team, {})
        away_season = season.get(away_team, {})
        home_rolling = rolling_14.get(home_team, {})
        away_rolling = rolling_14.get(away_team, {})
        home_starter_id = _integer(game.get("home_probable_pitcher_mlb_id"))
        away_starter_id = _integer(game.get("away_probable_pitcher_mlb_id"))
        home_starter = pitchers.get(home_starter_id, {})
        away_starter = pitchers.get(away_starter_id, {})
        if home_starter_id is None or away_starter_id is None:
            missing_starter += 1

        moneyline = odds.get(game_pk, {})
        if not moneyline:
            missing_odds += 1

        features.append(
            {
                "mlb_game_pk": game_pk,
                "game_date": str(game_date),
                "home_team": home_team,
                "away_team": away_team,
                "home_win_pct": _number(home_season.get("winning_percentage")),
                "away_win_pct": _number(away_season.get("winning_percentage")),
                "home_run_diff_per_game": _run_diff_per_game(home_season),
                "away_run_diff_per_game": _run_diff_per_game(away_season),
                "home_season_ops": _number(
                    offense_season.get(home_team, {}).get("ops")
                ),
                "away_season_ops": _number(
                    offense_season.get(away_team, {}).get("ops")
                ),
                "home_season_era": _number(
                    pitching_season.get(home_team, {}).get("era")
                ),
                "away_season_era": _number(
                    pitching_season.get(away_team, {}).get("era")
                ),
                "home_rolling_14_win_pct": _number(
                    home_rolling.get("winning_percentage")
                ),
                "away_rolling_14_win_pct": _number(
                    away_rolling.get("winning_percentage")
                ),
                "home_rolling_14_run_diff_per_game": _number(
                    home_rolling.get("run_differential_per_game")
                ),
                "away_rolling_14_run_diff_per_game": _number(
                    away_rolling.get("run_differential_per_game")
                ),
                "home_rolling_7_ops": _number(
                    offense_rolling_7.get(home_team, {}).get("ops")
                ),
                "away_rolling_7_ops": _number(
                    offense_rolling_7.get(away_team, {}).get("ops")
                ),
                "home_rolling_7_era": _number(
                    pitching_rolling_7.get(home_team, {}).get("era")
                ),
                "away_rolling_7_era": _number(
                    pitching_rolling_7.get(away_team, {}).get("era")
                ),
                "home_starter_era": _number(home_starter.get("era")),
                "away_starter_era": _number(away_starter.get("era")),
                "home_starter_whip": _number(home_starter.get("whip")),
                "away_starter_whip": _number(away_starter.get("whip")),
                "home_starter_strikeouts": _integer(
                    home_starter.get("strikeouts")
                ),
                "away_starter_strikeouts": _integer(
                    away_starter.get("strikeouts")
                ),
                "home_active_injuries": injuries[home_team],
                "away_active_injuries": injuries[away_team],
                "home_moneyline": _integer(moneyline.get("home_price")),
                "away_moneyline": _integer(moneyline.get("away_price")),
                "sportsbook": moneyline.get("sportsbook"),
                "source_snapshot_at": moneyline.get("snapshot_at"),
            }
        )

    return PredictionFeatureResult(
        features=features,
        games_considered=len(fact_games),
        games_skipped=skipped,
        missing_odds_count=missing_odds,
        missing_starter_count=missing_starter,
    )
