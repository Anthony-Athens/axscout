from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches


def _upsert(table: str, rows: list[dict], conflict: str) -> int:
    for batch in batches(rows):
        supabase.table(table).upsert(batch, on_conflict=conflict).execute()
    return len(rows)


def _ensure_batters(rows: list[dict]) -> None:
    now = datetime.now(timezone.utc).isoformat()
    players = [
        {"mlb_player_id": batter_id, "updated_at": now}
        for batter_id in sorted({int(row["mlb_batter_id"]) for row in rows})
    ]
    _upsert("dim_players", players, "mlb_player_id")


def load_archetype_matchups(
    batter_rows: list[dict], team_rows: list[dict], season: int,
    period_start: str, period_end: str, model_version: str,
) -> dict[str, int]:
    _ensure_batters(batter_rows)
    for table in ["batter_vs_pitcher_archetype", "team_vs_pitcher_archetype"]:
        (supabase.table(table).delete().eq("season", season)
         .eq("period_start", period_start).eq("period_end", period_end)
         .eq("model_version", model_version).execute())
    return {
        "batter_matchups": _upsert(
            "batter_vs_pitcher_archetype", batter_rows,
            "mlb_batter_id,season,period_start,period_end,archetype_id,model_version",
        ),
        "team_matchups": _upsert(
            "team_vs_pitcher_archetype", team_rows,
            "team_abbreviation,season,period_start,period_end,archetype_id,model_version",
        ),
    }
