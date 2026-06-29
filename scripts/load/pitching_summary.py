from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

PAGE_SIZE = 1000

TEAM_WEEKLY_COLUMNS = (
    "season,week_start_date,week_end_date,team_abbreviation,era,whip,"
    "strikeouts,avg_pitch_speed,avg_spin_rate"
)
PLAYER_WEEKLY_COLUMNS = (
    "season,week_start_date,week_end_date,player_key,mlb_player_id,full_name,"
    "team_abbreviation,batters_faced,strikeouts,walks,hits_allowed,"
    "home_runs_allowed,avg_pitch_speed,avg_spin_rate,era,whip"
)
PLAYER_SEASON_COLUMNS = (
    "season,player_key,mlb_player_id,full_name,team_abbreviation,"
    "batters_faced,strikeouts,walks,hits_allowed,home_runs_allowed,"
    "avg_pitch_speed,avg_spin_rate,era,whip"
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_season_rows(
    table_name: str,
    columns: str,
    season: int,
) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        page = (
            supabase.table(table_name)
            .select(columns)
            .eq("season", season)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def fetch_pitching_summary_targets(season: int) -> dict[str, list[dict]]:
    targets = {
        "team_weekly": _fetch_season_rows(
            "agg_team_pitching_weekly",
            TEAM_WEEKLY_COLUMNS,
            season,
        ),
        "player_weekly": _fetch_season_rows(
            "agg_player_pitching_weekly",
            PLAYER_WEEKLY_COLUMNS,
            season,
        ),
        "player_season": _fetch_season_rows(
            "agg_player_pitching_season",
            PLAYER_SEASON_COLUMNS,
            season,
        ),
    }
    print(
        "Pitching summary targets: "
        + ", ".join(f"{len(rows)} {name}" for name, rows in targets.items())
        + "."
    )
    return targets


def weekly_periods(targets: dict[str, list[dict]]) -> list[tuple[str, str]]:
    periods = {
        (row["week_start_date"], row["week_end_date"])
        for group in ("team_weekly", "player_weekly")
        for row in targets[group]
        if row.get("week_start_date") and row.get("week_end_date")
    }
    return sorted(periods)


def _merge_updates(
    existing_rows: list[dict],
    updates: list[dict],
    key_fields: tuple[str, ...],
) -> list[dict]:
    update_map = {
        tuple(update.get(field) for field in key_fields): update
        for update in updates
    }
    updated_at = _utc_now_iso()
    payload = []

    for row in existing_rows:
        key = tuple(row.get(field) for field in key_fields)
        update = update_map.get(key)
        if update is None:
            continue

        era = update.get("era")
        whip = update.get("whip")
        if era is None and whip is None:
            continue

        payload.append(
            {
                **row,
                "era": row.get("era") if era is None else era,
                "whip": row.get("whip") if whip is None else whip,
                "updated_at": updated_at,
            }
        )

    return payload


def _upsert_rows(
    table_name: str,
    conflict_key: str,
    rows: list[dict],
) -> int:
    if not rows:
        print(f"No official pitching updates matched {table_name}.")
        return 0

    for row_batch in batches(rows):
        (
            supabase.table(table_name)
            .upsert(row_batch, on_conflict=conflict_key)
            .execute()
        )
    print(f"Updated ERA/WHIP on {len(rows)} rows in {table_name}.")
    return len(rows)


def load_pitching_summary(
    targets: dict[str, list[dict]],
    player_season_updates: list[dict],
    player_weekly_updates: list[dict],
    team_weekly_updates: list[dict],
) -> dict[str, int]:
    season_payload = _merge_updates(
        targets["player_season"],
        player_season_updates,
        ("season", "mlb_player_id"),
    )
    player_weekly_payload = _merge_updates(
        targets["player_weekly"],
        player_weekly_updates,
        ("season", "week_start_date", "mlb_player_id"),
    )
    team_weekly_payload = _merge_updates(
        targets["team_weekly"],
        team_weekly_updates,
        ("season", "week_start_date", "team_abbreviation"),
    )

    return {
        "player_season": _upsert_rows(
            "agg_player_pitching_season",
            "season,mlb_player_id",
            season_payload,
        ),
        "player_weekly": _upsert_rows(
            "agg_player_pitching_weekly",
            "season,week_start_date,mlb_player_id",
            player_weekly_payload,
        ),
        "team_weekly": _upsert_rows(
            "agg_team_pitching_weekly",
            "season,week_start_date,team_abbreviation",
            team_weekly_payload,
        ),
    }
