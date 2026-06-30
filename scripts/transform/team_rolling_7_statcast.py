from datetime import date

import pandas as pd

from scripts.transform.player_weekly_statcast import (
    HIT_BASES,
    OFFICIAL_AT_BAT_EVENTS,
    PLATE_APPEARANCE_EVENTS,
    STRIKEOUT_EVENTS,
    WALK_EVENTS,
    prepare_player_statcast,
)

GROUP_COLUMNS = [
    "season",
    "window_start_date",
    "window_end_date",
    "team_abbreviation",
]


def _numeric_column(data: pd.DataFrame, column: str) -> pd.Series:
    if column not in data.columns:
        return pd.Series(float("nan"), index=data.index, dtype="float64")
    return pd.to_numeric(data[column], errors="coerce")


def _to_records(data: pd.DataFrame) -> list[dict]:
    return [
        {key: None if pd.isna(value) else value for key, value in row.items()}
        for row in data.to_dict(orient="records")
    ]


def _prepare_window(
    statcast_data: pd.DataFrame,
    window_start_date: date,
    window_end_date: date,
) -> pd.DataFrame:
    data = prepare_player_statcast(statcast_data)
    if data.empty:
        return data

    data = data[
        data["game_date_value"].between(
            pd.Timestamp(window_start_date),
            pd.Timestamp(window_end_date),
            inclusive="both",
        )
    ].copy()
    if data.empty:
        return data

    data["season"] = window_end_date.year
    data["window_start_date"] = window_start_date.isoformat()
    data["window_end_date"] = window_end_date.isoformat()
    return data


def _build_offense_rows(data: pd.DataFrame) -> list[dict]:
    offense = data.dropna(subset=["batter_team_abbreviation"]).copy()
    if offense.empty:
        return []

    offense["team_abbreviation"] = offense["batter_team_abbreviation"]
    events = offense.get(
        "events",
        pd.Series(pd.NA, index=offense.index, dtype="string"),
    ).astype("string").str.strip().str.lower()
    offense["plate_appearance"] = events.isin(
        PLATE_APPEARANCE_EVENTS
    ).astype("int64")
    offense["at_bat"] = events.isin(OFFICIAL_AT_BAT_EVENTS).astype("int64")
    offense["hit"] = events.isin(HIT_BASES).astype("int64")
    offense["total_bases"] = events.map(HIT_BASES).fillna(0).astype("int64")
    offense["home_run"] = events.eq("home_run").fillna(False).astype("int64")
    offense["walk"] = events.isin(WALK_EVENTS).astype("int64")
    offense["strikeout"] = events.isin(STRIKEOUT_EVENTS).astype("int64")
    offense["hit_by_pitch"] = events.eq("hit_by_pitch").fillna(False).astype(
        "int64"
    )
    offense["sacrifice_fly"] = events.eq("sac_fly").fillna(False).astype(
        "int64"
    )
    offense["launch_speed_value"] = _numeric_column(offense, "launch_speed")

    rows = (
        offense.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            plate_appearances=("plate_appearance", "sum"),
            at_bats=("at_bat", "sum"),
            hits=("hit", "sum"),
            total_bases=("total_bases", "sum"),
            home_runs=("home_run", "sum"),
            walks=("walk", "sum"),
            strikeouts=("strikeout", "sum"),
            hit_by_pitch=("hit_by_pitch", "sum"),
            sacrifice_flies=("sacrifice_fly", "sum"),
            avg_exit_velocity=("launch_speed_value", "mean"),
        )
    )

    if {"bat_score", "post_bat_score"}.issubset(offense.columns):
        before_score = pd.to_numeric(offense["bat_score"], errors="coerce")
        after_score = pd.to_numeric(offense["post_bat_score"], errors="coerce")
        offense["runs_on_play"] = (after_score - before_score).clip(lower=0)
        runs = (
            offense.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
            .agg(runs=("runs_on_play", lambda values: values.sum(min_count=1)))
        )
        rows = rows.merge(runs, on=GROUP_COLUMNS, how="left")
    else:
        rows["runs"] = None

    at_bats = rows["at_bats"].astype("float64")
    obp_denominator = (
        at_bats
        + rows["walks"]
        + rows["hit_by_pitch"]
        + rows["sacrifice_flies"]
    )
    rows["batting_average"] = (rows["hits"] / at_bats).where(at_bats > 0)
    rows["obp"] = (
        (rows["hits"] + rows["walks"] + rows["hit_by_pitch"])
        / obp_denominator
    ).where(obp_denominator > 0)
    rows["slg"] = (rows["total_bases"] / at_bats).where(at_bats > 0)
    rows["ops"] = rows["obp"] + rows["slg"]

    for column in ("batting_average", "obp", "slg", "ops"):
        rows[column] = rows[column].round(3)
    rows["avg_exit_velocity"] = rows["avg_exit_velocity"].round(2)
    rows["runs"] = pd.to_numeric(rows["runs"], errors="coerce").round().astype(
        "Int64"
    )

    return _to_records(
        rows[
            GROUP_COLUMNS
            + [
                "plate_appearances",
                "at_bats",
                "hits",
                "home_runs",
                "walks",
                "strikeouts",
                "runs",
                "batting_average",
                "obp",
                "slg",
                "ops",
                "avg_exit_velocity",
            ]
        ]
    )


