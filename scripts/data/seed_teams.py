import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

TEAMS = [
    {"mlb_team_id": 109, "abbreviation": "ARI", "name": "Arizona Diamondbacks", "league": "NL", "division": "West"},
    {"mlb_team_id": 144, "abbreviation": "ATL", "name": "Atlanta Braves", "league": "NL", "division": "East"},
    {"mlb_team_id": 110, "abbreviation": "BAL", "name": "Baltimore Orioles", "league": "AL", "division": "East"},
    {"mlb_team_id": 111, "abbreviation": "BOS", "name": "Boston Red Sox", "league": "AL", "division": "East"},
    {"mlb_team_id": 112, "abbreviation": "CHC", "name": "Chicago Cubs", "league": "NL", "division": "Central"},
    {"mlb_team_id": 145, "abbreviation": "CWS", "name": "Chicago White Sox", "league": "AL", "division": "Central"},
    {"mlb_team_id": 113, "abbreviation": "CIN", "name": "Cincinnati Reds", "league": "NL", "division": "Central"},
    {"mlb_team_id": 114, "abbreviation": "CLE", "name": "Cleveland Guardians", "league": "AL", "division": "Central"},
    {"mlb_team_id": 115, "abbreviation": "COL", "name": "Colorado Rockies", "league": "NL", "division": "West"},
    {"mlb_team_id": 116, "abbreviation": "DET", "name": "Detroit Tigers", "league": "AL", "division": "Central"},
    {"mlb_team_id": 117, "abbreviation": "HOU", "name": "Houston Astros", "league": "AL", "division": "West"},
    {"mlb_team_id": 118, "abbreviation": "KC", "name": "Kansas City Royals", "league": "AL", "division": "Central"},
    {"mlb_team_id": 108, "abbreviation": "LAA", "name": "Los Angeles Angels", "league": "AL", "division": "West"},
    {"mlb_team_id": 119, "abbreviation": "LAD", "name": "Los Angeles Dodgers", "league": "NL", "division": "West"},
    {"mlb_team_id": 146, "abbreviation": "MIA", "name": "Miami Marlins", "league": "NL", "division": "East"},
    {"mlb_team_id": 158, "abbreviation": "MIL", "name": "Milwaukee Brewers", "league": "NL", "division": "Central"},
    {"mlb_team_id": 142, "abbreviation": "MIN", "name": "Minnesota Twins", "league": "AL", "division": "Central"},
    {"mlb_team_id": 121, "abbreviation": "NYM", "name": "New York Mets", "league": "NL", "division": "East"},
    {"mlb_team_id": 147, "abbreviation": "NYY", "name": "New York Yankees", "league": "AL", "division": "East"},
    {"mlb_team_id": 133, "abbreviation": "ATH", "name": "Athletics", "league": "AL", "division": "West"},
    {"mlb_team_id": 143, "abbreviation": "PHI", "name": "Philadelphia Phillies", "league": "NL", "division": "East"},
    {"mlb_team_id": 134, "abbreviation": "PIT", "name": "Pittsburgh Pirates", "league": "NL", "division": "Central"},
    {"mlb_team_id": 135, "abbreviation": "SD", "name": "San Diego Padres", "league": "NL", "division": "West"},
    {"mlb_team_id": 137, "abbreviation": "SF", "name": "San Francisco Giants", "league": "NL", "division": "West"},
    {"mlb_team_id": 136, "abbreviation": "SEA", "name": "Seattle Mariners", "league": "AL", "division": "West"},
    {"mlb_team_id": 138, "abbreviation": "STL", "name": "St. Louis Cardinals", "league": "NL", "division": "Central"},
    {"mlb_team_id": 139, "abbreviation": "TB", "name": "Tampa Bay Rays", "league": "AL", "division": "East"},
    {"mlb_team_id": 140, "abbreviation": "TEX", "name": "Texas Rangers", "league": "AL", "division": "West"},
    {"mlb_team_id": 141, "abbreviation": "TOR", "name": "Toronto Blue Jays", "league": "AL", "division": "East"},
    {"mlb_team_id": 120, "abbreviation": "WSH", "name": "Washington Nationals", "league": "NL", "division": "East"},
]

def main():
    result = supabase.table("teams").upsert(
        TEAMS,
        on_conflict="mlb_team_id",
    ).execute()

    print(f"Seeded {len(TEAMS)} MLB teams.")
    print(result)

if __name__ == "__main__":
    main()