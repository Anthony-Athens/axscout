from collections import defaultdict
from datetime import datetime


def build_team_season_rows(team_daily_rows: list[dict]) -> list[dict]:
    grouped = defaultdict(lambda: {
        "games_played": 0,
        "wins": 0,
        "losses": 0,
        "runs_scored": 0,
        "runs_allowed": 0,
        "run_differential": 0,
    })

    metadata = {}

    for row in team_daily_rows:
        season = datetime.fromisoformat(row["game_date"]).year
        key = (season, row["team_key"])

        metadata[key] = {
            "season": season,
            "team_key": row["team_key"],
            "team_abbreviation": row["team_abbreviation"],
        }

        grouped[key]["games_played"] += row["games_played"]
        grouped[key]["wins"] += row["wins"]
        grouped[key]["losses"] += row["losses"]
        grouped[key]["runs_scored"] += row["runs_scored"] or 0
        grouped[key]["runs_allowed"] += row["runs_allowed"] or 0
        grouped[key]["run_differential"] += row["run_differential"] or 0

    rows = []

    for key, stats in grouped.items():
        games_played = stats["games_played"]

        rows.append({
            **metadata[key],
            **stats,
            "winning_percentage": round(stats["wins"] / games_played, 3)
            if games_played else None,
        })

    return rows