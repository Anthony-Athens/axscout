from datetime import date

import pandas as pd

from scripts.transform.player_weekly_statcast import (
    build_player_offense_rows,
    build_player_pitching_rows,
    prepare_player_statcast,
)

ROLLING_PERIOD_COLUMNS = [
    "season",
    "window_start_date",
    "window_end_date",
]


def _official_pitching_by_player_team(rows: list[dict]) -> dict[tuple[int, str], dict]:
    grouped: dict[tuple[int, str], dict] = {}
    for row in rows:
        player_id = row.get("mlb_player_id")
        team = row.get("team_abbreviation")
        if player_id is None or not team:
            continue

        key = (int(player_id), str(team))
        totals = grouped.setdefault(
            key,
            {
                "outs_recorded": 0,
                "earned_runs": 0,
                "hits_allowed": 0,
                "walks": 0,
                "strikeouts": 0,
            },
        )
        for field in totals:
            totals[field] += int(row.get(field) or 0)

    updates: dict[tuple[int, str], dict] = {}
    for key, totals in grouped.items():
        outs = totals["outs_recorded"]
        updates[key] = {
            "innings_pitched": round(outs / 3, 3) if outs else None,
            "earned_runs": totals["earned_runs"],
            "hits_allowed": totals["hits_allowed"],
            "walks": totals["walks"],
            "strikeouts": totals["strikeouts"],
            "era": round(totals["earned_runs"] * 27 / outs, 2)
            if outs
            else None,
            "whip": round(
                (totals["walks"] + totals["hits_allowed"]) * 3 / outs,
                3,
            )
            if outs
            else None,
        }
    return updates


def enrich_rolling_pitching_with_official_stats(
    pitching_rows: list[dict],
    official_rows: list[dict],
) -> list[dict]:
    official = _official_pitching_by_player_team(official_rows)
    player_only: dict[int, list[dict]] = {}
    for (player_id, _team), update in official.items():
        player_only.setdefault(player_id, []).append(update)

    enriched = []
    for row in pitching_rows:
        player_id = int(row["mlb_player_id"])
        team = row.get("team_abbreviation")
        update = official.get((player_id, team)) if team else None
        if update is None and len(player_only.get(player_id, [])) == 1:
            update = player_only[player_id][0]

        enriched.append(
            {
                **row,
                "innings_pitched": update.get("innings_pitched")
                if update
                else None,
                "earned_runs": update.get("earned_runs") if update else None,
                "hits_allowed": update.get("hits_allowed")
                if update
                else row.get("hits_allowed"),
                "walks": update.get("walks") if update else row.get("walks"),
                "strikeouts": update.get("strikeouts")
                if update
                else row.get("strikeouts"),
                "era": update.get("era") if update else None,
                "whip": update.get("whip") if update else None,
            }
        )
    return enriched


def build_player_rolling_7_statcast_rows(
    statcast_data: pd.DataFrame,
    window_start_date: date,
    window_end_date: date,
    official_pitching_rows: list[dict] | None = None,
) -> tuple[list[dict], list[dict]]:
    data = prepare_player_statcast(statcast_data)
    if data.empty:
        print("No Statcast rows available for player rolling 7 aggregation.")
        return [], []

    start = pd.Timestamp(window_start_date)
    end = pd.Timestamp(window_end_date)
    data = data[
        data["game_date_value"].between(start, end, inclusive="both")
    ].copy()
    if data.empty:
        print("No regular-season Statcast rows fall inside the rolling window.")
        return [], []

    data["season"] = window_end_date.year
    data["window_start_date"] = window_start_date.isoformat()
    data["window_end_date"] = window_end_date.isoformat()
    offense_rows = build_player_offense_rows(data, ROLLING_PERIOD_COLUMNS)
    pitching_rows = build_player_pitching_rows(data, ROLLING_PERIOD_COLUMNS)
    pitching_rows = enrich_rolling_pitching_with_official_stats(
        pitching_rows,
        official_pitching_rows or [],
    )
    print(f"Built {len(offense_rows)} player offense rolling 7 rows.")
    print(f"Built {len(pitching_rows)} player pitching rolling 7 rows.")
    return offense_rows, pitching_rows
