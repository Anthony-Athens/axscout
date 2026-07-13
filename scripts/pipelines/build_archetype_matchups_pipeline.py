from datetime import date

from scripts.config.settings import (
    ARCHETYPE_MATCHUP_END_DATE,
    ARCHETYPE_MATCHUP_FEATURE_VERSION,
    ARCHETYPE_MATCHUP_MIN_PA_BATTER,
    ARCHETYPE_MATCHUP_MIN_PA_TEAM,
    ARCHETYPE_MATCHUP_MODEL_VERSION,
    ARCHETYPE_MATCHUP_SEASON,
    ARCHETYPE_MATCHUP_START_DATE,
)
from scripts.extract.pitcher_statcast import fetch_pitcher_statcast
from scripts.load.archetype_matchups import load_archetype_matchups
from scripts.transform.batter_vs_pitcher_archetype import (
    attach_primary_archetypes,
    build_batter_vs_archetype_rows,
)
from scripts.transform.team_vs_pitcher_archetype import (
    build_team_vs_archetype_rows,
)
from scripts.utils.refresh_log import (
    mark_refresh_failed,
    mark_refresh_success,
    start_refresh,
)
from scripts.utils.supabase_client import supabase

PIPELINE_NAME = "build_archetype_matchups"
PAGE_SIZE = 1000


def _window() -> tuple[str, str]:
    start = ARCHETYPE_MATCHUP_START_DATE or f"{ARCHETYPE_MATCHUP_SEASON}-03-01"
    end = ARCHETYPE_MATCHUP_END_DATE or date.today().isoformat()
    if start > end:
        raise ValueError("ARCHETYPE_MATCHUP_START_DATE must be on or before the end date.")
    return start, end


def _primary_memberships() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        page = (
            supabase.table("pitcher_archetype_memberships")
            .select("mlb_player_id,archetype_id,is_primary")
            .eq("season", ARCHETYPE_MATCHUP_SEASON)
            .eq("model_version", ARCHETYPE_MATCHUP_MODEL_VERSION)
            .eq("is_primary", True)
            .order("mlb_player_id")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute().data or []
        )
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def main() -> None:
    start, end = _window()
    refresh_id = start_refresh(PIPELINE_NAME, end)
    try:
        memberships = _primary_memberships()
        print(
            f"Primary archetype memberships: {len(memberships)}; "
            f"model={ARCHETYPE_MATCHUP_MODEL_VERSION}"
        )
        if not memberships:
            mark_refresh_success(refresh_id, 0)
            print("No primary memberships found; completed without replacing matchup outputs.")
            return
        pitches = fetch_pitcher_statcast(start, end)
        print(f"Source Statcast pitch rows: {len(pitches)}")
        joined = attach_primary_archetypes(pitches, memberships)
        print(f"Pitch rows matched to a primary archetype: {len(joined)}")
        if joined.empty:
            mark_refresh_success(refresh_id, 0)
            print("No matched Statcast rows; completed without replacing matchup outputs.")
            return
        batter_rows = build_batter_vs_archetype_rows(
            joined, ARCHETYPE_MATCHUP_SEASON, start, end,
            ARCHETYPE_MATCHUP_MODEL_VERSION, ARCHETYPE_MATCHUP_FEATURE_VERSION,
            ARCHETYPE_MATCHUP_MIN_PA_BATTER,
        )
        team_rows = build_team_vs_archetype_rows(
            joined, ARCHETYPE_MATCHUP_SEASON, start, end,
            ARCHETYPE_MATCHUP_MODEL_VERSION, ARCHETYPE_MATCHUP_FEATURE_VERSION,
            ARCHETYPE_MATCHUP_MIN_PA_TEAM,
        )
        counts = load_archetype_matchups(
            batter_rows, team_rows, ARCHETYPE_MATCHUP_SEASON, start, end,
            ARCHETYPE_MATCHUP_MODEL_VERSION,
        )
        loaded = sum(counts.values())
        mark_refresh_success(refresh_id, loaded)
        print(
            f"Archetype matchup refresh complete: {counts['batter_matchups']} "
            f"batter rows, {counts['team_matchups']} team rows; "
            f"features={ARCHETYPE_MATCHUP_FEATURE_VERSION}"
        )
    except Exception as error:
        mark_refresh_failed(refresh_id, str(error))
        print(f"Archetype matchup refresh failed: {error}")
        raise


if __name__ == "__main__":
    main()
