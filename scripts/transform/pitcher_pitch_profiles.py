from __future__ import annotations

import math

import numpy as np
import pandas as pd

SWING_DESCRIPTIONS = {
    "blocked_ball",
    "foul",
    "foul_bunt",
    "foul_tip",
    "hit_into_play",
    "missed_bunt",
    "swinging_strike",
    "swinging_strike_blocked",
}
WHIFF_DESCRIPTIONS = {
    "missed_bunt",
    "swinging_strike",
    "swinging_strike_blocked",
}
CSW_DESCRIPTIONS = WHIFF_DESCRIPTIONS | {"called_strike"}
FASTBALL_TYPES = {"FF", "SI", "FC", "FA"}
BREAKING_TYPES = {"SL", "CU", "KC", "SV", "ST"}
OFFSPEED_TYPES = {"CH", "FS", "FO", "SC"}


def _numeric(data: pd.DataFrame, column: str) -> pd.Series:
    if column not in data:
        return pd.Series(np.nan, index=data.index, dtype="float64")
    return pd.to_numeric(data[column], errors="coerce")


def _safe_mean(values: pd.Series) -> float | None:
    result = values.mean()
    return None if pd.isna(result) else float(result)


def _rate(mask: pd.Series, denominator: pd.Series | None = None) -> float | None:
    eligible = denominator if denominator is not None else pd.Series(True, index=mask.index)
    count = int(eligible.fillna(False).sum())
    return None if count == 0 else float(mask.fillna(False)[eligible.fillna(False)].mean())


def prepare_pitcher_statcast(data: pd.DataFrame) -> pd.DataFrame:
    if data.empty or "pitcher" not in data or "pitch_type" not in data:
        return pd.DataFrame()
    prepared = data.loc[data["pitcher"].notna() & data["pitch_type"].notna()].copy()
    prepared["mlb_player_id"] = pd.to_numeric(prepared["pitcher"], errors="coerce")
    prepared = prepared.loc[prepared["mlb_player_id"].notna()].copy()
    prepared["mlb_player_id"] = prepared["mlb_player_id"].astype(int)
    if "description" not in prepared:
        prepared["description"] = ""
    prepared["description"] = prepared["description"].fillna("").astype(str)
    prepared["is_swing"] = prepared["description"].isin(SWING_DESCRIPTIONS)
    prepared["is_whiff"] = prepared["description"].isin(WHIFF_DESCRIPTIONS)
    prepared["is_csw"] = prepared["description"].isin(CSW_DESCRIPTIONS)
    zone = _numeric(prepared, "zone")
    prepared["is_zone"] = zone.between(1, 9)
    return prepared


def _aggregate_pitch_type(group: pd.DataFrame, total: int) -> dict[str, object]:
    velocity = _numeric(group, "release_speed")
    launch_speed = _numeric(group, "launch_speed")
    batted_ball = group.get("type", pd.Series("", index=group.index)).eq("X")
    swings = group["is_swing"]
    return {
        "pitch_name": next((str(value) for value in group.get("pitch_name", []) if pd.notna(value)), None),
        "pitch_count": len(group),
        "usage_rate": len(group) / total,
        "avg_velocity": _safe_mean(velocity),
        "velocity_stddev": _safe_mean((velocity - velocity.mean()) ** 2) ** 0.5 if velocity.notna().sum() > 1 else None,
        "velocity_p90": float(velocity.quantile(0.9)) if velocity.notna().any() else None,
        "avg_spin_rate": _safe_mean(_numeric(group, "release_spin_rate")),
        "avg_spin_axis": _safe_mean(_numeric(group, "spin_axis")),
        "avg_ivb": _safe_mean(_numeric(group, "pfx_z")),
        "avg_horizontal_break": _safe_mean(_numeric(group, "pfx_x")),
        "avg_vaa": None,
        "avg_haa": None,
        "avg_release_height": _safe_mean(_numeric(group, "release_pos_z")),
        "avg_release_side": _safe_mean(_numeric(group, "release_pos_x")),
        "avg_extension": _safe_mean(_numeric(group, "release_extension")),
        "zone_rate": _rate(group["is_zone"]),
        "chase_rate": _rate(swings & ~group["is_zone"], ~group["is_zone"]),
        "whiff_rate": _rate(group["is_whiff"], swings),
        "csw_rate": _rate(group["is_csw"]),
        "ground_ball_rate": _rate(group.get("bb_type", pd.Series("", index=group.index)).eq("ground_ball"), batted_ball),
        "hard_hit_rate": _rate(launch_speed.ge(95), batted_ball & launch_speed.notna()),
        "barrel_rate": _rate(_numeric(group, "launch_speed_angle").eq(6), batted_ball),
        "xwoba_allowed": _safe_mean(_numeric(group, "estimated_woba_using_speedangle")),
    }


