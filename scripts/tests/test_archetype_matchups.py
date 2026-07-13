import unittest

import pandas as pd

from scripts.transform.batter_vs_pitcher_archetype import (
    attach_primary_archetypes,
    build_batter_vs_archetype_rows,
    sample_quality,
)
from scripts.transform.team_vs_pitcher_archetype import (
    build_team_vs_archetype_rows,
)


class ArchetypeMatchupTests(unittest.TestCase):
    def setUp(self):
        self.data = pd.DataFrame({
            "pitcher": [10, 10, 10, 10], "batter": [20, 20, 20, 20],
            "archetype_id": ["a1"] * 4,
            "events": ["single", "double", "walk", "strikeout"],
            "description": ["hit_into_play", "hit_into_play", "ball", "swinging_strike"],
            "type": ["X", "X", "B", "S"], "launch_speed": [90.0, 100.0, None, None],
            "launch_speed_angle": [4, 6, None, None],
            "estimated_woba_using_speedangle": [0.4, 0.6, None, None],
            "woba_value": [0.9, 1.25, 0.7, 0.0],
            "delta_run_exp": [0.2, 0.4, 0.1, -0.2],
            "home_team": ["NYY"] * 4, "away_team": ["BOS"] * 4,
            "inning_topbot": ["Top"] * 4,
        })

    def test_batting_rates(self):
        rows = build_batter_vs_archetype_rows(
            self.data, 2026, "2026-04-01", "2026-04-30", "model-v1", "features-v1", 4
        )
        row = rows[0]
        self.assertAlmostEqual(row["batting_average"], 2 / 3)
        self.assertAlmostEqual(row["on_base_percentage"], 0.75)
        self.assertAlmostEqual(row["slugging_percentage"], 1.0)
        self.assertAlmostEqual(row["ops"], 1.75)
        self.assertAlmostEqual(row["whiff_rate"], 1 / 3)
        self.assertEqual(row["sample_quality"], "medium")

    def test_team_assignment_and_empty_results(self):
        rows = build_team_vs_archetype_rows(
            self.data, 2026, "2026-04-01", "2026-04-30", "model-v1", "features-v1", 10
        )
        self.assertEqual(rows[0]["team_abbreviation"], "BOS")
        self.assertEqual(rows[0]["sample_quality"], "low")
        self.assertEqual(build_batter_vs_archetype_rows(pd.DataFrame(), 2026, "a", "b", "m", "f", 20), [])

    def test_sample_quality_and_missing_membership(self):
        self.assertEqual(sample_quality(19, 20), "low")
        self.assertEqual(sample_quality(20, 20), "medium")
        self.assertEqual(sample_quality(40, 20), "high")
        source = self.data.drop(columns="archetype_id")
        self.assertTrue(attach_primary_archetypes(source, []).empty)
        joined = attach_primary_archetypes(source, [{"mlb_player_id": 10, "archetype_id": "a1", "is_primary": True}])
        self.assertEqual(set(joined["archetype_id"]), {"a1"})


if __name__ == "__main__":
    unittest.main()
