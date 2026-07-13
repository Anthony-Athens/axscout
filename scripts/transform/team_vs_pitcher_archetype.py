import pandas as pd

from scripts.transform.batter_vs_pitcher_archetype import (
    _metric_row,
    prepare_matchup_statcast,
)
from scripts.utils.mlb_teams import normalize_team_abbreviation


def build_team_vs_archetype_rows(
    data: pd.DataFrame, season: int, period_start: str, period_end: str,
    model_version: str, feature_version: str, minimum_pa: int,
) -> list[dict]:
    prepared = prepare_matchup_statcast(data)
    if prepared.empty or not {"home_team", "away_team", "inning_topbot"}.issubset(prepared.columns):
        return []
    prepared["team_abbreviation"] = prepared["home_team"].where(
        prepared["inning_topbot"].fillna("").eq("Bot"),
        prepared["away_team"],
    )
    prepared["team_abbreviation"] = prepared["team_abbreviation"].map(
        normalize_team_abbreviation
    )
    prepared = prepared.loc[prepared["team_abbreviation"].notna()].copy()
    rows = []
    for (team, archetype_id), group in prepared.groupby(["team_abbreviation", "archetype_id"], sort=True):
        rows.append({
            "team_abbreviation": str(team), "season": season,
            "period_start": period_start, "period_end": period_end,
            "archetype_id": str(archetype_id), "model_version": model_version,
            "feature_version": feature_version, **_metric_row(group, minimum_pa),
        })
    return rows
