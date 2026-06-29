from dataclasses import dataclass
from datetime import date, datetime, timedelta

from scripts.config.settings import (
    SEASON_END_DATE,
    SEASON_START_DATE,
    STATCAST_END_DATE,
    STATCAST_START_DATE,
)


def _parse_date(value: str, variable_name: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as error:
        raise ValueError(
            f"{variable_name} must use YYYY-MM-DD format; received {value!r}."
        ) from error


@dataclass(frozen=True)
class StatcastWindow:
    start_date: date
    end_date: date
    source: str
    covers_season_to_date: bool


@dataclass(frozen=True)
class GamesWindow:
    start_date: date
    end_date: date
    source: str
    is_full_season: bool


def resolve_statcast_window(
    lookback_days: int,
    *,
    today: date | None = None,
) -> StatcastWindow:
    if lookback_days < 1:
        raise ValueError("Statcast lookback must be at least one day.")

    current_date = today or date.today()
    end_date = (
        _parse_date(STATCAST_END_DATE, "STATCAST_END_DATE")
        if STATCAST_END_DATE
        else current_date
    )

    season_start = (
        _parse_date(SEASON_START_DATE, "SEASON_START_DATE")
        if SEASON_START_DATE
        else None
    )
    if STATCAST_START_DATE:
        start_date = _parse_date(STATCAST_START_DATE, "STATCAST_START_DATE")
        source = "STATCAST_START_DATE"
    elif season_start:
        start_date = season_start
        source = "SEASON_START_DATE"
    else:
        start_date = end_date - timedelta(days=lookback_days - 1)
        source = f"{lookback_days}-day lookback"

    if start_date > end_date:
        raise ValueError(
            "The resolved Statcast start date must be on or before the end "
            "date."
        )

    return StatcastWindow(
        start_date=start_date,
        end_date=end_date,
        source=source,
        covers_season_to_date=(
            season_start is not None and start_date <= season_start
        ),
    )


def resolve_games_window(
    lookback_days: int,
    lookahead_days: int,
    *,
    today: date | None = None,
) -> GamesWindow:
    if lookback_days < 0:
        raise ValueError("Games lookback cannot be negative.")
    if lookahead_days < 0:
        raise ValueError("Games lookahead cannot be negative.")

    current_date = today or date.today()
    if SEASON_START_DATE:
        start_date = _parse_date(SEASON_START_DATE, "SEASON_START_DATE")
        end_date = (
            _parse_date(SEASON_END_DATE, "SEASON_END_DATE")
            if SEASON_END_DATE
            else current_date
        )
        source = (
            "SEASON_START_DATE through SEASON_END_DATE"
            if SEASON_END_DATE
            else "SEASON_START_DATE through today"
        )
        is_full_season = True
    else:
        if SEASON_END_DATE:
            raise ValueError(
                "SEASON_END_DATE requires SEASON_START_DATE to be set."
            )
        start_date = current_date - timedelta(days=lookback_days)
        end_date = current_date + timedelta(days=lookahead_days)
        source = f"{lookback_days}-day lookback"
        is_full_season = False

    if start_date > end_date:
        raise ValueError(
            "The resolved games start date must be on or before the end date."
        )
    if is_full_season and end_date > current_date:
        raise ValueError("SEASON_END_DATE cannot be after today.")

    return GamesWindow(
        start_date=start_date,
        end_date=end_date,
        source=source,
        is_full_season=is_full_season,
    )
