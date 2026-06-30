# Team Season Metrics

## Summary and Trend Grains

The Team Trends **Offensive Statistics** and **Pitching Statistics** sections use season-to-date tables. The weekly charts continue to use `agg_team_offense_weekly` and `agg_team_pitching_weekly`; weekly rows are never averaged to produce season rates.

## Season Offense

`agg_team_offense_season` is built directly from the full-season Statcast event extraction. Batting average, OBP, slugging, and OPS are calculated from season numerator and denominator totals. Home runs, runs, and average exit velocity use the same full-season event set.

The team Statcast pipeline only writes season tables when its resolved extraction window covers `SEASON_START_DATE`. A normal 30-day local refresh updates weekly trends but cannot replace season rows with partial-window values.

The offense table can also be rebuilt independently:

```powershell
$env:SEASON_START_DATE = "2026-03-27"
python -m scripts.pipelines.build_team_offense_season_pipeline
```

The independent pipeline fetches Statcast once for the resolved full-season window, prints source/transformed/loaded row counts, requires exactly 30 team abbreviations, upserts on `(season, team_abbreviation)`, and records success or failure in `data_refresh_runs`. It refuses to load a default 30-day lookback because that would label partial metrics as season-to-date.

## Season Pitching

`agg_team_pitching_season` combines two sources:

- Full-season Statcast supplies average pitch speed, average spin rate, and an initial strikeout count.
- The official MLB Stats API season pitching summary supplies innings pitched, earned runs, hits allowed, walks, strikeouts, ERA, and WHIP.

The official summary is authoritative for ERA and WHIP. It runs through `build_pitching_summary_pipeline` when `ENABLE_PITCHING_SUMMARY=true` and preserves Statcast pitch-speed and spin-rate fields.

## Refresh Order

The master pipeline refreshes full-season Statcast rows before official pitching summaries. Scheduled refreshes enable both stages so official ERA and WHIP are applied after Statcast pitch-quality metrics.

Apply the new season-table definitions and public read policies from `supabase/schema.sql` before enabling these queries in a deployed environment.

## Troubleshooting

1. Confirm `public.agg_team_offense_season` exists and has the unique constraint `unique(season, team_abbreviation)` from `supabase/schema.sql`.
2. Confirm `SEASON_START_DATE` is present in the process running the pipeline. Without it, the independent pipeline fails clearly and the combined weekly pipeline skips season rows.
3. Check `data_refresh_runs` for `build_team_offense_season_pipeline` or `build_team_weekly_statcast_pipeline` failures.
4. Compare the console counts. A healthy current-season run should extract Statcast events, transform 30 team rows, and load 30 rows.
5. Confirm the service-role key is used by Python loaders and that the deployed table columns match the payload fields documented above.

Set `ENABLE_TEAM_OFFENSE_SEASON=true` to let `scripts.pipeline` run the independent build when the weekly Statcast pipeline is disabled. When the weekly pipeline is enabled with `SEASON_START_DATE`, its shared full-season extraction populates the same table without a second expensive Statcast download.
