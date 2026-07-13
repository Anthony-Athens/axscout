import numpy as np
from sklearn.metrics import pairwise_distances

from scripts.transform.pitcher_feature_matrix import PitcherFeatureMatrix


def build_pitcher_similarities(
    matrix: PitcherFeatureMatrix, labels: np.ndarray, season: int,
    model_version: str, feature_version: str, neighbor_count: int = 10,
) -> list[dict]:
    if len(matrix.player_ids) < 2:
        return []
    distances = pairwise_distances(matrix.values, metric="euclidean")
    rows: list[dict] = []
    for index, player_id in enumerate(matrix.player_ids):
        ranked = [value for value in np.argsort(distances[index]) if value != index]
        for rank, neighbor in enumerate(ranked[:neighbor_count], 1):
            distance = float(distances[index, neighbor])
            rows.append({
                "mlb_player_id": int(player_id),
                "similar_mlb_player_id": int(matrix.player_ids[neighbor]),
                "season": season, "similarity_score": float(1 / (1 + distance)),
                "feature_distance": distance,
                "same_archetype": bool(labels[index] == labels[neighbor]),
                "similarity_rank": rank,
                "similarity_explanation": "Similar arsenal shape based on standardized pitch mix, velocity, movement, and outcome features.",
                "model_version": model_version, "feature_version": feature_version,
            })
    return rows
