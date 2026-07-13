from dataclasses import dataclass
from uuid import NAMESPACE_URL, uuid5

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from scripts.transform.pitcher_feature_matrix import PitcherFeatureMatrix


@dataclass(frozen=True)
class PitcherArchetypeModel:
    archetypes: list[dict]
    memberships: list[dict]
    features: list[dict]
    labels: np.ndarray
    distances: np.ndarray
    silhouette: float | None


def cluster_pitchers(
    matrix: PitcherFeatureMatrix, season: int, period_start: str,
    period_end: str, cluster_count: int, model_version: str,
    feature_version: str,
) -> PitcherArchetypeModel:
    pitcher_count = len(matrix.player_ids)
    if pitcher_count < 2:
        raise ValueError("At least two eligible pitchers are required for clustering.")
    clusters = min(cluster_count, pitcher_count - 1)
    if clusters < 2:
        raise ValueError("At least two clusters are required.")
    model = KMeans(n_clusters=clusters, random_state=42, n_init=20)
    labels = model.fit_predict(matrix.values)
    all_distances = model.transform(matrix.values)
    assigned = all_distances[np.arange(pitcher_count), labels]
    confidence = 1 / (1 + assigned)
    silhouette = float(silhouette_score(matrix.values, labels)) if len(set(labels)) > 1 else None
    archetypes: list[dict] = []
    memberships: list[dict] = []
    features: list[dict] = []
    for cluster in range(clusters):
        member_indexes = np.where(labels == cluster)[0]
        representative_index = member_indexes[np.argmin(assigned[member_indexes])]
        archetype_id = str(uuid5(NAMESPACE_URL, f"axscout:{season}:{model_version}:{cluster}"))
        archetypes.append({
            "archetype_id": archetype_id, "archetype_name": f"Archetype {cluster + 1}",
            "archetype_slug": f"archetype-{cluster + 1}-{model_version.lower().replace('_', '-')}",
            "short_description": "A data-driven arsenal cluster based on standardized Phase 1A pitcher features.",
            "season": season, "cluster_number": cluster, "algorithm": "kmeans",
            "model_version": model_version, "feature_version": feature_version,
            "pitcher_count": len(member_indexes),
            "representative_mlb_player_id": int(matrix.player_ids[representative_index]),
            "silhouette_score": silhouette,
        })
        center = model.cluster_centers_[cluster]
        importance = np.argsort(np.abs(center))[::-1]
        for rank, feature_index in enumerate(importance, 1):
            values = matrix.values[member_indexes, feature_index]
            features.append({
                "archetype_id": archetype_id, "feature_name": matrix.feature_names[feature_index],
                "feature_mean": float(center[feature_index]), "feature_stddev": float(values.std()),
                "league_percentile": float((matrix.values[:, feature_index] <= center[feature_index]).mean()),
                "importance_rank": rank, "model_version": model_version,
                "feature_version": feature_version,
            })
        for index in member_indexes:
            memberships.append({
                "mlb_player_id": int(matrix.player_ids[index]), "archetype_id": archetype_id,
                "season": season, "period_start": period_start, "period_end": period_end,
                "membership_probability": float(confidence[index]),
                "cluster_distance": float(assigned[index]), "is_primary": True,
                "membership_rank": 1, "model_version": model_version,
                "feature_version": feature_version,
            })
    return PitcherArchetypeModel(archetypes, memberships, features, labels, assigned, silhouette)
