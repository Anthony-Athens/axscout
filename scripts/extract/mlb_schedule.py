import requests

from scripts.config.settings import MLB_SCHEDULE_URL


def fetch_mlb_schedule(start_date: str, end_date: str) -> dict:
    params = {
        "sportId": 1,
        "startDate": start_date,
        "endDate": end_date,
        "hydrate": "team,linescore",
    }

    response = requests.get(MLB_SCHEDULE_URL, params=params, timeout=30)
    response.raise_for_status()

    return response.json()