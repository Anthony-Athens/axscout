import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scripts.config.settings import MLB_PEOPLE_URL_TEMPLATE

NAME_FIELDS = (
    "fullName",
    "fullFMLName",
    "firstLastName",
    "nameFirstLast",
)


def _clean_name(value) -> str | None:
    if value is None:
        return None

    name = str(value).strip()
    if not name or name.lower() in {"nan", "none", "null"}:
        return None

    return name


def _build_session() -> requests.Session:
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def fetch_mlb_player_name(
    mlb_player_id: int,
    session: requests.Session | None = None,
) -> str | None:
    if mlb_player_id < 1:
        raise ValueError("mlb_player_id must be a positive integer.")

    client = session or _build_session()
    url = MLB_PEOPLE_URL_TEMPLATE.format(mlb_player_id=mlb_player_id)

    try:
        response = client.get(url, timeout=30)
        if response.status_code == 404:
            print(f"MLB people lookup found no player for {mlb_player_id}.")
            return None
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as error:
        raise RuntimeError(
            f"MLB people lookup failed for {mlb_player_id}: {error}"
        ) from error
    except ValueError as error:
        raise RuntimeError(
            f"MLB people lookup returned invalid JSON for {mlb_player_id}."
        ) from error

    people = payload.get("people") or []
    if not people:
        print(f"MLB people lookup returned no player for {mlb_player_id}.")
        return None

    person = people[0]
    for field in NAME_FIELDS:
        name = _clean_name(person.get(field))
        if name:
            return name

    print(f"MLB people lookup returned no name for {mlb_player_id}.")
    return None


def fetch_mlb_player_names(player_ids: list[int]) -> dict[int, str]:
    names = {}
    session = _build_session()

    try:
        for player_id in player_ids:
            name = fetch_mlb_player_name(player_id, session=session)
            if name:
                names[player_id] = name
    finally:
        session.close()

    return names
