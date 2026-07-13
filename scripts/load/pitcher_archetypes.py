from datetime import datetime, timezone

from scripts.utils.supabase_client import supabase

BATCH_SIZE = 500


def _chunks(rows: list[dict]):
    for index in range(0, len(rows), BATCH_SIZE):
        yield rows[index:index + BATCH_SIZE]


def _upsert(table: str, rows: list[dict], conflict: str) -> int:
    for batch in _chunks(rows):
        supabase.table(table).upsert(batch, on_conflict=conflict).execute()
    return len(rows)


def start_model_run(parameters: dict) -> str:
    result = supabase.table("pitcher_model_runs").insert({
        "model_version": parameters["model_version"], "season": parameters["season"],
        "training_start_date": parameters["period_start"],
        "training_end_date": parameters["period_end"], "algorithm": "kmeans",
        "feature_version": parameters["feature_version"], "parameters": parameters,
        "status": "running",
    }).execute()
    return str(result.data[0]["model_run_id"])


def finish_model_run(model_run_id: str, status: str, **values: object) -> None:
    supabase.table("pitcher_model_runs").update({
        "status": status, "completed_at": datetime.now(timezone.utc).isoformat(), **values,
    }).eq("model_run_id", model_run_id).execute()


def _ensure_dim_players(pitcher_rows: list[dict]) -> None:
    payload = []
    for row in pitcher_rows:
        player = {
            "mlb_player_id": int(row["mlb_player_id"]),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if row.get("full_name"):
            player["full_name"] = row["full_name"]
        payload.append(player)
    _upsert("dim_players", payload, "mlb_player_id")


def load_pitcher_archetype_outputs(
    pitch_rows: list[dict], pitcher_rows: list[dict], archetypes: list[dict],
    memberships: list[dict], features: list[dict], similarities: list[dict],
    season: int, period_start: str, period_end: str, model_version: str,
    feature_version: str,
) -> dict[str, int]:
    _ensure_dim_players(pitcher_rows)
    # Remove only this model/window's prior derived output so a rerun cannot
    # leave stale pitch types, clusters, memberships, or neighbors behind.
    (supabase.table("pitcher_pitch_profiles").delete().eq("season", season)
     .eq("period_start", period_start).eq("period_end", period_end)
     .eq("feature_version", feature_version).execute())
    (supabase.table("pitcher_profiles").delete().eq("season", season)
     .eq("period_start", period_start).eq("period_end", period_end)
     .eq("feature_version", feature_version).execute())
    (supabase.table("pitcher_similarities").delete().eq("season", season)
     .eq("model_version", model_version).execute())
    (supabase.table("pitcher_archetype_memberships").delete().eq("season", season)
     .eq("model_version", model_version).execute())
    (supabase.table("pitcher_archetypes").delete().eq("season", season)
     .eq("model_version", model_version).execute())

    counts = {
        "pitch_profiles": _upsert(
            "pitcher_pitch_profiles", pitch_rows,
            "season,period_start,period_end,mlb_player_id,pitch_type,feature_version",
        ),
        "archetypes": _upsert(
            "pitcher_archetypes", archetypes, "season,model_version,cluster_number"
        ),
        "memberships": _upsert(
            "pitcher_archetype_memberships", memberships,
            "mlb_player_id,archetype_id,season,period_start,period_end,model_version",
        ),
        "features": _upsert(
            "pitcher_archetype_features", features,
            "archetype_id,feature_name,model_version",
        ),
        "similarities": _upsert(
            "pitcher_similarities", similarities,
            "mlb_player_id,similar_mlb_player_id,season,model_version",
        ),
    }
    membership_by_player = {row["mlb_player_id"]: row for row in memberships}
    profile_payload = []
    for source in pitcher_rows:
        membership = membership_by_player[int(source["mlb_player_id"])]
        row = {key: value for key, value in source.items() if key != "full_name"}
        row.update({
            "primary_archetype_id": membership["archetype_id"],
            "archetype_probability": membership["membership_probability"],
            "outlier_score": membership["cluster_distance"],
            "model_version": model_version,
            "refreshed_at": datetime.now(timezone.utc).isoformat(),
        })
        profile_payload.append(row)
    counts["pitcher_profiles"] = _upsert(
        "pitcher_profiles", profile_payload,
        "season,period_start,period_end,mlb_player_id,feature_version",
    )
    return counts
