# Team Rolling 7 Metrics

AXScout uses rolling seven-day team aggregates for the Scouting Report's recent
offensive and pitching comparisons. This avoids sparse calendar-week samples
early on Mondays and Tuesdays while preserving weekly tables for trend charts.

## Tables

- `agg_team_offense_rolling_7`
- `agg_team_pitching_rolling_7`

Each row is keyed by `season`, `window_end_date`, and `team_abbreviation`. The
window is seven inclusive calendar days: `window_start_date` through
`window_end_date`.

## Window Configuration

By default, the window ends today and starts six days earlier. Override it with:

```text
TEAM_ROLLING_7_END_DATE=2026-06-30
TEAM_ROLLING_7_START_DATE=2026-06-24
```

When only the end date is supplied, the pipeline calculates the start date.
Explicit start and end dates must still describe exactly seven days.

Run independently with:

```powershell
python -m scripts.pipelines.build_team_rolling_7_statcast_pipeline
```

The master pipeline enables this stable refresh by default. Set
`ENABLE_TEAM_ROLLING_7=false` to skip it locally.

## Metric Sources

Offense is calculated directly from terminal Statcast plate-appearance events.
Hits, total bases, official at-bats, walks, hit by pitch, and sacrifice flies
produce BA, OBP, SLG, and OPS. Home runs and strikeouts are event counts, runs
use Statcast batting-score changes when available, and average exit velocity is
the mean of available `launch_speed` values. Weekly rates are never averaged.

Pitch counts and quality metrics come from Statcast: batters faced, strikeouts,
walks, hits allowed, home runs allowed, average pitch speed, and average spin
rate. Official MLB Stats API date-range pitching summaries provide outs,
earned runs, hits, walks, and strikeouts. ERA and WHIP are calculated only when
those official outs are available. If the official source fails, ERA and WHIP
remain null while reliable Statcast metrics still load.

## Scouting Report Data Sources

- Season Comparison: `agg_team_season`, `agg_team_offense_season`, and
  `agg_team_pitching_season`.
- Offensive/Pitching Comparison: team rolling-seven tables documented here.
- Rolling 14 Comparison: `agg_team_rolling_14`.
- Hot/Cold player cards: `agg_player_offense_rolling_7` and
  `agg_player_pitching_rolling_7`.
- Team and player trend charts: existing weekly tables; unchanged by this
  pipeline.

The exportable Scouting Report uses the same already-loaded rolling-seven team
rows as the on-screen comparison and does not issue duplicate queries.

## Refresh Logging

The pipeline logs as `build_team_rolling_7_statcast` in `data_refresh_runs` and
prints the source, transformed offense, transformed pitching, loaded offense,
and loaded pitching row counts. Loads are idempotent upserts and never delete
historical windows.
