import unittest

import numpy as np
import pandas as pd

from scripts.models.pitcher_archetypes import cluster_pitchers
from scripts.models.pitcher_similarities import build_pitcher_similarities
from scripts.transform.pitcher_feature_matrix import MODEL_FEATURES, build_pitcher_feature_matrix
from scripts.transform.pitcher_pitch_profiles import build_pitcher_profiles


class PitcherFeatureTests(unittest.TestCase):
    def test_usage_whiff_and_csw_rates(self):
        data = pd.DataFrame({
            "pitcher": [1, 1, 1, 1], "pitch_type": ["FF", "FF", "SL", "SL"],
            "pitch_name": ["4-Seam Fastball", "4-Seam Fastball", "Slider", "Slider"],
            "description": ["swinging_strike", "called_strike", "foul", "ball"],
            "release_speed": [95.0, 96.0, 85.0, np.nan], "zone": [5, 5, 11, 12],
        })
        pitch_rows, pitcher_rows = build_pitcher_profiles(data, 2026, "2026-04-01", "2026-04-02", 1, "v1")
        fastball = next(row for row in pitch_rows if row["pitch_type"] == "FF")
        self.assertEqual(fastball["usage_rate"], 0.5)
        self.assertEqual(fastball["whiff_rate"], 1.0)
        self.assertEqual(fastball["csw_rate"], 1.0)
        self.assertIsNone(next(row for row in pitch_rows if row["pitch_type"] == "SL")["avg_spin_rate"])
        self.assertEqual(len(pitcher_rows), 1)

    def test_feature_matrix_and_model_shapes(self):
        rows = []
        for index in range(6):
            row = {"mlb_player_id": index + 1}
            row.update({feature: float(index + offset) for offset, feature in enumerate(MODEL_FEATURES)})
            row["overall_xwoba_allowed"] = None if index == 0 else row["overall_xwoba_allowed"]
            rows.append(row)
        matrix = build_pitcher_feature_matrix(rows)
        self.assertEqual(matrix.values.shape[0], 6)
        self.assertGreaterEqual(matrix.values.shape[1], len(MODEL_FEATURES))
        model = cluster_pitchers(matrix, 2026, "2026-04-01", "2026-06-30", 2, "model-v1", "features-v1")
        self.assertEqual(len(model.labels), 6)
        self.assertEqual(len(model.memberships), 6)
        similarities = build_pitcher_similarities(matrix, model.labels, 2026, "model-v1", "features-v1", 3)
        self.assertEqual(len(similarities), 18)
        self.assertTrue(all(row["mlb_player_id"] != row["similar_mlb_player_id"] for row in similarities))
        self.assertTrue(all(0 <= row["similarity_score"] <= 1 for row in similarities))


if __name__ == "__main__":
    unittest.main()
