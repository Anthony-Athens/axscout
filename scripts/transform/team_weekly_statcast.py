import pandas as pd

TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}

GROUP_COLUMNS = [
    "season",
    "week_start_date",
    "week_end_date",
    "team_abbreviation",
]
SEASON_GROUP_COLUMNS = ["season", "team_abbreviation"]

HIT_BASES = {
    "single": 1,
    "double": 2,
    "triple": 3,
    "home_run": 4,
}

# Events that safely represent an official at-bat in Statcast's terminal
# plate-appearance event field. Walks, HBP, sacrifices, and interference are
# intentionally excluded.
OFFICIAL_AT_BAT_EVENTS = set(HIT_BASES) | {
    "field_error",
    "field_out",
    "fielders_choice",
    "fielders_choice_out",
    "force_out",
    "grounded_into_double_play",
    "strikeout",
    "strikeout_double_play",
    "double_play",
    "triple_play",
    "other_out",
}

WALK_EVENTS = {"walk", "intent_walk", "intentional_walk"}


def _first_available_column(data: pd.DataFrame, candidates: tuple[str, ...]):
    for column in candidates:
        if column in data.columns:
            return data[column].astype("string")

    return None


def _infer_team_sides(data: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    batting_team = _first_available_column(
        data,
        ("batting_team", "batter_team", "bat_team"),
    )
    pitching_team = _first_available_column(
        data,
        ("pitching_team", "pitcher_team", "fld_team"),
    )

    if batting_team is not None and pitching_team is not None:
        return batting_team, pitching_team

    required_columns = {"home_team", "away_team", "inning_topbot"}
    missing_columns = required_columns.difference(data.columns)

    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"Statcast data is missing team-side columns: {missing}")

    top_of_inning = (
        data["inning_topbot"].astype("string").str.strip().str.lower().eq("top")
    )
    known_half = (
        data["inning_topbot"]
        .astype("string")
        .str.strip()
        .str.lower()
        .isin({"top", "bot", "bottom"})
    )
    inferred_batting = data["home_team"].where(~top_of_inning, data["away_team"])
    inferred_pitching = data["away_team"].where(~top_of_inning, data["home_team"])
    inferred_batting = inferred_batting.where(known_half)
    inferred_pitching = inferred_pitching.where(known_half)

    return (
        batting_team if batting_team is not None else inferred_batting,
        pitching_team if pitching_team is not None else inferred_pitching,
    )


def _prepare_data(statcast_data: pd.DataFrame) -> pd.DataFrame:
    if statcast_data is None or statcast_data.empty:
        return pd.DataFrame()

    if "game_date" not in statcast_data.columns:
        raise ValueError("Statcast data is missing game_date.")

    data = statcast_data.copy()
    game_dates = pd.to_datetime(data["game_date"], errors="coerce")
    batting_team, pitching_team = _infer_team_sides(data)
    calendar_weeks = game_dates.dt.to_period("W-SUN")

    data["season"] = game_dates.dt.year.astype("Int64")
    data["week_start_date"] = calendar_weeks.dt.start_time.dt.strftime("%Y-%m-%d")
    data["week_end_date"] = calendar_weeks.dt.end_time.dt.strftime("%Y-%m-%d")
    data["batting_team"] = batting_team
    data["pitching_team"] = pitching_team

    for column in ("batting_team", "pitching_team"):
        data[column] = (
            data[column]
            .astype("string")
            .str.strip()
            .str.upper()
            .replace(TEAM_ABBREVIATION_ALIASES)
        )

    return data.dropna(
        subset=["season", "week_start_date", "week_end_date"]
    )


def _base_team_weeks(data: pd.DataFrame, team_column: str) -> pd.DataFrame:
    base = data[
        ["season", "week_start_date", "week_end_date", team_column]
    ].dropna()
    base = base.rename(columns={team_column: "team_abbreviation"})
    return base.drop_duplicates().reset_index(drop=True)


