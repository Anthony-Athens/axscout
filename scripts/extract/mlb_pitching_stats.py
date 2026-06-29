from datetime import date

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scripts.config.settings import MLB_STATS_URL

PAGE_SIZE = 1000
TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}


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


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"Invalid MLB pitching date: {value}.") from error


def _to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_float(value) -> float | None:
    if value is None or value in {"", "-.--", ".---"}:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _innings_to_outs(value) -> int:
    if value is None or value == "":
        return 0

    innings = str(value).strip()
    whole, separator, partial = innings.partition(".")
    if not whole.lstrip("-").isdigit():
        raise ValueError(f"Invalid innings pitched value: {value}.")

    partial_outs = int(partial or "0") if separator else 0
    if partial_outs not in {0, 1, 2}:
        raise ValueError(f"Invalid partial inning value: {value}.")
    return int(whole) * 3 + partial_outs


def _normalize_team_abbreviation(value) -> str | None:
    if value is None:
        return None
    abbreviation = str(value).strip().upper()
    if not abbreviation:
        return None
    return TEAM_ABBREVIATION_ALIASES.get(abbreviation, abbreviation)


def _fetch_splits(
    session: requests.Session,
    params: dict,
) -> list[dict]:
    splits: list[dict] = []
    offset = 0

    while True:
        page_params = {**params, "limit": PAGE_SIZE, "offset": offset}
        try:
            response = session.get(MLB_STATS_URL, params=page_params, timeout=45)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as error:
            raise RuntimeError(f"MLB pitching stats request failed: {error}") from error
        except ValueError as error:
            raise RuntimeError("MLB pitching stats returned invalid JSON.") from error

        stats = payload.get("stats") or []
        if not stats:
            raise RuntimeError("MLB pitching stats response has no stats block.")

        block = stats[0]
        page = block.get("splits") or []
        splits.extend(page)
        total = _to_int(block.get("totalSplits"))

        if not page or total is None or len(splits) >= total:
            break
        offset += len(page)

    return splits


def _normalize_split(split: dict, fallback_season: int) -> dict | None:
    player = split.get("player") or {}
    player_id = _to_int(player.get("id"))
    if player_id is None:
        return None

    team = split.get("team") or {}
    stat = split.get("stat") or {}
    innings_pitched = stat.get("inningsPitched")
    return {
        "season": _to_int(split.get("season")) or fallback_season,
        "mlb_player_id": player_id,
        "full_name": str(player.get("fullName") or "").strip() or None,
        "mlb_team_id": _to_int(team.get("id")),
        "team_abbreviation": _normalize_team_abbreviation(
            team.get("abbreviation")
        ),
        "innings_pitched": str(innings_pitched) if innings_pitched else None,
        "outs_recorded": _innings_to_outs(innings_pitched),
        "earned_runs": _to_int(stat.get("earnedRuns")) or 0,
        "walks": _to_int(stat.get("baseOnBalls")) or 0,
        "hits_allowed": _to_int(stat.get("hits")) or 0,
        "strikeouts": _to_int(stat.get("strikeOuts")) or 0,
        "era": _to_float(stat.get("era")),
        "whip": _to_float(stat.get("whip")),
    }


def fetch_mlb_pitching_stats(
    season: int,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    if season < 1876:
        raise ValueError("season must be a valid MLB season year.")
    if (start_date is None) != (end_date is None):
        raise ValueError("start_date and end_date must be provided together.")

    params = {
        "stats": "season",
        "group": "pitching",
        "season": season,
        "sportIds": 1,
        "playerPool": "ALL",
        "gameType": "R",
        "hydrate": "team",
    }
    label = f"season={season}"
    if start_date and end_date:
        start = _parse_date(start_date)
        end = _parse_date(end_date)
        if end < start:
            raise ValueError("MLB pitching end_date cannot precede start_date.")
        params.update(
            {
                "stats": "byDateRange",
                "startDate": start_date,
                "endDate": end_date,
            }
        )
        label = f"start={start_date}, end={end_date}"

    print(f"Fetching official MLB pitching summaries: {label}.")
    session = _build_session()
    try:
        splits = _fetch_splits(session, params)
    finally:
        session.close()

    rows = []
    for split in splits:
        row = _normalize_split(split, season)
        if row is not None:
            rows.append(row)

    print(f"Official MLB pitching rows extracted: {len(rows)}.")
    return rows