def _official_pitching_by_team(rows: list[dict]) -> dict[str, dict]:
    grouped: dict[str, dict] = {}
    for row in rows:
        team = str(row.get("team_abbreviation") or "").strip().upper()
        if not team:
            continue
        totals = grouped.setdefault(
            team,
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
    return grouped


def _build_pitching_rows(
    data: pd.DataFrame,
    official_pitching_rows: list[dict],
) -> list[dict]:
    pitching = data.dropna(subset=["pitcher_team_abbreviation"]).copy()
    if pitching.empty:
        return []

    pitching["team_abbreviation"] = pitching["pitcher_team_abbreviation"]
    events = pitching.get(
        "events",
        pd.Series(pd.NA, index=pitching.index, dtype="string"),
    ).astype("string").str.strip().str.lower()
    pitching["batter_faced"] = events.isin(
        PLATE_APPEARANCE_EVENTS
    ).astype("int64")
    pitching["strikeout"] = events.isin(STRIKEOUT_EVENTS).astype("int64")
    pitching["walk"] = events.isin(WALK_EVENTS).astype("int64")
    pitching["hit_allowed"] = events.isin(HIT_BASES).astype("int64")
    pitching["home_run_allowed"] = events.eq("home_run").fillna(False).astype(
        "int64"
    )
    pitching["pitch_speed_value"] = _numeric_column(pitching, "release_speed")
    pitching["spin_rate_value"] = _numeric_column(
        pitching, "release_spin_rate"
    )

    rows = (
        pitching.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            batters_faced=("batter_faced", "sum"),
            strikeouts=("strikeout", "sum"),
            walks=("walk", "sum"),
            hits_allowed=("hit_allowed", "sum"),
            home_runs_allowed=("home_run_allowed", "sum"),
            avg_pitch_speed=("pitch_speed_value", "mean"),
            avg_spin_rate=("spin_rate_value", "mean"),
        )
    )
    official = _official_pitching_by_team(official_pitching_rows)

    for index, row in rows.iterrows():
        update = official.get(str(row["team_abbreviation"]))
        if update is None:
            rows.at[index, "innings_pitched"] = None
            rows.at[index, "earned_runs"] = None
            rows.at[index, "era"] = None
            rows.at[index, "whip"] = None
            continue

        outs = update["outs_recorded"]
        rows.at[index, "innings_pitched"] = round(outs / 3, 3) if outs else None
        rows.at[index, "earned_runs"] = update["earned_runs"]
        rows.at[index, "hits_allowed"] = update["hits_allowed"]
        rows.at[index, "walks"] = update["walks"]
        rows.at[index, "strikeouts"] = update["strikeouts"]
        rows.at[index, "era"] = (
            round(update["earned_runs"] * 27 / outs, 2) if outs else None
        )
        rows.at[index, "whip"] = (
            round(
                (update["walks"] + update["hits_allowed"]) * 3 / outs,
                3,
            )
            if outs
            else None
        )

    for column in (
        "batters_faced",
        "earned_runs",
        "hits_allowed",
        "walks",
        "strikeouts",
        "home_runs_allowed",
    ):
        rows[column] = pd.to_numeric(rows[column], errors="coerce").round().astype(
            "Int64"
        )
    rows["avg_pitch_speed"] = rows["avg_pitch_speed"].round(2)
    rows["avg_spin_rate"] = rows["avg_spin_rate"].round(2)
    return _to_records(
        rows[
            GROUP_COLUMNS
            + [
                "batters_faced",
                "innings_pitched",
                "earned_runs",
                "hits_allowed",
                "walks",
                "strikeouts",
                "home_runs_allowed",
                "era",
                "whip",
                "avg_pitch_speed",
                "avg_spin_rate",
            ]
        ]
    )


def build_team_rolling_7_statcast_rows(
    statcast_data: pd.DataFrame,
    window_start_date: date,
    window_end_date: date,
    official_pitching_rows: list[dict] | None = None,
) -> tuple[list[dict], list[dict]]:
    data = _prepare_window(statcast_data, window_start_date, window_end_date)
    if data.empty:
        print("No regular-season Statcast rows fall inside the team rolling window.")
        return [], []

    offense_rows = _build_offense_rows(data)
    pitching_rows = _build_pitching_rows(data, official_pitching_rows or [])
    print(f"Built {len(offense_rows)} team offense rolling 7 rows.")
    print(f"Built {len(pitching_rows)} team pitching rolling 7 rows.")
    return offense_rows, pitching_rows