def _numeric_column(data: pd.DataFrame, column: str) -> pd.Series:
    if column not in data.columns:
        return pd.Series(float("nan"), index=data.index, dtype="float64")

    return pd.to_numeric(data[column], errors="coerce")


def _to_records(data: pd.DataFrame) -> list[dict]:
    records = []

    for row in data.to_dict(orient="records"):
        records.append(
            {
                key: None if pd.isna(value) else value
                for key, value in row.items()
            }
        )

    return records


def build_team_offense_weekly_rows(data: pd.DataFrame) -> list[dict]:
    if data.empty:
        return []

    base = _base_team_weeks(data, "batting_team")

    if base.empty:
        return []

    offense = data.dropna(subset=["batting_team"]).copy()
    offense = offense.rename(columns={"batting_team": "team_abbreviation"})
    events = offense.get(
        "events",
        pd.Series(pd.NA, index=offense.index, dtype="string"),
    ).astype("string").str.strip().str.lower()
    offense["hit"] = events.isin(HIT_BASES).astype("int64")
    offense["total_bases"] = (
        events.map(HIT_BASES).fillna(0).astype("int64")
    )
    offense["at_bat"] = events.isin(OFFICIAL_AT_BAT_EVENTS).astype("int64")
    offense["walk"] = events.isin(WALK_EVENTS).astype("int64")
    offense["hit_by_pitch"] = events.eq("hit_by_pitch").fillna(False).astype(
        "int64"
    )
    offense["sacrifice_fly"] = events.eq("sac_fly").fillna(False).astype(
        "int64"
    )
    offense["home_run"] = (
        events.eq("home_run").fillna(False).astype("int64")
    )
    offense["launch_speed_value"] = _numeric_column(offense, "launch_speed")

    grouped = (
        offense.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            hits=("hit", "sum"),
            total_bases=("total_bases", "sum"),
            at_bats=("at_bat", "sum"),
            walks=("walk", "sum"),
            hit_by_pitch=("hit_by_pitch", "sum"),
            sacrifice_flies=("sacrifice_fly", "sum"),
            home_runs=("home_run", "sum"),
            avg_exit_velocity=("launch_speed_value", "mean"),
        )
    )

    if {"bat_score", "post_bat_score"}.issubset(offense.columns):
        before_score = pd.to_numeric(offense["bat_score"], errors="coerce")
        after_score = pd.to_numeric(offense["post_bat_score"], errors="coerce")
        offense["runs_on_play"] = (after_score - before_score).clip(lower=0)
        runs = (
            offense.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
            .agg(
                runs=(
                    "runs_on_play",
                    lambda values: values.sum(min_count=1),
                )
            )
        )
        grouped = grouped.merge(runs, on=GROUP_COLUMNS, how="left")
    else:
        grouped["runs"] = None

    rows = base.merge(grouped, on=GROUP_COLUMNS, how="left")
    rows["season"] = rows["season"].astype("int64")
    rows["home_runs"] = rows["home_runs"].fillna(0).astype("int64")
    rows["runs"] = (
        pd.to_numeric(rows["runs"], errors="coerce").round().astype("Int64")
    )
    rows["avg_exit_velocity"] = rows["avg_exit_velocity"].round(2)

    at_bats = rows["at_bats"].astype("float64")
    obp_denominator = (
        at_bats
        + rows["walks"]
        + rows["hit_by_pitch"]
        + rows["sacrifice_flies"]
    )
    batting_average = (rows["hits"] / at_bats).where(at_bats > 0)
    on_base_percentage = (
        (rows["hits"] + rows["walks"] + rows["hit_by_pitch"])
        / obp_denominator
    ).where(obp_denominator > 0)
    slugging_percentage = (rows["total_bases"] / at_bats).where(at_bats > 0)

    rows["batting_average"] = batting_average.round(3)
    rows["ops"] = (on_base_percentage + slugging_percentage).round(3)

    return _to_records(
        rows[
            GROUP_COLUMNS
            + [
                "batting_average",
                "ops",
                "home_runs",
                "runs",
                "avg_exit_velocity",
            ]
        ]
    )