def build_pitcher_profiles(
    statcast_data: pd.DataFrame,
    season: int,
    period_start: str,
    period_end: str,
    min_pitches: int,
    feature_version: str,
) -> tuple[list[dict], list[dict]]:
    data = prepare_pitcher_statcast(statcast_data)
    if data.empty:
        return [], []
    counts = data.groupby("mlb_player_id").size()
    eligible = counts[counts >= min_pitches].index
    data = data[data["mlb_player_id"].isin(eligible)]
    pitch_rows: list[dict] = []
    pitcher_rows: list[dict] = []
    for player_id, pitcher in data.groupby("mlb_player_id", sort=True):
        total = len(pitcher)
        arsenal: list[dict] = []
        for pitch_type, pitches in pitcher.groupby("pitch_type", sort=True):
            row = {
                "mlb_player_id": int(player_id), "season": season,
                "period_start": period_start, "period_end": period_end,
                "pitch_type": str(pitch_type), "feature_version": feature_version,
                **_aggregate_pitch_type(pitches, total),
            }
            arsenal.append(row)
            pitch_rows.append(row)
        arsenal.sort(key=lambda row: (-int(row["pitch_count"]), str(row["pitch_type"])))
        primary = arsenal[0]
        secondary = arsenal[1] if len(arsenal) > 1 else None
        velocity_values = [float(row["avg_velocity"]) for row in arsenal if row["avg_velocity"] is not None]
        movement_x = [float(row["avg_horizontal_break"]) for row in arsenal if row["avg_horizontal_break"] is not None]
        movement_z = [float(row["avg_ivb"]) for row in arsenal if row["avg_ivb"] is not None]
        usage = [float(row["usage_rate"]) for row in arsenal]
        pitch_type_usage = lambda types: sum(float(row["usage_rate"]) for row in arsenal if row["pitch_type"] in types)
        fastball_velocities = [float(row["avg_velocity"]) * int(row["pitch_count"]) for row in arsenal if row["pitch_type"] in FASTBALL_TYPES and row["avg_velocity"] is not None]
        fastball_counts = sum(int(row["pitch_count"]) for row in arsenal if row["pitch_type"] in FASTBALL_TYPES and row["avg_velocity"] is not None)
        at_bats = pitcher.get("at_bat_number", pd.Series(dtype=float))
        games = pitcher.get("game_pk", pd.Series(dtype=float))
        batters_faced = len(set(zip(games, at_bats))) if len(at_bats) == len(pitcher) else None
        pitcher_rows.append({
            "mlb_player_id": int(player_id), "season": season, "period_start": period_start,
            "period_end": period_end, "total_pitches": total, "batters_faced": batters_faced,
            "starter_share": None, "primary_pitch_type": primary["pitch_type"],
            "primary_pitch_usage": primary["usage_rate"],
            "secondary_pitch_type": secondary["pitch_type"] if secondary else None,
            "secondary_pitch_usage": secondary["usage_rate"] if secondary else None,
            "pitch_type_count": sum(value >= 0.05 for value in usage),
            "fastball_velocity": sum(fastball_velocities) / fastball_counts if fastball_counts else None,
            "fastball_family_usage": pitch_type_usage(FASTBALL_TYPES),
            "breaking_ball_usage": pitch_type_usage(BREAKING_TYPES), "offspeed_usage": pitch_type_usage(OFFSPEED_TYPES),
            "arsenal_velocity_spread": max(velocity_values) - min(velocity_values) if len(velocity_values) > 1 else None,
            "primary_secondary_velocity_difference": abs(float(primary["avg_velocity"]) - float(secondary["avg_velocity"])) if secondary and primary["avg_velocity"] is not None and secondary["avg_velocity"] is not None else None,
            "horizontal_movement_range": max(movement_x) - min(movement_x) if len(movement_x) > 1 else None,
            "vertical_movement_range": max(movement_z) - min(movement_z) if len(movement_z) > 1 else None,
            "pitch_mix_entropy": -sum(value * math.log(value) for value in usage if value > 0),
            "overall_whiff_rate": _rate(pitcher["is_whiff"], pitcher["is_swing"]),
            "overall_csw_rate": _rate(pitcher["is_csw"]),
            "overall_xwoba_allowed": _safe_mean(_numeric(pitcher, "estimated_woba_using_speedangle")),
            "feature_version": feature_version,
            "full_name": next((str(value) for value in pitcher.get("player_name", []) if pd.notna(value)), None),
        })
    return pitch_rows, pitcher_rows
