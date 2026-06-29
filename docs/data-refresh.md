# Data Refresh Windows

AX Scout keeps local refreshes small by default and supports an explicit
season-to-date mode for launch and backfills.

## Default Windows

- Games: `GAMES_LOOKBACK_DAYS=7` and `GAMES_LOOKAHEAD_DAYS=7`.
- Team Statcast: `STATCAST_LOOKBACK_DAYS=30`.
- Player Statcast: `PLAYER_STATCAST_LOOKBACK_DAYS=30`.

The default player run updates weekly aggregates only. Existing player season
rows are preserved so a partial extract cannot overwrite season-to-date data.

## Season-to-Date Refresh

Set the season start before running the master pipeline. Keep the optional
Statcast jobs disabled for a focused game-results backfill:

```powershell
$env:SEASON_START_DATE = "2026-03-25"
$env:SEASON_END_DATE = "2026-06-29" # Optional; defaults to today
$env:ENABLE_TEAM_WEEKLY_STATCAST = "false"
$env:ENABLE_PLAYER_STATCAST = "false"
python -m scripts.pipeline
```

When `SEASON_START_DATE` is set, the games, team Statcast, and player Statcast
pipelines begin at that date. Games end at `SEASON_END_DATE` when provided and
otherwise end today. Statcast ends at today unless `STATCAST_END_DATE` is
provided. Player season aggregates are rebuilt only when the resolved
extraction window covers `SEASON_START_DATE`.

The master pipeline is the required command for a game-results backfill. It
loads the schedule first, then rebuilds `fact_games`, `agg_team_daily`,
`agg_team_season`, and `agg_team_rolling_14` in dependency order. All source
and aggregate reads are paginated so a full MLB season is not truncated at the
Supabase API row limit.

For a custom Statcast-only range, use:

```powershell
$env:STATCAST_START_DATE = "2026-04-01"
$env:STATCAST_END_DATE = "2026-06-30"
```

`STATCAST_START_DATE` takes precedence over `SEASON_START_DATE`. Custom ranges
that start after the configured season start preserve existing player season
aggregates. Every loader uses existing upsert conflict keys and does not delete
rows outside the selected window.
