# Rules-Based Predictions

AXScout rules-based prediction model `rules_based_v1`, version `0.1.0`, creates
explainable pregame MLB forecasts. It is an experimental baseline, not a
trained machine-learning model and not betting advice.

## Running the pipeline

Apply the `game_predictions` SQL in `supabase/schema.sql`, then run:

```powershell
python -m scripts.pipelines.build_predictions_pipeline
```

The master pipeline runs this step only when `ENABLE_PREDICTIONS=true`. In the
scheduled pipeline, predictions should run after game, aggregate, injury, and
odds refreshes.

## Inputs

The feature assembler reads:

- `fact_games` and `dim_teams` for upcoming matchups and probable pitchers
- `agg_team_season` for season record and run differential
- `agg_team_offense_season` and `agg_team_pitching_season` for season context
- `agg_team_rolling_14` for recent results and run differential
- `agg_team_offense_rolling_7` and `agg_team_pitching_rolling_7` for recent form
- `agg_player_pitching_season` for probable starter ERA and WHIP
- `player_injuries` for active injury counts
- `odds_snapshots` for the latest matched American moneyline

Missing optional inputs are neutral. A missing starter, injury feed, or market
line does not prevent a forecast. The pipeline logs missing odds and starter
counts for operational visibility.

## Scoring philosophy

Both teams begin even. The model adds a two-point home-field adjustment and
then applies capped relative adjustments:

| Signal | Maximum adjustment |
| --- | ---: |
| Season win percentage | 6 points |
| Season run differential per game | 6 points |
| Rolling 14 win percentage | 8 points |
| Rolling 14 run differential per game | 6 points |
| Rolling 7 OPS | 5 points |
| Rolling 7 ERA | 5 points |
| Probable starter ERA | 6 points |
| Probable starter WHIP | 2 points |
| Active injury count | 4 points |

Lower ERA, WHIP, and injury counts are better. Missing values contribute zero.
The strongest available signals supporting the selected team become the stored
deterministic explanation.

## Probability and confidence

The net point edge is applied around a 50% baseline. Version 0.1.0 clamps home
win probability to 35%-65% to avoid false precision. Away probability is one
minus home probability.

- Low: winner edge is under 4 percentage points
- Medium: winner edge is 4-8 percentage points
- High: winner edge is over 8 percentage points

## Market comparison

American odds are converted to implied probability:

- Negative odds: `abs(odds) / (abs(odds) + 100)`
- Positive odds: `100 / (odds + 100)`

Market odds do not affect the baseball forecast. After prediction, AXScout
compares its probability with the latest available moneyline. A difference
greater than three percentage points is described conservatively as AXScout
being stronger than the market on that team. Otherwise the result is
`Aligned with market`. Missing lines produce `No market line available`.

## Known limitations

- Rules and weights are expert-defined and have not yet been statistically fit.
- Probabilities are not calibrated against historical out-of-sample games.
- Injury counts do not yet weight player quality or injury severity.
- Starter workload, bullpen availability, park, weather, and lineup data are
  not included.
- The latest sportsbook is selected deterministically; a consensus market is a
  future improvement.
- Predictions are updated in place before game completion. Final outcomes and
  the prediction fields used for evaluation are preserved in
  `prediction_results` by model name and version.

## Future ML path

The feature assembler is intentionally separate from the scoring model. A
future trained model can consume the same normalized game-level features,
add richer pregame context, calibrate probabilities, and write a new
`model_name` and `model_version` without replacing the rules-based baseline.
