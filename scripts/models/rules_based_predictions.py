from dataclasses import dataclass

MODEL_NAME = "rules_based_v1"
MODEL_VERSION = "0.2.0"

ARCHETYPE_TEAM_ADJUSTMENT_CAP = 3.0
ARCHETYPE_GAME_ADJUSTMENT_CAP = 4.0


@dataclass(frozen=True)
class ScoreComponent:
    label: str
    value: float


def _number(value) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _relative_component(
    label: str,
    home_value,
    away_value,
    scale: float,
    cap: float,
    *,
    lower_is_better: bool = False,
) -> ScoreComponent:
    home = _number(home_value)
    away = _number(away_value)
    if home is None or away is None:
        return ScoreComponent(label, 0.0)
    difference = away - home if lower_is_better else home - away
    return ScoreComponent(label, _clamp(difference / scale * cap, -cap, cap))


def american_implied_probability(odds) -> float | None:
    value = _number(odds)
    if value is None or value == 0:
        return None
    if value < 0:
        absolute = abs(value)
        return absolute / (absolute + 100.0)
    return 100.0 / (value + 100.0)


def _team_archetype_matchup_adjustment(feature: dict, side: str) -> float:
    quality = str(
        feature.get(f"{side}_offense_matchup_sample_quality") or ""
    ).lower()
    if quality not in {"medium", "high"}:
        return 0.0

    signals = [
        ("ops", 0.720, 0.080, 1.20, False),
        ("xwoba", 0.320, 0.040, 1.00, False),
        ("strikeout_rate", 0.230, 0.080, 0.50, True),
        ("walk_rate", 0.085, 0.050, 0.30, False),
    ]
    score = 0.0
    for name, baseline, scale, weight, lower_is_better in signals:
        value = _number(feature.get(f"{side}_offense_matchup_{name}"))
        if value is None:
            continue
        difference = baseline - value if lower_is_better else value - baseline
        score += _clamp(difference / scale, -1.0, 1.0) * weight

    sample_weight = 0.5 if quality == "medium" else 1.0
    return _clamp(
        score * sample_weight,
        -ARCHETYPE_TEAM_ADJUSTMENT_CAP,
        ARCHETYPE_TEAM_ADJUSTMENT_CAP,
    )


def archetype_matchup_adjustment(feature: dict) -> float:
    """Return a home-edge point adjustment, capped at four percentage points."""
    home_adjustment = _team_archetype_matchup_adjustment(feature, "home")
    away_adjustment = _team_archetype_matchup_adjustment(feature, "away")
    return _clamp(
        home_adjustment - away_adjustment,
        -ARCHETYPE_GAME_ADJUSTMENT_CAP,
        ARCHETYPE_GAME_ADJUSTMENT_CAP,
    )


def _market_edge_summary(
    home_probability: float,
    away_probability: float,
    implied_home: float | None,
    implied_away: float | None,
) -> str:
    if implied_home is None or implied_away is None:
        return "No market line available"
    if home_probability > implied_home + 0.03:
        return "AXScout stronger than market on home team"
    if away_probability > implied_away + 0.03:
        return "AXScout stronger than market on away team"
    return "Aligned with market"


def _explanation(
    winner: str,
    home_team: str,
    components: list[ScoreComponent],
) -> str:
    direction = 1 if winner == home_team else -1
    labels = [
        component.label
        for component in sorted(
            components,
            key=lambda component: abs(component.value),
            reverse=True,
        )
        if component.value * direction > 0.05
    ][:3]
    if not labels:
        return (
            f"AXScout gives {winner} a narrow lean after balancing the "
            "available team, starter, and availability signals."
        )
    if len(labels) == 1:
        reason_text = labels[0]
    else:
        reason_text = ", ".join(labels[:-1]) + f", and {labels[-1]}"
    return f"AXScout favors {winner} due to {reason_text}."


