import hashlib
import re

TEAM_ABBREVIATION_ALIASES = {
    "AZ": "ARI",
    "OAK": "ATH",
    "WSN": "WSH",
}


def _clean_text(value) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _normalize_team(value) -> str | None:
    abbreviation = _clean_text(value)
    if abbreviation is None:
        return None
    abbreviation = abbreviation.upper()
    return TEAM_ABBREVIATION_ALIASES.get(abbreviation, abbreviation)


def _transaction_date(transaction: dict | None) -> str:
    if transaction is None:
        return ""
    return str(
        transaction.get("effectiveDate")
        or transaction.get("date")
        or ""
    )


def _placement_transaction(transactions: list[dict]) -> dict | None:
    placements = []
    for transaction in transactions:
        description = str(transaction.get("description") or "").lower()
        if "placed" in description and "injured list" in description:
            placements.append(transaction)
    return max(placements, key=_transaction_date) if placements else None


def _injury_description(transaction: dict | None, fallback: str) -> str:
    description = _clean_text(
        transaction.get("description") if transaction else None
    )
    if not description:
        return fallback

    sentences = [
        sentence.strip()
        for sentence in re.split(r"\.\s+", description.rstrip("."))
        if sentence.strip()
    ]
    details = [
        sentence
        for sentence in sentences
        if "injured list" not in sentence.lower()
    ]
    return details[-1] if details else description


def _injury_key(row: dict) -> str:
    identity = row.get("mlb_player_id") or row["player_name"].lower()
    value = "|".join(
        [
            str(row["season"]),
            row["team_abbreviation"],
            str(identity),
            row["injury_description"].lower(),
        ]
    )
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_player_injury_rows(source_rows: list[dict]) -> list[dict]:
    rows_by_key: dict[str, dict] = {}
    for source in source_rows:
        team = _normalize_team(source.get("team_abbreviation"))
        status = source.get("status") or {}
        status_description = (
            _clean_text(status.get("description")) or "Injured"
        )
        player_id = source.get("mlb_player_id")
        player_name = _clean_text(source.get("player_name"))
        if team is None or (player_id is None and player_name is None):
            continue
        if player_name is None:
            player_name = f"Player {int(player_id)}"

        placement = _placement_transaction(source.get("transactions") or [])
        injury_description = _injury_description(
            placement,
            status_description,
        )
        row = {
            "season": int(source["season"]),
            "team_abbreviation": team,
            "mlb_player_id": int(player_id) if player_id is not None else None,
            "player_name": player_name,
            "primary_position": _clean_text(source.get("primary_position")),
            "status": status_description,
            "injury_description": injury_description,
            "injury_type": injury_description,
            "injured_list_designation": status_description,
            "date_placed": _transaction_date(placement) or None,
            "expected_return": None,
            "source": "MLB Stats API",
            "source_last_updated": source.get("source_last_updated"),
            "is_active": True,
        }
        row["injury_key"] = _injury_key(row)
        rows_by_key[row["injury_key"]] = row

    rows = sorted(
        rows_by_key.values(),
        key=lambda row: (row["team_abbreviation"], row["player_name"]),
    )
    print(f"Built {len(rows)} normalized active player injury rows.")
    return rows
