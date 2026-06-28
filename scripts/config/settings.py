import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"

GAMES_LOOKBACK_DAYS = int(os.getenv("GAMES_LOOKBACK_DAYS", "7"))
GAMES_LOOKAHEAD_DAYS = int(os.getenv("GAMES_LOOKAHEAD_DAYS", "7"))

STATCAST_LOOKBACK_DAYS = int(os.getenv("STATCAST_LOOKBACK_DAYS", "30"))
ENABLE_TEAM_WEEKLY_STATCAST = (
    os.getenv("ENABLE_TEAM_WEEKLY_STATCAST", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)

PLAYER_STATCAST_LOOKBACK_DAYS = int(
    os.getenv("PLAYER_STATCAST_LOOKBACK_DAYS", "30")
)
ENABLE_PLAYER_STATCAST = (
    os.getenv("ENABLE_PLAYER_STATCAST", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
