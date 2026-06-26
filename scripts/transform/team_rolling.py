from collections import defaultdict
from datetime import datetime


def build_team_rolling_14_rows(team_daily_rows: list[dict]) -> list[dict]:
    rows_by_team = defaultdict(list)

    for row in team_daily_rows:
        rows_by_team[row["team_key"]].append(row)

    output_rows = []

    for team_key, rows in rows_by_team.items():
        sorted_rows = sorted(
            rows,
            key=lambda row: (row["game_date"], row["mlb_game_pk"]),
            reverse=True,
        )

        last_14 = sorted_rows[:14]

        if not last_14:
            continue

        latest_game_date = last_14[0]["game_date"]
        season = datetime.fromisoformat(latest_game_date).year

        games_played = sum(row["games_played"] for row in last_14)
        wins = sum(row["wins"] for row in last_14)
        losses = sum(row["losses"] for row in last_14)
        runs_scored = sum(row["runs_scored"] or 0 for row in last_14)
        runs_allowed = sum(row["runs_allowed"] or 0 for row in last_14)
        run_differential = sum(row["run_differential"] or 0 for row in last_14)

        output_rows.append(
            {
                "season": season,
                "team_key": team_key,
                "team_abbreviation": last_14[0]["team_abbreviation"],
                "games_played": games_played,
                "wins": wins,
                "losses": losses,
                "winning_percentage": round(wins / games_played, 3)
                if games_played
                else None,
                "runs_scored": runs_scored,
                "runs_allowed": runs_allowed,
                "run_differential": run_differential,
                "runs_scored_per_game": round(runs_scored / games_played, 2)
                if games_played
                else None,
                "runs_allowed_per_game": round(runs_allowed / games_played, 2)
                if games_played
                else None,
                "run_differential_per_game": round(
                    run_differential / games_played, 2
                )
                if games_played
                else None,
            }
        )

    return output_rows