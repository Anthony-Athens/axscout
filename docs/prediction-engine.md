# Prediction Engine

The active AXScout prediction engine is the explainable rules model documented
in `docs/rules-based-predictions.md`. Model `rules_based_v1` version `0.2.0`
adds pitcher-archetype matchup intelligence as a small, optional signal; it
does not replace the existing team, starter, injury, or market context.

## Archetype matchup contract

For each upcoming game, the prediction pipeline resolves each probable
starter's latest `pitcher_profiles.primary_archetype_id`, requires matching
season/model rows from `team_vs_pitcher_archetype`, and attaches the opposing
offense's plate appearances, OPS, xwOBA, strikeout rate, walk rate, and sample
quality. The prediction output persists only the starter archetype names plus
offense OPS, xwOBA, and sample quality needed for frontend transparency.

Missing starters, profiles, archetypes, aggregate rows, or undeployed optional
archetype source tables are neutral and do not block prediction generation.
Low samples are also neutral. Medium samples receive half weight, high samples
receive full weight, each offense is capped at three points, and the final net
game adjustment is capped at four probability points.

## Deployment and execution

Apply `supabase/schema.sql` before deploying the page/pipeline code. The schema
adds eight nullable columns to `game_predictions` with `add column if not
exists`, so existing prediction rows remain valid.

When archetype context should be available, execute stages in this order:

1. Build pitcher archetypes.
2. Build batter/team archetype matchup aggregates.
3. Refresh games, team/player metrics, injuries, and odds.
4. Build predictions.
5. Score completed predictions.

Run predictions directly:

```powershell
python -m scripts.pipelines.build_predictions_pipeline
```

Or through the master pipeline:

```powershell
$env:ENABLE_PITCHER_ARCHETYPES="true"
$env:ENABLE_ARCHETYPE_MATCHUPS="true"
$env:ENABLE_PREDICTIONS="true"
python -m scripts.pipeline
```

No new prediction-specific secret or environment flag is required. If the two
archetype stages remain disabled in GitHub Actions, predictions continue with a
neutral archetype adjustment.

## Limitations

Archetype matchup history is descriptive, not causal. It does not control for
handedness, park, lineup, opponent quality, pitch sequencing, cluster drift, or
an individual pitcher's day-to-day execution. It must not be interpreted as a
prop projection, sportsbook recommendation, or guarantee of game outcome.
