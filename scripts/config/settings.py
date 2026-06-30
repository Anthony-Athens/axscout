import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"
MLB_PEOPLE_URL_TEMPLATE = "https://statsapi.mlb.com/api/v1/people/{mlb_player_id}"
MLB_STATS_URL = "https://statsapi.mlb.com/api/v1/stats"
MLB_API_URL = "https://statsapi.mlb.com/api/v1"

GAMES_LOOKBACK_DAYS = int(os.getenv("GAMES_LOOKBACK_DAYS", "7"))
GAMES_LOOKAHEAD_DAYS = int(os.getenv("GAMES_LOOKAHEAD_DAYS", "7"))

SEASON_START_DATE = os.getenv("SEASON_START_DATE", "").strip() or None
SEASON_END_DATE = os.getenv("SEASON_END_DATE", "").strip() or None
STATCAST_START_DATE = os.getenv("STATCAST_START_DATE", "").strip() or None
STATCAST_END_DATE = os.getenv("STATCAST_END_DATE", "").strip() or None

STATCAST_LOOKBACK_DAYS = int(os.getenv("STATCAST_LOOKBACK_DAYS", "30"))
ENABLE_TEAM_WEEKLY_STATCAST = (
    os.getenv("ENABLE_TEAM_WEEKLY_STATCAST", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
ENABLE_TEAM_OFFENSE_SEASON = (
    os.getenv("ENABLE_TEAM_OFFENSE_SEASON", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)

PLAYER_STATCAST_LOOKBACK_DAYS = int(
    os.getenv("PLAYER_STATCAST_LOOKBACK_DAYS", "30")
)
ENABLE_PLAYER_STATCAST = (
    os.getenv("ENABLE_PLAYER_STATCAST", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
ROLLING_7_START_DATE = os.getenv("ROLLING_7_START_DATE", "").strip() or None
ROLLING_7_END_DATE = os.getenv("ROLLING_7_END_DATE", "").strip() or None
ENABLE_PLAYER_ROLLING_7 = (
    os.getenv("ENABLE_PLAYER_ROLLING_7", "true").strip().lower()
    in {"1", "true", "yes", "on"}
)
ENABLE_PLAYER_INJURIES = (
    os.getenv("ENABLE_PLAYER_INJURIES", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)

ENABLE_PITCHING_SUMMARY = (
    os.getenv("ENABLE_PITCHING_SUMMARY", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
PITCHING_SUMMARY_SEASON = (
    int(os.environ["PITCHING_SUMMARY_SEASON"])
    if os.getenv("PITCHING_SUMMARY_SEASON", "").strip()
    else None
)
