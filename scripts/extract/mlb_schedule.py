import requests

from scripts.config.settings import MLB_SCHEDULE_URL


def fetch_mlb_schedule(start_date: str, end_date: str) -> dict:
    params = {
        "sportId": 1,
        "gameType": "R",
        "startDate": start_date,
        "endDate": end_date,
        "hydrate": "team,linescore,probablePitcher",
    }

    response = requests.get(MLB_SCHEDULE_URL, params=params, timeout=60)
    response.raise_for_status()

    return response.json()
