import unittest

from scripts.models.rules_based_predictions import (
    ARCHETYPE_GAME_ADJUSTMENT_CAP,
    ARCHETYPE_TEAM_ADJUSTMENT_CAP,
    archetype_matchup_adjustment,
    build_prediction,
)
from scripts.transform.prediction_features import build_prediction_features


def matchup_feature(
    home_quality: str | None = None,
    away_quality: str | None = None,
) -> dict:
    return {
        "home_offense_matchup_sample_quality": home_quality,
        "home_offense_matchup_ops": 0.900,
        "home_offense_matchup_xwoba": 0.390,
        "home_offense_matchup_strikeout_rate": 0.150,
        "home_offense_matchup_walk_rate": 0.140,
        "away_offense_matchup_sample_quality": away_quality,
        "away_offense_matchup_ops": 0.550,
        "away_offense_matchup_xwoba": 0.250,
        "away_offense_matchup_strikeout_rate": 0.330,
        "away_offense_matchup_walk_rate": 0.030,
    }


class PredictionArchetypeMatchupTests(unittest.TestCase):
    def test_feature_builder_joins_opposing_offense_to_starter_archetype(self):
        result = build_prediction_features(
            fact_games=[{
                "mlb_game_pk": 1,
                "game_date": "2026-07-13",
                "home_team_key": 10,
                "away_team_key": 20,
                "home_probable_pitcher_mlb_id": 100,
                "away_probable_pitcher_mlb_id": 200,
            }],
            dim_teams=[
                {"team_key": 10, "abbreviation": "NYY"},
                {"team_key": 20, "abbreviation": "BOS"},
            ],
            team_season=[],
            team_offense_season=[],
            team_pitching_season=[],
            team_rolling_14=[],
            team_offense_rolling_7=[],
            team_pitching_rolling_7=[],
            player_pitching_season=[],
            active_injuries=[],
            odds_snapshots=[],
            pitcher_profiles=[
                {
                    "mlb_player_id": 100,
                    "season": 2026,
                    "period_end": "2026-07-12",
                    "primary_archetype_id": "a-home",
                    "model_version": "pitcher_archetypes_v1",
                },
                {
                    "mlb_player_id": 200,
                    "season": 2026,
                    "period_end": "2026-07-12",
                    "primary_archetype_id": "a-away",
                    "model_version": "pitcher_archetypes_v1",
                },
            ],
            pitcher_archetypes=[
                {"archetype_id": "a-home", "archetype_name": "Archetype 1"},
                {"archetype_id": "a-away", "archetype_name": "Archetype 2"},
            ],
            team_archetype_matchups=[{
                "team_abbreviation": "NYY",
                "season": 2026,
                "period_end": "2026-07-12",
                "archetype_id": "a-away",
                "model_version": "pitcher_archetypes_v1",
                "plate_appearances": 75,
                "ops": 0.810,
                "xwoba": 0.350,
                "strikeout_rate": 0.210,
                "walk_rate": 0.100,
                "sample_quality": "medium",
            }],
        )
        feature = result.features[0]
        self.assertEqual(feature["away_starter_archetype_name"], "Archetype 2")
        self.assertEqual(feature["home_offense_matchup_ops"], 0.810)
        self.assertIsNone(feature["away_offense_matchup_ops"])

    def test_missing_matchup_data_is_neutral(self):
        self.assertEqual(archetype_matchup_adjustment({}), 0.0)

        prediction = build_prediction({
            "mlb_game_pk": 1,
            "game_date": "2026-07-13",
            "home_team": "NYY",
            "away_team": "BOS",
        })
        self.assertIsNone(prediction["home_starter_archetype_name"])
        self.assertIsNone(prediction["away_offense_matchup_ops"])

    def test_low_samples_are_ignored(self):
        feature = matchup_feature("low", "low")
        self.assertEqual(archetype_matchup_adjustment(feature), 0.0)

    def test_medium_sample_is_discounted(self):
        medium = archetype_matchup_adjustment(matchup_feature("medium"))
        high = archetype_matchup_adjustment(matchup_feature("high"))
        self.assertGreater(medium, 0.0)
        self.assertAlmostEqual(medium, high / 2.0)
        self.assertLessEqual(medium, ARCHETYPE_TEAM_ADJUSTMENT_CAP / 2.0)

    def test_high_sample_team_adjustment_is_bounded(self):
        adjustment = archetype_matchup_adjustment(matchup_feature("high"))
        self.assertGreater(adjustment, 0.0)
        self.assertLessEqual(adjustment, ARCHETYPE_TEAM_ADJUSTMENT_CAP)

    def test_opposing_team_signals_respect_total_game_cap(self):
        adjustment = archetype_matchup_adjustment(
            matchup_feature("high", "high")
        )
        self.assertEqual(adjustment, ARCHETYPE_GAME_ADJUSTMENT_CAP)


if __name__ == "__main__":
    unittest.main()
