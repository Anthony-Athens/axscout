from datetime import date, datetime, timezone

from scripts.utils.mlb_people import fetch_mlb_player_names
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)
from scripts.utils.supabase_client import supabase

PIPELINE_NAME = "backfill_player_names_pipeline"
PAGE_SIZE = 1000
LOOKUP_BATCH_SIZE = 500


def _clean_name(value) -> str | None:
    if value is None:
        return None

    name = str(value).strip()
    return name or None


def _fetch_missing_players() -> list[dict]:
    missing_players = []
    offset = 0

    while True:
        result = (
            supabase.table("dim_players")
            .select("mlb_player_id,full_name")
            .not_.is_("mlb_player_id", "null")
            .order("mlb_player_id")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        missing_players.extend(
            row for row in rows if _clean_name(row.get("full_name")) is None
        )

        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return missing_players


def _fetch_operational_names(player_ids: list[int]) -> dict[int, str]:
    names = {}
    for index in range(0, len(player_ids), LOOKUP_BATCH_SIZE):
        player_id_batch = player_ids[index : index + LOOKUP_BATCH_SIZE]
        result = (
            supabase.table("players")
            .select("mlb_player_id,full_name")
            .in_("mlb_player_id", player_id_batch)
            .execute()
        )
        for row in result.data or []:
            name = _clean_name(row.get("full_name"))
            if name:
                names[int(row["mlb_player_id"])] = name
    return names


def _resolve_names(missing_players: list[dict]) -> dict[int, str]:
    player_ids = [int(row["mlb_player_id"]) for row in missing_players]
    resolved = _fetch_operational_names(player_ids)

    unresolved_ids = [
        player_id for player_id in player_ids if player_id not in resolved
    ]
    resolved.update(fetch_mlb_player_names(unresolved_ids))

    return resolved


def _update_missing_names(
    missing_players: list[dict],
    resolved_names: dict[int, str],
) -> int:
    updated_at = datetime.now(timezone.utc).isoformat()
    updated = 0

    for player in missing_players:
        player_id = int(player["mlb_player_id"])
        name = resolved_names.get(player_id)
        if not name:
            continue

        query = (
            supabase.table("dim_players")
            .update({"full_name": name, "updated_at": updated_at})
            .eq("mlb_player_id", player_id)
        )
        original_name = player.get("full_name")
        if original_name is None:
            query = query.is_("full_name", "null")
        else:
            query = query.eq("full_name", original_name)

        result = query.execute()
        updated += len(result.data or [])

    return updated


def main() -> None:
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(date.today()),
    )

    try:
        missing_players = _fetch_missing_players()
        print(f"Found {len(missing_players)} dim_players rows without names.")

        resolved_names = _resolve_names(missing_players)
        updated = _update_missing_names(missing_players, resolved_names)
        unresolved = len(missing_players) - updated

        mark_refresh_success(run_id, updated)
        print(
            "Player name backfill complete: "
            f"{updated} updated, {unresolved} unresolved."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Player name backfill failed: {error}")
        raise


if __name__ == "__main__":
    main()
