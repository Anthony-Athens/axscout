import unittest
from unittest.mock import Mock

from scripts.utils.mlb_people import fetch_mlb_player_metadata


class MlbPeopleMetadataTests(unittest.TestCase):
    def test_extracts_pitch_hand_and_name(self):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "people": [
                {
                    "fullName": "Paul Skenes",
                    "pitchHand": {"code": "R"},
                }
            ]
        }
        session = Mock()
        session.get.return_value = response

        metadata = fetch_mlb_player_metadata(694973, session=session)

        self.assertEqual(
            metadata,
            {"full_name": "Paul Skenes", "throws": "R"},
        )
        session.get.assert_called_once()

    def test_rejects_unknown_pitch_hand_code(self):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "people": [
                {
                    "fullName": "Example Pitcher",
                    "pitchHand": {"code": "unknown"},
                }
            ]
        }
        session = Mock()
        session.get.return_value = response

        metadata = fetch_mlb_player_metadata(1, session=session)

        self.assertIsNotNone(metadata)
        self.assertIsNone(metadata["throws"] if metadata else None)


if __name__ == "__main__":
    unittest.main()