def build_team_pitching_weekly_rows(data: pd.DataFrame) -> list[dict]:
    if data.empty:
        return []

    base = _base_team_weeks(data, "pitching_team")

    if base.empty:
        return []

    pitching = data.dropna(subset=["pitching_team"]).copy()
    pitching = pitching.rename(columns={"pitching_team": "team_abbreviation"})
    events = pitching.get(
        "events",
        pd.Series(pd.NA, index=pitching.index, dtype="string"),
    ).astype("string")
    pitching["strikeout"] = (
        events.eq("strikeout").fillna(False).astype("int64")
    )
    pitching["pitch_speed_value"] = _numeric_column(
        pitching,
        "release_speed",
    )
    pitching["spin_rate_value"] = _numeric_column(
        pitching,
        "release_spin_rate",
    )

    rows = (
        pitching.groupby(GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            strikeouts=("strikeout", "sum"),
            avg_pitch_speed=("pitch_speed_value", "mean"),
            avg_spin_rate=("spin_rate_value", "mean"),
        )
    )
    rows = base.merge(rows, on=GROUP_COLUMNS, how="left")
    rows["season"] = rows["season"].astype("int64")
    rows["strikeouts"] = rows["strikeouts"].fillna(0).astype("int64")
    rows["avg_pitch_speed"] = rows["avg_pitch_speed"].round(2)
    rows["avg_spin_rate"] = rows["avg_spin_rate"].round(2)
    rows["era"] = None
    rows["whip"] = None

    return _to_records(
        rows[
            GROUP_COLUMNS
            + [
                "era",
                "whip",
                "strikeouts",
                "avg_pitch_speed",
                "avg_spin_rate",
            ]
        ]
    )


def build_team_offense_season_rows(data: pd.DataFrame) -> list[dict]:
    if data.empty:
        return []

    offense = data.dropna(subset=["batting_team"]).copy()
    if offense.empty:
        return []

    offense = offense.rename(columns={"batting_team": "team_abbreviation"})
    events = offense.get(
        "events",
        pd.Series(pd.NA, index=offense.index, dtype="string"),
    ).astype("string").str.strip().str.lower()
    offense["plate_appearance"] = events.notna().astype("int64")
    offense["hit"] = events.isin(HIT_BASES).astype("int64")
    offense["total_bases"] = events.map(HIT_BASES).fillna(0).astype("int64")
    offense["at_bat"] = events.isin(OFFICIAL_AT_BAT_EVENTS).astype("int64")
    offense["walk"] = events.isin(WALK_EVENTS).astype("int64")
    offense["hit_by_pitch"] = events.eq("hit_by_pitch").fillna(False).astype("int64")
    offense["sacrifice_fly"] = events.eq("sac_fly").fillna(False).astype("int64")
    offense["home_run"] = events.eq("home_run").fillna(False).astype("int64")
    offense["launch_speed_value"] = _numeric_column(offense, "launch_speed")

    rows = (
        offense.groupby(SEASON_GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            plate_appearances=("plate_appearance", "sum"),
            at_bats=("at_bat", "sum"),
            hits=("hit", "sum"),
            home_runs=("home_run", "sum"),
            walks=("walk", "sum"),
            hit_by_pitch=("hit_by_pitch", "sum"),
            sacrifice_flies=("sacrifice_fly", "sum"),
            total_bases=("total_bases", "sum"),
            avg_exit_velocity=("launch_speed_value", "mean"),
        )
    )

    if {"bat_score", "post_bat_score"}.issubset(offense.columns):
        before_score = pd.to_numeric(offense["bat_score"], errors="coerce")
        after_score = pd.to_numeric(offense["post_bat_score"], errors="coerce")
        offense["runs_on_play"] = (after_score - before_score).clip(lower=0)
        runs = (
            offense.groupby(SEASON_GROUP_COLUMNS, as_index=False, dropna=False)
            .agg(runs=("runs_on_play", lambda values: values.sum(min_count=1)))
        )
        rows = rows.merge(runs, on=SEASON_GROUP_COLUMNS, how="left")
    else:
        rows["runs"] = None

    at_bats = rows["at_bats"].astype("float64")
    obp_denominator = (
        at_bats + rows["walks"] + rows["hit_by_pitch"] + rows["sacrifice_flies"]
    )
    rows["batting_average"] = (rows["hits"] / at_bats).where(at_bats > 0).round(3)
    rows["obp"] = (
        (rows["hits"] + rows["walks"] + rows["hit_by_pitch"])
        / obp_denominator
    ).where(obp_denominator > 0).round(3)
    rows["slg"] = (rows["total_bases"] / at_bats).where(at_bats > 0).round(3)
    rows["ops"] = (rows["obp"] + rows["slg"]).round(3)
    rows["season"] = rows["season"].astype("int64")
    rows["runs"] = pd.to_numeric(rows["runs"], errors="coerce").round().astype("Int64")
    rows["avg_exit_velocity"] = rows["avg_exit_velocity"].round(2)
    return _to_records(rows)


