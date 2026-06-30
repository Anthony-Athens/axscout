# Prediction Tracking

AXScout scores completed game forecasts into `prediction_results` so model
performance can be evaluated independently of the mutable upcoming-prediction
table.

## Data flow

The scoring pipeline reads game outcomes from `fact_games`, team abbreviations
from `dim_teams`, and forecast snapshots from `game_predictions`. Each scored
row preserves the prediction, probabilities, confidence, market context, model
identity, and original prediction creation time.

Results are upserted on `mlb_game_pk, model_name, model_version`. Rerunning the
pipeline safely refreshes a result without creating duplicates or deleting
older model versions.

## Eligibility

A game is scored only when all of the following are true:

- status is `Final` or `Game Over`, case-insensitively
- home and away scores are present
- the scores are different
- a prediction with a winner, model name, and model version exists

Incomplete games, ties, and completed games without forecasts are skipped and
reported in pipeline logs. The scoring predicate is shared with
`agg_team_daily`, keeping the definition of a completed decision consistent.

## Running locally

Apply the `prediction_results` SQL in `supabase/schema.sql`, then run:

```powershell
python -m scripts.pipelines.score_predictions_pipeline
```

The pipeline writes a `score_predictions` run to `data_refresh_runs`. To add it
to the master refresh, configure:

```text
ENABLE_PREDICTION_TRACKING=true
```

The master pipeline scores results after games and warehouse tables refresh and
after upcoming predictions are built.

## GitHub Actions

Add `ENABLE_PREDICTION_TRACKING: "true"` to the workflow environment after the
schema is deployed and the independent pipeline has been validated. The
existing `python -m scripts.pipeline` command will then include scoring in the
correct order.

## Current reporting

The Predictions page reports lifetime accuracy, rules-based v1 accuracy, high
confidence accuracy, accuracy by every confidence level, the latest scored game
date, and recent results. The page reads all result pages rather than relying
on Supabase's default 1,000-row response limit.

## Known limitations and next steps

- Accuracy alone does not measure probability calibration.
- Postponed or suspended games remain unscored until they have a final result.
- Predictions generated before tracking was enabled can only be scored if the
  original `game_predictions` row still exists.
- Future evaluation should add Brier score, log loss, calibration plots,
  rolling 7/14/30-day views, predicted-team splits, and model-version
  comparisons.
- ROI tracking should remain separate and should only be introduced if an
  explicit, historically captured market decision is added later.
