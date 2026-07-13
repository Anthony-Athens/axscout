import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"
MLB_PEOPLE_URL_TEMPLATE = "https://statsapi.mlb.com/api/v1/people/{mlb_player_id}"
MLB_STATS_URL = "https://statsapi.mlb.com/api/v1/stats"
MLB_API_URL = "https://statsapi.mlb.com/api/v1"
ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds"

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "").strip() or None
ODDS_API_REGIONS = os.getenv("ODDS_API_REGIONS", "us").strip() or "us"
ODDS_API_MARKETS = (
    os.getenv("ODDS_API_MARKETS", "h2h,spreads,totals").strip()
    or "h2h,spreads,totals"
)
ODDS_API_ODDS_FORMAT = (
    os.getenv("ODDS_API_ODDS_FORMAT", "american").strip() or "american"
)
ODDS_API_DATE_FORMAT = (
    os.getenv("ODDS_API_DATE_FORMAT", "iso").strip() or "iso"
)
ENABLE_ODDS = (
    os.getenv("ENABLE_ODDS", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
ENABLE_PREDICTIONS = (
    os.getenv("ENABLE_PREDICTIONS", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
ENABLE_PREDICTION_TRACKING = (
    os.getenv("ENABLE_PREDICTION_TRACKING", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)

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
TEAM_ROLLING_7_START_DATE = (
    os.getenv("TEAM_ROLLING_7_START_DATE", "").strip() or None
)
TEAM_ROLLING_7_END_DATE = (
    os.getenv("TEAM_ROLLING_7_END_DATE", "").strip() or None
)
ENABLE_TEAM_ROLLING_7 = (
    os.getenv("ENABLE_TEAM_ROLLING_7", "true").strip().lower()
    in {"1", "true", "yes", "on"}
)
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

ENABLE_PITCHER_ARCHETYPES = (
    os.getenv("ENABLE_PITCHER_ARCHETYPES", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
PITCHER_ARCHETYPE_SEASON = int(
    os.getenv("PITCHER_ARCHETYPE_SEASON", str(datetime.now().year))
)
PITCHER_ARCHETYPE_START_DATE = (
    os.getenv("PITCHER_ARCHETYPE_START_DATE", "").strip() or None
)
PITCHER_ARCHETYPE_END_DATE = (
    os.getenv("PITCHER_ARCHETYPE_END_DATE", "").strip() or None
)
PITCHER_ARCHETYPE_MIN_PITCHES = int(
    os.getenv("PITCHER_ARCHETYPE_MIN_PITCHES", "300")
)
PITCHER_ARCHETYPE_CLUSTER_COUNT = int(
    os.getenv("PITCHER_ARCHETYPE_CLUSTER_COUNT", "8")
)
PITCHER_ARCHETYPE_MODEL_VERSION = os.getenv(
    "PITCHER_ARCHETYPE_MODEL_VERSION", "pitcher_archetypes_v1"
).strip()
PITCHER_ARCHETYPE_FEATURE_VERSION = os.getenv(
    "PITCHER_ARCHETYPE_FEATURE_VERSION", "pitcher_features_v1"
).strip()

ENABLE_ARCHETYPE_MATCHUPS = (
    os.getenv("ENABLE_ARCHETYPE_MATCHUPS", "false").strip().lower()
    in {"1", "true", "yes", "on"}
)
ARCHETYPE_MATCHUP_SEASON = int(
    os.getenv("ARCHETYPE_MATCHUP_SEASON", str(datetime.now().year))
)
ARCHETYPE_MATCHUP_START_DATE = (
    os.getenv("ARCHETYPE_MATCHUP_START_DATE", "").strip() or None
)
ARCHETYPE_MATCHUP_END_DATE = (
    os.getenv("ARCHETYPE_MATCHUP_END_DATE", "").strip() or None
)
ARCHETYPE_MATCHUP_MODEL_VERSION = os.getenv(
    "ARCHETYPE_MATCHUP_MODEL_VERSION", "pitcher_archetypes_v1"
).strip()
ARCHETYPE_MATCHUP_FEATURE_VERSION = os.getenv(
    "ARCHETYPE_MATCHUP_FEATURE_VERSION", "archetype_matchups_v1"
).strip()
ARCHETYPE_MATCHUP_MIN_PA_BATTER = int(
    os.getenv("ARCHETYPE_MATCHUP_MIN_PA_BATTER", "20")
)
ARCHETYPE_MATCHUP_MIN_PA_TEAM = int(
    os.getenv("ARCHETYPE_MATCHUP_MIN_PA_TEAM", "50")
)
