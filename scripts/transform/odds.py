from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from scripts.utils.mlb_teams import (
    normalize_team_abbreviation,
    odds_team_abbreviation,
)

SUPPORTED_MARKETS = {"h2h", "spreads", "totals"}
MLB_GAME_TIME_ZONE = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class OddsTransformResult:
    rows: list[dict]
    unmatched_event_count: int


def _clean_text(value) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _number(value) -> int | float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return int(parsed) if parsed.is_integer() else parsed


def _timestamp(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc)
    text = _clean_text(value)
    if text is None:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso_timestamp(value) -> str | None:
    parsed = _timestamp(value)
    return parsed.isoformat() if parsed else None


def _game_lookup(games: list[dict]) -> dict[tuple[str, str, str], list[int]]:
    lookup: dict[tuple[str, str, str], list[int]] = {}
    for game in games:
        game_pk = game.get("mlb_game_pk")
        game_date = _clean_text(game.get("game_date"))
        home_team = normalize_team_abbreviation(game.get("home_team"))
        away_team = normalize_team_abbreviation(game.get("away_team"))
        if game_pk is None or not game_date or not home_team or not away_team:
            continue
        lookup.setdefault((game_date, home_team, away_team), []).append(
            int(game_pk)
        )
    return lookup


def _match_game(
    event: dict,
    home_team: str | None,
    away_team: str | None,
    lookup: dict[tuple[str, str, str], list[int]],
) -> int | None:
    commence_time = _timestamp(event.get("commence_time"))
    if commence_time is None or not home_team or not away_team:
        return None
    game_date = commence_time.astimezone(MLB_GAME_TIME_ZONE).date().isoformat()
    candidates = lookup.get((game_date, home_team, away_team), [])
    return candidates[0] if len(candidates) == 1 else None


def _outcomes_by_name(market: dict) -> dict[str, dict]:
    outcomes = {}
    for outcome in market.get("outcomes") or []:
        name = _clean_text(outcome.get("name"))
        if name:
            outcomes[name.casefold()] = outcome
    return outcomes


def _market_values(
    market_key: str,
    market: dict,
    provider_home_team: str,
    provider_away_team: str,
) -> dict:
    outcomes = _outcomes_by_name(market)
    home = outcomes.get(provider_home_team.casefold(), {})
    away = outcomes.get(provider_away_team.casefold(), {})
    over = outcomes.get("over", {})
    under = outcomes.get("under", {})
    values = {
        "home_price": None,
        "away_price": None,
        "home_point": None,
        "away_point": None,
        "total_point": None,
        "over_price": None,
        "under_price": None,
    }
    if market_key == "h2h":
        values["home_price"] = _number(home.get("price"))
        values["away_price"] = _number(away.get("price"))
    elif market_key == "spreads":
        values.update(
            {
                "home_price": _number(home.get("price")),
                "away_price": _number(away.get("price")),
                "home_point": _number(home.get("point")),
                "away_point": _number(away.get("point")),
            }
        )
    elif market_key == "totals":
        values.update(
            {
                "total_point": _number(over.get("point"))
                or _number(under.get("point")),
                "over_price": _number(over.get("price")),
                "under_price": _number(under.get("price")),
            }
        )
    return values


def transform_odds_events(
    events: list[dict],
    games: list[dict],
    odds_format: str,
    snapshot_at: datetime | None = None,
) -> OddsTransformResult:
    captured_at = (snapshot_at or datetime.now(timezone.utc)).astimezone(
        timezone.utc
    )
    lookup = _game_lookup(games)
    rows = []
    unmatched_event_ids: set[str] = set()

    for event in events:
        event_id = _clean_text(event.get("id"))
        commence_time = _iso_timestamp(event.get("commence_time"))
        provider_home = _clean_text(event.get("home_team"))
        provider_away = _clean_text(event.get("away_team"))
        if not event_id or not commence_time or not provider_home or not provider_away:
            print("Skipping malformed odds event without identity or matchup data.")
            continue

        home_team = odds_team_abbreviation(provider_home)
        away_team = odds_team_abbreviation(provider_away)
        mlb_game_pk = _match_game(event, home_team, away_team, lookup)
        if mlb_game_pk is None:
            unmatched_event_ids.add(event_id)

        for bookmaker in event.get("bookmakers") or []:
            sportsbook = _clean_text(bookmaker.get("title")) or _clean_text(
                bookmaker.get("key")
            )
            if not sportsbook:
                continue
            bookmaker_update = bookmaker.get("last_update")
            for market in bookmaker.get("markets") or []:
                market_key = _clean_text(market.get("key"))
                if market_key not in SUPPORTED_MARKETS:
                    continue
                rows.append(
                    {
                        "mlb_game_pk": mlb_game_pk,
                        "commence_time": commence_time,
                        "home_team": home_team or provider_home,
                        "away_team": away_team or provider_away,
                        "sportsbook": sportsbook,
                        "market_key": market_key,
                        "market_last_update": _iso_timestamp(
                            market.get("last_update") or bookmaker_update
                        ),
                        **_market_values(
                            market_key,
                            market,
                            provider_home,
                            provider_away,
                        ),
                        "odds_format": odds_format,
                        "raw_event_id": event_id,
                        "source": "the_odds_api",
                        "snapshot_at": captured_at.isoformat(),
                    }
                )

    print(f"Transformed odds snapshot rows: {len(rows)}.")
    print(f"Unmatched odds events: {len(unmatched_event_ids)}.")
    return OddsTransformResult(
        rows=rows,
        unmatched_event_count=len(unmatched_event_ids),
    )
