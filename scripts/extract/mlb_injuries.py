from dataclasses import dataclass
from datetime import date, datetime, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scripts.config.settings import MLB_API_URL

INJURY_STATUS_CODES = {"D7", "D10", "D15", "D60", "ILF", "RA"}
TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}


@dataclass(frozen=True)
class InjuryExtractResult:
    rows: list[dict]
    team_abbreviations: list[str]
    source_last_updated: str


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


def _fetch_json(
    session: requests.Session,
    path: str,
    params: dict,
) -> dict:
    try:
        response = session.get(
            f"{MLB_API_URL}{path}",
            params=params,
            timeout=45,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as error:
        raise RuntimeError(f"MLB injury request failed for {path}: {error}") from error
    except ValueError as error:
        raise RuntimeError(f"MLB injury request returned invalid JSON for {path}.") from error


def _normalize_team_abbreviation(value) -> str | None:
    if value is None:
        return None
    abbreviation = str(value).strip().upper()
    if not abbreviation:
        return None
    return TEAM_ABBREVIATION_ALIASES.get(abbreviation, abbreviation)


def _is_injury_status(status: dict) -> bool:
    code = str(status.get("code") or "").upper()
    description = str(status.get("description") or "").lower()
    return (
        code in INJURY_STATUS_CODES
        or "injured" in description
        or "rehab assignment" in description
    )


def fetch_mlb_injuries(
    season: int,
    start_date: str,
    end_date: str | None = None,
) -> InjuryExtractResult:
    if season < 1876:
        raise ValueError("season must be a valid MLB season year.")
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date) if end_date else date.today()
    if end < start:
        raise ValueError("MLB injury end date cannot precede start date.")

    print(
        "Fetching official MLB active injuries: "
        f"season={season}, transactions={start} through {end}."
    )
    session = _build_session()
    source_last_updated = datetime.now(timezone.utc).isoformat()
    try:
        teams_payload = _fetch_json(
            session,
            "/teams",
            {"sportId": 1, "season": season},
        )
        teams = []
        for team in teams_payload.get("teams") or []:
            abbreviation = _normalize_team_abbreviation(
                team.get("abbreviation")
            )
            team_id = team.get("id")
            if team_id is not None and abbreviation:
                teams.append((int(team_id), abbreviation))
        if len(teams) != 30:
            raise RuntimeError(
                f"Expected 30 MLB teams for injury refresh; found {len(teams)}."
            )

        rows = []
        for team_id, abbreviation in teams:
            roster_payload = _fetch_json(
                session,
                f"/teams/{team_id}/roster",
                {
                    "rosterType": "40Man",
                    "season": season,
                    "hydrate": "person(status,primaryPosition)",
                },
            )
            injured_roster = [
                entry
                for entry in roster_payload.get("roster") or []
                if _is_injury_status(entry.get("status") or {})
            ]
            if not injured_roster:
                continue

            transactions_payload = _fetch_json(
                session,
                "/transactions",
                {
                    "teamId": team_id,
                    "startDate": start.isoformat(),
                    "endDate": end.isoformat(),
                    "hydrate": "person",
                },
            )
            transactions_by_player: dict[int, list[dict]] = {}
            for transaction in transactions_payload.get("transactions") or []:
                player_id = (transaction.get("person") or {}).get("id")
                if player_id is not None:
                    transactions_by_player.setdefault(int(player_id), []).append(
                        transaction
                    )

            for entry in injured_roster:
                person = entry.get("person") or {}
                player_id = person.get("id")
                rows.append(
                    {
                        "season": season,
                        "team_abbreviation": abbreviation,
                        "mlb_player_id": int(player_id)
                        if player_id is not None
                        else None,
                        "player_name": person.get("fullName"),
                        "primary_position": (
                            (person.get("primaryPosition") or {}).get(
                                "abbreviation"
                            )
                            or (entry.get("position") or {}).get(
                                "abbreviation"
                            )
                        ),
                        "status": entry.get("status") or {},
                        "transactions": transactions_by_player.get(
                            int(player_id), []
                        )
                        if player_id is not None
                        else [],
                        "source_last_updated": source_last_updated,
                    }
                )
    finally:
        session.close()

    print(
        f"Official MLB injury rows extracted: {len(rows)} across {len(teams)} teams."
    )
    return InjuryExtractResult(
        rows=rows,
        team_abbreviations=sorted(abbreviation for _, abbreviation in teams),
        source_last_updated=source_last_updated,
    )
