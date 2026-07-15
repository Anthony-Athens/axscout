from datetime import date, datetime, timezone

from scripts.utils.mlb_people import (
    build_mlb_people_session,
    fetch_mlb_player_metadata,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)
from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

PIPELINE_NAME = "backfill_player_handedness_pipeline"
PAGE_SIZE = 1000


def _clean_hand(value) -> str | None:
    if value is None:
        return None
    hand = str(value).strip().upper()
    return hand if hand in {"R", "L", "S"} else None


def _fetch_pitcher_ids() -> list[int]:
    pitcher_ids: set[int] = set()
    offset = 0
    while True:
        result = (
            supabase.table("pitcher_profiles")
            .select("mlb_player_id")
            .not_.is_("mlb_player_id", "null")
            .order("mlb_player_id")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        pitcher_ids.update(int(row["mlb_player_id"]) for row in rows)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return sorted(pitcher_ids)


def _fetch_player_rows(player_ids: list[int]) -> dict[int, dict]:
    players: dict[int, dict] = {}
    for player_id_batch in batches(player_ids):
        result = (
            supabase.table("dim_players")
            .select("mlb_player_id,throws")
            .in_("mlb_player_id", player_id_batch)
            .execute()
        )
        players.update(
            {int(row["mlb_player_id"]): row for row in result.data or []}
        )
    return players


def _update_missing_handedness(player_id: int, throws: str) -> int:
    result = (
        supabase.table("dim_players")
        .update(
            {
                "throws": throws,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("mlb_player_id", player_id)
        .is_("throws", "null")
        .execute()
    )
    return len(result.data or [])


def main() -> None:
    run_id = start_refresh(
        pipeline_name=PIPELINE_NAME,
        source_date=str(date.today()),
    )

    try:
        pitcher_ids = _fetch_pitcher_ids()
        players = _fetch_player_rows(pitcher_ids)
        missing_ids = [
            player_id
            for player_id in pitcher_ids
            if _clean_hand(players.get(player_id, {}).get("throws")) is None
        ]
        already_populated = len(pitcher_ids) - len(missing_ids)
        updated = 0
        skipped = already_populated
        errors = 0
        print(
            f"Checking {len(pitcher_ids)} pitcher records; "
            f"{len(missing_ids)} need handedness."
        )

        session = build_mlb_people_session()
        try:
            for player_id in missing_ids:
                try:
                    metadata = fetch_mlb_player_metadata(
                        player_id,
                        session=session,
                    )
                    throws = _clean_hand(
                        metadata.get("throws") if metadata else None
                    )
                    if not throws:
                        skipped += 1
                        continue
                    changed = _update_missing_handedness(player_id, throws)
                    if changed:
                        updated += changed
                    else:
                        skipped += 1
                except Exception as error:
                    errors += 1
                    print(
                        f"Handedness lookup failed for {player_id}: {error}"
                    )
        finally:
            session.close()

        mark_refresh_success(run_id, updated)
        print(
            "Player handedness backfill complete: "
            f"{len(pitcher_ids)} checked, {updated} updated, "
            f"{skipped} skipped, {errors} errors."
        )
    except Exception as error:
        mark_refresh_failed(run_id, str(error))
        print(f"Player handedness backfill failed: {error}")
        raise


if __name__ == "__main__":
    main()
