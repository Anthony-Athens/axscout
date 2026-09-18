import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scripts.config.settings import MLB_SCHEDULE_URL


def fetch_mlb_schedule(start_date: str, end_date: str) -> dict:
    params = {
        "sportId": 1,
        "gameType": "R",
        "startDate": start_date,
        "endDate": end_date,
        "hydrate": "team,linescore,probablePitcher",
    }

    retry = Retry(
        total=2,
        connect=2,
        read=2,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        respect_retry_after_header=False,
    )
    with requests.Session() as session:
        session.mount("https://", HTTPAdapter(max_retries=retry))
        response = session.get(MLB_SCHEDULE_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