def build_prediction(feature: dict) -> dict:
    home_team = feature["home_team"]
    away_team = feature["away_team"]
    components = [
        ScoreComponent("home-field advantage", 2.0),
        _relative_component(
            "stronger season record",
            feature.get("home_win_pct"),
            feature.get("away_win_pct"),
            0.15,
            6.0,
        ),
        _relative_component(
            "better season run differential",
            feature.get("home_run_diff_per_game"),
            feature.get("away_run_diff_per_game"),
            2.0,
            6.0,
        ),
        _relative_component(
            "stronger rolling 14 form",
            feature.get("home_rolling_14_win_pct"),
            feature.get("away_rolling_14_win_pct"),
            0.20,
            8.0,
        ),
        _relative_component(
            "better recent run differential",
            feature.get("home_rolling_14_run_diff_per_game"),
            feature.get("away_rolling_14_run_diff_per_game"),
            2.0,
            6.0,
        ),
        _relative_component(
            "stronger last 7-day offense",
            feature.get("home_rolling_7_ops"),
            feature.get("away_rolling_7_ops"),
            0.20,
            5.0,
        ),
        _relative_component(
            "better last 7-day run prevention",
            feature.get("home_rolling_7_era"),
            feature.get("away_rolling_7_era"),
            3.0,
            5.0,
            lower_is_better=True,
        ),
        _relative_component(
            "a probable starter ERA advantage",
            feature.get("home_starter_era"),
            feature.get("away_starter_era"),
            3.0,
            6.0,
            lower_is_better=True,
        ),
        _relative_component(
            "a probable starter WHIP advantage",
            feature.get("home_starter_whip"),
            feature.get("away_starter_whip"),
            0.50,
            2.0,
            lower_is_better=True,
        ),
        ScoreComponent(
            "a favorable pitcher-archetype matchup",
            archetype_matchup_adjustment(feature),
        ),
        _relative_component(
            "fewer active injuries",
            feature.get("home_active_injuries"),
            feature.get("away_active_injuries"),
            4.0,
            4.0,
            lower_is_better=True,
        ),
    ]
    home_edge = sum(component.value for component in components)
    home_probability = round(_clamp(0.50 + home_edge / 100.0, 0.35, 0.65), 5)
    away_probability = round(1.0 - home_probability, 5)
    predicted_winner = home_team if home_probability >= 0.50 else away_team
    predicted_loser = away_team if predicted_winner == home_team else home_team
    confidence_score = round(abs(home_probability - 0.50) * 100.0, 2)
    confidence = (
        "Low"
        if confidence_score < 4.0
        else "Medium"
        if confidence_score <= 8.0
        else "High"
    )
    implied_home = american_implied_probability(feature.get("home_moneyline"))
    implied_away = american_implied_probability(feature.get("away_moneyline"))
    market_favorite = None
    if implied_home is not None and implied_away is not None:
        market_favorite = home_team if implied_home >= implied_away else away_team

    return {
        "mlb_game_pk": feature["mlb_game_pk"],
        "game_date": feature["game_date"],
        "home_team": home_team,
        "away_team": away_team,
        "predicted_winner": predicted_winner,
        "predicted_loser": predicted_loser,
        "home_win_probability": home_probability,
        "away_win_probability": away_probability,
        "confidence": confidence,
        "confidence_score": confidence_score,
        "axscout_lean": predicted_winner,
        "market_favorite": market_favorite,
        "market_sportsbook": feature.get("sportsbook"),
        "market_home_moneyline": feature.get("home_moneyline"),
        "market_away_moneyline": feature.get("away_moneyline"),
        "implied_home_probability": round(implied_home, 5)
        if implied_home is not None
        else None,
        "implied_away_probability": round(implied_away, 5)
        if implied_away is not None
        else None,
        "edge_summary": _market_edge_summary(
            home_probability,
            away_probability,
            implied_home,
            implied_away,
        ),
        "explanation": _explanation(predicted_winner, home_team, components),
        "home_starter_archetype_name": feature.get(
            "home_starter_archetype_name"
        ),
        "away_starter_archetype_name": feature.get(
            "away_starter_archetype_name"
        ),
        "home_offense_matchup_ops": feature.get(
            "home_offense_matchup_ops"
        ),
        "home_offense_matchup_xwoba": feature.get(
            "home_offense_matchup_xwoba"
        ),
        "home_offense_matchup_sample_quality": feature.get(
            "home_offense_matchup_sample_quality"
        ),
        "away_offense_matchup_ops": feature.get(
            "away_offense_matchup_ops"
        ),
        "away_offense_matchup_xwoba": feature.get(
            "away_offense_matchup_xwoba"
        ),
        "away_offense_matchup_sample_quality": feature.get(
            "away_offense_matchup_sample_quality"
        ),
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "prediction_status": "active",
        "source_snapshot_at": feature.get("source_snapshot_at"),
    }


def build_predictions(features: list[dict]) -> list[dict]:
    return [build_prediction(feature) for feature in features]
