import pandas as pd

TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}

HIT_BASES = {
    "single": 1,
    "double": 2,
    "triple": 3,
    "home_run": 4,
}

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
STRIKEOUT_EVENTS = {"strikeout", "strikeout_double_play"}
PLATE_APPEARANCE_EVENTS = OFFICIAL_AT_BAT_EVENTS | WALK_EVENTS | {
    "catcher_interf",
    "hit_by_pitch",
    "sac_bunt",
    "sac_fly",
}

WEEKLY_PERIOD_COLUMNS = [
    "season",
    "week_start_date",
    "week_end_date",
]


def _first_available_column(
    data: pd.DataFrame,
    candidates: tuple[str, ...],
) -> pd.Series:
    for column in candidates:
        if column in data.columns:
            return data[column].astype("string")

    return pd.Series(pd.NA, index=data.index, dtype="string")


def _infer_team_sides(data: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    batting_team = _first_available_column(
        data,
        ("batting_team", "batter_team", "bat_team"),
    )
    pitching_team = _first_available_column(
        data,
        ("pitching_team", "pitcher_team", "fld_team"),
    )

    if {"home_team", "away_team", "inning_topbot"}.issubset(data.columns):
        inning_half = data["inning_topbot"].astype("string").str.lower()
        top_of_inning = inning_half.eq("top")
        known_half = inning_half.isin({"top", "bot", "bottom"})
        inferred_batting = data["home_team"].where(
            ~top_of_inning,
            data["away_team"],
        ).where(known_half)
        inferred_pitching = data["away_team"].where(
            ~top_of_inning,
            data["home_team"],
        ).where(known_half)
        batting_team = batting_team.fillna(inferred_batting)
        pitching_team = pitching_team.fillna(inferred_pitching)

    return batting_team, pitching_team


def _normalize_team(series: pd.Series) -> pd.Series:
    return (
        series.astype("string")
        .str.strip()
        .str.upper()
        .replace(TEAM_ABBREVIATION_ALIASES)
    )


def _normalize_name(value):
    if pd.isna(value):
        return None

    name = str(value).strip()
    if not name:
        return None

    if name.count(",") == 1:
        last_name, first_name = (part.strip() for part in name.split(","))
        return f"{first_name} {last_name}".strip()

    return name


def _numeric_column(data: pd.DataFrame, column: str) -> pd.Series:
    if column not in data.columns:
        return pd.Series(float("nan"), index=data.index, dtype="float64")

    return pd.to_numeric(data[column], errors="coerce")


def prepare_player_statcast(statcast_data: pd.DataFrame) -> pd.DataFrame:
    if statcast_data is None or statcast_data.empty:
        return pd.DataFrame()

    required_columns = {"game_date", "batter", "pitcher"}
    missing_columns = required_columns.difference(statcast_data.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"Statcast data is missing player columns: {missing}")

    data = statcast_data.copy()
    if "game_type" in data.columns:
        data = data[data["game_type"].astype("string").eq("R")].copy()

    game_dates = pd.to_datetime(data["game_date"], errors="coerce")
    calendar_weeks = game_dates.dt.to_period("W-SUN")
    batting_team, pitching_team = _infer_team_sides(data)

    data["game_date_value"] = game_dates
    data["season"] = game_dates.dt.year.astype("Int64")
    data["week_start_date"] = calendar_weeks.dt.start_time.dt.strftime(
        "%Y-%m-%d"
    )
    data["week_end_date"] = calendar_weeks.dt.end_time.dt.strftime(
        "%Y-%m-%d"
    )
    data["batter_id"] = pd.to_numeric(data["batter"], errors="coerce").astype(
        "Int64"
    )
    data["pitcher_id"] = pd.to_numeric(
        data["pitcher"],
        errors="coerce",
    ).astype("Int64")
    data["batter_team_abbreviation"] = _normalize_team(batting_team)
    data["pitcher_team_abbreviation"] = _normalize_team(pitching_team)

    # pybaseball's player_name is the pitcher. Batter names are used only when
    # the source explicitly provides a batter-specific name column.
    data["batter_full_name"] = _first_available_column(
        data,
        ("batter_name", "batter_full_name", "hitter_name"),
    ).map(_normalize_name)
    data["pitcher_full_name"] = _first_available_column(
        data,
        ("pitcher_name", "pitcher_full_name", "player_name"),
    ).map(_normalize_name)

    return data.dropna(subset=["game_date_value", "season"])


def _latest_metadata(
    data: pd.DataFrame,
    group_columns: list[str],
    name_column: str,
    team_column: str,
) -> pd.DataFrame:
    ordered = data.sort_values("game_date_value")

    def last_known(values: pd.Series):
        known = values.dropna()
        return known.iloc[-1] if not known.empty else None

    return (
        ordered.groupby(group_columns, as_index=False, dropna=False)
        .agg(
            full_name=(name_column, last_known),
            team_abbreviation=(team_column, last_known),
        )
    )


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


def build_player_offense_rows(
    data: pd.DataFrame,
    period_columns: list[str],
) -> list[dict]:
    if data.empty:
        return []

    offense = data.dropna(subset=["batter_id"]).copy()
    if offense.empty:
        return []

    offense["mlb_player_id"] = offense["batter_id"].astype("int64")
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

    group_columns = period_columns + ["mlb_player_id"]
    rows = (
        offense.groupby(group_columns, as_index=False, dropna=False)
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
    metadata = _latest_metadata(
        offense,
        group_columns,
        "batter_full_name",
        "batter_team_abbreviation",
    )
    rows = rows.merge(metadata, on=group_columns, how="left")

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

    output_columns = group_columns + [
        "full_name",
        "team_abbreviation",
        "plate_appearances",
        "at_bats",
        "hits",
        "home_runs",
        "walks",
        "strikeouts",
        "batting_average",
        "obp",
        "slg",
        "ops",
        "avg_exit_velocity",
    ]
    return _to_records(rows[output_columns])


def build_player_pitching_rows(
    data: pd.DataFrame,
    period_columns: list[str],
) -> list[dict]:
    if data.empty:
        return []

    pitching = data.dropna(subset=["pitcher_id"]).copy()
    if pitching.empty:
        return []

    pitching["mlb_player_id"] = pitching["pitcher_id"].astype("int64")
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
    pitching["pitch_speed_value"] = _numeric_column(
        pitching,
        "release_speed",
    )
    pitching["spin_rate_value"] = _numeric_column(
        pitching,
        "release_spin_rate",
    )

    group_columns = period_columns + ["mlb_player_id"]
    rows = (
        pitching.groupby(group_columns, as_index=False, dropna=False)
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
    metadata = _latest_metadata(
        pitching,
        group_columns,
        "pitcher_full_name",
        "pitcher_team_abbreviation",
    )
    rows = rows.merge(metadata, on=group_columns, how="left")
    rows["avg_pitch_speed"] = rows["avg_pitch_speed"].round(2)
    rows["avg_spin_rate"] = rows["avg_spin_rate"].round(2)
    rows["era"] = None
    rows["whip"] = None

    output_columns = group_columns + [
        "full_name",
        "team_abbreviation",
        "batters_faced",
        "strikeouts",
        "walks",
        "hits_allowed",
        "home_runs_allowed",
        "avg_pitch_speed",
        "avg_spin_rate",
        "era",
        "whip",
    ]
    return _to_records(rows[output_columns])


def build_player_weekly_statcast_rows(
    statcast_data: pd.DataFrame,
) -> tuple[list[dict], list[dict]]:
    data = prepare_player_statcast(statcast_data)
    if data.empty:
        print("No Statcast rows available for player weekly aggregation.")
        return [], []

    offense_rows = build_player_offense_rows(data, WEEKLY_PERIOD_COLUMNS)
    pitching_rows = build_player_pitching_rows(data, WEEKLY_PERIOD_COLUMNS)
    print(f"Built {len(offense_rows)} player offense weekly rows.")
    print(f"Built {len(pitching_rows)} player pitching weekly rows.")
    return offense_rows, pitching_rows
