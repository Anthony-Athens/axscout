import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scripts.config.settings import (
    ODDS_API_DATE_FORMAT,
    ODDS_API_KEY,
    ODDS_API_MARKETS,
    ODDS_API_ODDS_FORMAT,
    ODDS_API_REGIONS,
    ODDS_API_URL,
)

SUPPORTED_MARKETS = {"h2h", "spreads", "totals"}
SUPPORTED_ODDS_FORMATS = {"american", "decimal"}
SUPPORTED_DATE_FORMATS = {"iso", "unix"}


def _csv_values(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _validated_parameters() -> dict[str, str]:
    if not ODDS_API_KEY:
        raise RuntimeError(
            "ODDS_API_KEY is required when the odds pipeline is enabled."
        )

    markets = _csv_values(ODDS_API_MARKETS)
    unsupported = sorted(set(markets).difference(SUPPORTED_MARKETS))
    if not markets or unsupported:
        raise ValueError(
            "ODDS_API_MARKETS must contain only h2h, spreads, and totals; "
            f"unsupported values: {', '.join(unsupported) or 'none'}."
        )
    if ODDS_API_ODDS_FORMAT not in SUPPORTED_ODDS_FORMATS:
        raise ValueError("ODDS_API_ODDS_FORMAT must be american or decimal.")
    if ODDS_API_DATE_FORMAT not in SUPPORTED_DATE_FORMATS:
        raise ValueError("ODDS_API_DATE_FORMAT must be iso or unix.")
    if not _csv_values(ODDS_API_REGIONS):
        raise ValueError("ODDS_API_REGIONS must include at least one region.")

    return {
        "apiKey": ODDS_API_KEY,
        "regions": ODDS_API_REGIONS,
        "markets": ",".join(markets),
        "oddsFormat": ODDS_API_ODDS_FORMAT,
        "dateFormat": ODDS_API_DATE_FORMAT,
    }


def _build_session() -> requests.Session:
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def _error_detail(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text.strip()[:300] or "No error detail returned."
    if not isinstance(payload, dict):
        return "Unexpected error response."
    return str(
        payload.get("message")
        or payload.get("error_code")
        or "No error detail returned."
    )


def fetch_mlb_odds() -> list[dict]:
    params = _validated_parameters()
    print(
        "Fetching MLB odds from The Odds API: "
        f"regions={params['regions']}, markets={params['markets']}, "
        f"odds_format={params['oddsFormat']}."
    )
    session = _build_session()
    try:
        try:
            response = session.get(ODDS_API_URL, params=params, timeout=45)
        except requests.RequestException as error:
            raise RuntimeError(
                "The Odds API request failed "
                f"({type(error).__name__})."
            ) from error

        if response.status_code == 429:
            raise RuntimeError(
                "The Odds API rate limit or usage quota has been exceeded."
            )
        if response.status_code != 200:
            raise RuntimeError(
                "The Odds API returned "
                f"HTTP {response.status_code}: {_error_detail(response)}"
            )
        try:
            payload = response.json()
        except ValueError as error:
            raise RuntimeError("The Odds API returned invalid JSON.") from error
    finally:
        session.close()

    if not isinstance(payload, list):
        raise RuntimeError("The Odds API response was not an event list.")

    print(f"The Odds API events extracted: {len(payload)}.")
    print(
        "The Odds API quota: "
        f"last={response.headers.get('x-requests-last', 'unknown')}, "
        f"used={response.headers.get('x-requests-used', 'unknown')}, "
        f"remaining={response.headers.get('x-requests-remaining', 'unknown')}."
    )
    return payload
