# Team Season Metrics

## Summary and Trend Grains

The Team Trends **Offensive Statistics** and **Pitching Statistics** sections use season-to-date tables. The weekly charts continue to use `agg_team_offense_weekly` and `agg_team_pitching_weekly`; weekly rows are never averaged to produce season rates.

## Season Offense

`agg_team_offense_season` is built directly from the full-season Statcast event extraction. Batting average, OBP, slugging, and OPS are calculated from season numerator and denominator totals. Home runs, runs, and average exit velocity use the same full-season event set.

The team Statcast pipeline only writes season tables when its resolved extraction window covers `SEASON_START_DATE`. A normal 30-day local refresh updates weekly trends but cannot replace season rows with partial-window values.

## Season Pitching

`agg_team_pitching_season` combines two sources:

- Full-season Statcast supplies average pitch speed, average spin rate, and an initial strikeout count.
- The official MLB Stats API season pitching summary supplies innings pitched, earned runs, hits allowed, walks, strikeouts, ERA, and WHIP.

The official summary is authoritative for ERA and WHIP. It runs through `build_pitching_summary_pipeline` when `ENABLE_PITCHING_SUMMARY=true` and preserves Statcast pitch-speed and spin-rate fields.

## Refresh Order

The master pipeline refreshes full-season Statcast rows before official pitching summaries. Scheduled refreshes enable both stages so official ERA and WHIP are applied after Statcast pitch-quality metrics.

Apply the new season-table definitions and public read policies from `supabase/schema.sql` before enabling these queries in a deployed environment.
