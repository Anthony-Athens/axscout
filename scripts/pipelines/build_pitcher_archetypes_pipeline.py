from datetime import date

from scripts.config.settings import (
    PITCHER_ARCHETYPE_CLUSTER_COUNT, PITCHER_ARCHETYPE_END_DATE,
    PITCHER_ARCHETYPE_FEATURE_VERSION, PITCHER_ARCHETYPE_MIN_PITCHES,
    PITCHER_ARCHETYPE_MODEL_VERSION, PITCHER_ARCHETYPE_SEASON,
    PITCHER_ARCHETYPE_START_DATE,
)
from scripts.extract.pitcher_statcast import fetch_pitcher_statcast
from scripts.load.pitcher_archetypes import (
    finish_model_run, load_pitcher_archetype_outputs, start_model_run,
)
from scripts.models.pitcher_archetypes import cluster_pitchers
from scripts.models.pitcher_similarities import build_pitcher_similarities
from scripts.transform.pitcher_feature_matrix import build_pitcher_feature_matrix
from scripts.transform.pitcher_pitch_profiles import build_pitcher_profiles
from scripts.utils.refresh_log import mark_refresh_failed, mark_refresh_success, start_refresh

PIPELINE_NAME = "build_pitcher_archetypes"


def _window() -> tuple[str, str]:
    start = PITCHER_ARCHETYPE_START_DATE or f"{PITCHER_ARCHETYPE_SEASON}-03-01"
    end = PITCHER_ARCHETYPE_END_DATE or date.today().isoformat()
    if start > end:
        raise ValueError("PITCHER_ARCHETYPE_START_DATE must be on or before the end date.")
    return start, end


def main() -> None:
    start, end = _window()
    parameters = {
        "season": PITCHER_ARCHETYPE_SEASON, "period_start": start, "period_end": end,
        "min_pitches": PITCHER_ARCHETYPE_MIN_PITCHES,
        "cluster_count": PITCHER_ARCHETYPE_CLUSTER_COUNT,
        "model_version": PITCHER_ARCHETYPE_MODEL_VERSION,
        "feature_version": PITCHER_ARCHETYPE_FEATURE_VERSION,
    }
    refresh_id = start_refresh(PIPELINE_NAME, end)
    model_run_id: str | None = None
    try:
        model_run_id = start_model_run(parameters)
        pitches = fetch_pitcher_statcast(start, end)
        print(f"Source pitch rows: {len(pitches)}")
        pitch_rows, pitcher_rows = build_pitcher_profiles(
            pitches, PITCHER_ARCHETYPE_SEASON, start, end,
            PITCHER_ARCHETYPE_MIN_PITCHES, PITCHER_ARCHETYPE_FEATURE_VERSION,
        )
        print(f"Eligible pitchers: {len(pitcher_rows)}")
        print(f"Pitch profile rows: {len(pitch_rows)}")
        print(f"Pitcher profile rows: {len(pitcher_rows)}")
        if not pitcher_rows:
            finish_model_run(model_run_id, "success", cluster_count=0, pitcher_count=0)
            mark_refresh_success(refresh_id, 0)
            print("No eligible pitchers; completed safely without replacing model outputs.")
            return
        matrix = build_pitcher_feature_matrix(pitcher_rows)
        model = cluster_pitchers(
            matrix, PITCHER_ARCHETYPE_SEASON, start, end,
            PITCHER_ARCHETYPE_CLUSTER_COUNT, PITCHER_ARCHETYPE_MODEL_VERSION,
            PITCHER_ARCHETYPE_FEATURE_VERSION,
        )
        similarities = build_pitcher_similarities(
            matrix, model.labels, PITCHER_ARCHETYPE_SEASON,
            PITCHER_ARCHETYPE_MODEL_VERSION, PITCHER_ARCHETYPE_FEATURE_VERSION,
        )
        counts = load_pitcher_archetype_outputs(
            pitch_rows, pitcher_rows, model.archetypes, model.memberships,
            model.features, similarities, PITCHER_ARCHETYPE_SEASON, start, end,
            PITCHER_ARCHETYPE_MODEL_VERSION, PITCHER_ARCHETYPE_FEATURE_VERSION,
        )
        total = sum(counts.values())
        finish_model_run(
            model_run_id, "success", silhouette_score=model.silhouette,
            cluster_count=len(model.archetypes), pitcher_count=len(pitcher_rows),
        )
        mark_refresh_success(refresh_id, total)
        print(
            f"Archetypes created: {counts['archetypes']}; memberships created: "
            f"{counts['memberships']}; similarities created: {counts['similarities']}; "
            f"model={PITCHER_ARCHETYPE_MODEL_VERSION}; "
            f"features={PITCHER_ARCHETYPE_FEATURE_VERSION}"
        )
    except Exception as error:
        if model_run_id:
            finish_model_run(model_run_id, "failed", error_message=str(error))
        mark_refresh_failed(refresh_id, str(error))
        print(f"Pitcher archetype pipeline failed: {error}")
        raise


if __name__ == "__main__":
    main()
