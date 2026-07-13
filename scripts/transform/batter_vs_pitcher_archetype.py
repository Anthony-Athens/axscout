from __future__ import annotations

import numpy as np
import pandas as pd

from scripts.transform.pitcher_pitch_profiles import (
    CSW_DESCRIPTIONS,
    SWING_DESCRIPTIONS,
    WHIFF_DESCRIPTIONS,
)

HIT_EVENTS = {"single", "double", "triple", "home_run"}
WALK_EVENTS = {"walk", "intent_walk"}
STRIKEOUT_EVENTS = {"strikeout", "strikeout_double_play"}
AT_BAT_EVENTS = HIT_EVENTS | STRIKEOUT_EVENTS | {
    "field_error", "field_out", "fielders_choice", "fielders_choice_out",
    "force_out", "grounded_into_double_play", "double_play", "triple_play",
}
PLATE_APPEARANCE_EVENTS = AT_BAT_EVENTS | WALK_EVENTS | {
    "hit_by_pitch", "sac_fly", "sac_fly_double_play", "sac_bunt",
    "catcher_interf",
}


def sample_quality(plate_appearances: int, threshold: int) -> str:
    if plate_appearances < threshold:
        return "low"
    if plate_appearances < threshold * 2:
        return "medium"
    return "high"


def _divide(numerator: float | int, denominator: float | int) -> float | None:
    return None if denominator == 0 else float(numerator / denominator)


def _mean(values: pd.Series) -> float | None:
    numeric = pd.to_numeric(values, errors="coerce")
    result = numeric.mean()
    return None if pd.isna(result) else float(result)


def attach_primary_archetypes(
    statcast_data: pd.DataFrame,
    memberships: list[dict],
) -> pd.DataFrame:
    if statcast_data.empty or "pitcher" not in statcast_data or not memberships:
        return pd.DataFrame()
    primary = {
        int(row["mlb_player_id"]): str(row["archetype_id"])
        for row in memberships
        if row.get("is_primary", True)
    }
    data = statcast_data.copy()
    data["pitcher"] = pd.to_numeric(data["pitcher"], errors="coerce")
    data["archetype_id"] = data["pitcher"].map(primary)
    return data.loc[data["archetype_id"].notna()].copy()


def _metric_row(group: pd.DataFrame, minimum_pa: int) -> dict[str, object]:
    events = group["events"].fillna("").astype(str)
    descriptions = group["description"].fillna("").astype(str)
    pa_events = events[events.isin(PLATE_APPEARANCE_EVENTS)]
    plate_appearances = len(pa_events)
    at_bats = int(pa_events.isin(AT_BAT_EVENTS).sum())
    singles = int(pa_events.eq("single").sum())
    doubles = int(pa_events.eq("double").sum())
    triples = int(pa_events.eq("triple").sum())
    home_runs = int(pa_events.eq("home_run").sum())
    hits = singles + doubles + triples + home_runs
    walks = int(pa_events.isin(WALK_EVENTS).sum())
    strikeouts = int(pa_events.isin(STRIKEOUT_EVENTS).sum())
    hit_by_pitch = int(pa_events.eq("hit_by_pitch").sum())
    sacrifice_flies = int(pa_events.isin({"sac_fly", "sac_fly_double_play"}).sum())
    batting_average = _divide(hits, at_bats)
    obp = _divide(hits + walks + hit_by_pitch, at_bats + walks + hit_by_pitch + sacrifice_flies)
    slugging = _divide(singles + doubles * 2 + triples * 3 + home_runs * 4, at_bats)
    swings = descriptions.isin(SWING_DESCRIPTIONS)
    batted_balls = group["type"].fillna("").eq("X")
    launch_speed = pd.to_numeric(group["launch_speed"], errors="coerce")
    batted_with_speed = batted_balls & launch_speed.notna()
    return {
        "plate_appearances": plate_appearances, "at_bats": at_bats,
        "hits": hits, "singles": singles, "doubles": doubles,
        "triples": triples, "home_runs": home_runs, "walks": walks,
        "strikeouts": strikeouts, "hit_by_pitch": hit_by_pitch,
        "sacrifice_flies": sacrifice_flies, "batting_average": batting_average,
        "on_base_percentage": obp, "slugging_percentage": slugging,
        "ops": obp + slugging if obp is not None and slugging is not None else None,
        "isolated_power": slugging - batting_average if slugging is not None and batting_average is not None else None,
        "strikeout_rate": _divide(strikeouts, plate_appearances),
        "walk_rate": _divide(walks, plate_appearances),
        "whiff_rate": _divide(int(descriptions.isin(WHIFF_DESCRIPTIONS).sum()), int(swings.sum())),
        "csw_rate": _divide(int(descriptions.isin(CSW_DESCRIPTIONS).sum()), len(group)),
        "avg_exit_velocity": _mean(group["launch_speed"]),
        "hard_hit_rate": _divide(int((batted_with_speed & launch_speed.ge(95)).sum()), int(batted_with_speed.sum())),
        "barrel_rate": _divide(int((batted_balls & pd.to_numeric(group["launch_speed_angle"], errors="coerce").eq(6)).sum()), int(batted_balls.sum())),
        "xwoba": _mean(group["estimated_woba_using_speedangle"]),
        "woba": _mean(group.loc[events.isin(PLATE_APPEARANCE_EVENTS), "woba_value"]),
        "run_value": float(pd.to_numeric(group["delta_run_exp"], errors="coerce").sum(min_count=1)) if pd.to_numeric(group["delta_run_exp"], errors="coerce").notna().any() else None,
        "sample_quality": sample_quality(plate_appearances, minimum_pa),
    }


def prepare_matchup_statcast(data: pd.DataFrame) -> pd.DataFrame:
    required = {"batter", "archetype_id"}
    if data.empty or not required.issubset(data.columns):
        return pd.DataFrame()
    prepared = data.copy()
    for column in ["events", "description", "type", "launch_speed", "launch_speed_angle", "estimated_woba_using_speedangle", "woba_value", "delta_run_exp"]:
        if column not in prepared:
            prepared[column] = np.nan
    prepared["mlb_batter_id"] = pd.to_numeric(prepared["batter"], errors="coerce")
    prepared = prepared.loc[prepared["mlb_batter_id"].notna()].copy()
    prepared["mlb_batter_id"] = prepared["mlb_batter_id"].astype(int)
    return prepared


def build_batter_vs_archetype_rows(
    data: pd.DataFrame, season: int, period_start: str, period_end: str,
    model_version: str, feature_version: str, minimum_pa: int,
) -> list[dict]:
    prepared = prepare_matchup_statcast(data)
    if prepared.empty:
        return []
    rows = []
    for (batter_id, archetype_id), group in prepared.groupby(["mlb_batter_id", "archetype_id"], sort=True):
        rows.append({
            "mlb_batter_id": int(batter_id), "season": season,
            "period_start": period_start, "period_end": period_end,
            "archetype_id": str(archetype_id), "model_version": model_version,
            "feature_version": feature_version, **_metric_row(group, minimum_pa),
        })
    return rows
