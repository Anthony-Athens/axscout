from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

MODEL_FEATURES = (
    "primary_pitch_usage", "secondary_pitch_usage", "pitch_type_count",
    "fastball_velocity", "fastball_family_usage", "breaking_ball_usage",
    "offspeed_usage", "arsenal_velocity_spread",
    "primary_secondary_velocity_difference", "horizontal_movement_range",
    "vertical_movement_range", "pitch_mix_entropy", "overall_whiff_rate",
    "overall_csw_rate", "overall_xwoba_allowed",
)


@dataclass(frozen=True)
class PitcherFeatureMatrix:
    player_ids: np.ndarray
    values: np.ndarray
    feature_names: tuple[str, ...]
    display_frame: pd.DataFrame


def build_pitcher_feature_matrix(rows: list[dict]) -> PitcherFeatureMatrix:
    frame = pd.DataFrame(rows).sort_values("mlb_player_id").reset_index(drop=True)
    if frame.empty:
        return PitcherFeatureMatrix(np.array([]), np.empty((0, 0)), (), frame)
    numeric = frame.loc[:, MODEL_FEATURES].apply(pd.to_numeric, errors="coerce")
    # All-missing features contain no model signal and cannot be median-imputed.
    available = [column for column in MODEL_FEATURES if numeric[column].notna().any()]
    if not available:
        raise ValueError("Pitcher feature rows contain no usable numeric features.")
    imputer = SimpleImputer(strategy="median", add_indicator=True)
    imputed = imputer.fit_transform(numeric[available])
    names = tuple(str(name) for name in imputer.get_feature_names_out(available))
    scaled = StandardScaler().fit_transform(imputed)
    return PitcherFeatureMatrix(
        frame["mlb_player_id"].to_numpy(dtype=int), scaled, names, frame
    )
