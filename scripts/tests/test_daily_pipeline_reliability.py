import contextlib
import io
import unittest
from unittest.mock import patch

from scripts import pipeline
from scripts.extract import mlb_schedule


class DailyPipelineReliabilityTests(unittest.TestCase):
    def test_required_failure_has_named_sanitized_traceback_and_nonzero_exit(self):
        output = io.StringIO()

        def fail():
            raise RuntimeError("apiKey=topsecret request timed out")

        with patch.object(pipeline, "ODDS_API_KEY", "topsecret"):
            with contextlib.redirect_stdout(output):
                with self.assertRaises(SystemExit) as raised:
                    pipeline.run_pipeline("Test Required", fail)

        self.assertEqual(raised.exception.code, 1)
        self.assertIn("Pipeline: Test Required", output.getvalue())
        self.assertIn("Traceback (most recent call last)", output.getvalue())
        self.assertIn("Pipeline elapsed: Test Required", output.getvalue())
        self.assertNotIn("topsecret", output.getvalue())

    def test_optional_false_does_not_exit(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertFalse(
                pipeline.run_pipeline("Optional", lambda: False, optional=True)
            )

    def test_schedule_retries_only_transient_get_failures(self):
        with patch.object(mlb_schedule.requests, "Session") as session_class:
            session = session_class.return_value.__enter__.return_value
            session.get.return_value.json.return_value = {"dates": []}
            self.assertEqual(mlb_schedule.fetch_mlb_schedule("2026-09-17", "2026-09-17"), {"dates": []})
            retry = session.mount.call_args.args[1].max_retries
        self.assertEqual(retry.total, 2)
        self.assertEqual(set(retry.allowed_methods), {"GET"})
        self.assertEqual(retry.status_forcelist, (429, 500, 502, 503, 504))


if __name__ == "__main__":
    unittest.main()