def build_team_pitching_season_rows(data: pd.DataFrame) -> list[dict]:
    if data.empty:
        return []

    pitching = data.dropna(subset=["pitching_team"]).copy()
    if pitching.empty:
        return []

    pitching = pitching.rename(columns={"pitching_team": "team_abbreviation"})
    events = pitching.get(
        "events",
        pd.Series(pd.NA, index=pitching.index, dtype="string"),
    ).astype("string")
    pitching["strikeout"] = events.eq("strikeout").fillna(False).astype("int64")
    pitching["pitch_speed_value"] = _numeric_column(pitching, "release_speed")
    pitching["spin_rate_value"] = _numeric_column(pitching, "release_spin_rate")
    rows = (
        pitching.groupby(SEASON_GROUP_COLUMNS, as_index=False, dropna=False)
        .agg(
            strikeouts=("strikeout", "sum"),
            avg_pitch_speed=("pitch_speed_value", "mean"),
            avg_spin_rate=("spin_rate_value", "mean"),
        )
    )
    rows["season"] = rows["season"].astype("int64")
    rows["strikeouts"] = rows["strikeouts"].fillna(0).astype("int64")
    rows["avg_pitch_speed"] = rows["avg_pitch_speed"].round(2)
    rows["avg_spin_rate"] = rows["avg_spin_rate"].round(2)
    return _to_records(rows)


def build_team_season_statcast_rows(
    statcast_data: pd.DataFrame,
) -> tuple[list[dict], list[dict]]:
    data = _prepare_data(statcast_data)
    if data.empty:
        return [], []

    offense_rows = build_team_offense_season_rows(data)
    pitching_rows = build_team_pitching_season_rows(data)
    print(f"Built {len(offense_rows)} team offense season rows.")
    print(f"Built {len(pitching_rows)} team pitching season rows.")
    return offense_rows, pitching_rows


def build_team_weekly_statcast_rows(
    statcast_data: pd.DataFrame,
) -> tuple[list[dict], list[dict]]:
    data = _prepare_data(statcast_data)

    if data.empty:
        print("No Statcast rows available for weekly aggregation.")
        return [], []

    offense_rows = build_team_offense_weekly_rows(data)
    pitching_rows = build_team_pitching_weekly_rows(data)

    print(f"Built {len(offense_rows)} team offense weekly rows.")
    print(f"Built {len(pitching_rows)} team pitching weekly rows.")

    return offense_rows, pitching_rows
