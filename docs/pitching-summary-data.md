# Official Pitching Summary Data

## Source

AXScout uses the official MLB Stats API `stats` endpoint with the pitching group and regular-season game type.

- Player season summaries use `stats=season`.
- Player weekly summaries use `stats=byDateRange` for the exact week boundaries already stored in the weekly aggregate tables.
- Team weekly ERA and WHIP are calculated from the official date-range player summary components for each team: earned runs, hits, walks, and innings pitched. A validation sample matched the MLB team date-range endpoint exactly.

No FanGraphs or Baseball-Reference pages are scraped, and ERA is not derived from raw Statcast events.

## Metrics Populated

The pipeline updates only `era` and `whip` in:

- `agg_player_pitching_season`
- `agg_player_pitching_weekly`
- `agg_team_pitching_weekly`

Existing Statcast-derived fields, including average pitch speed and average spin rate, are preserved. Existing strikeout, walk, hit, and home-run totals are also preserved.

Player ERA and WHIP come directly from MLB summaries. Team weekly values use the standard formulas over official MLB component totals:

- `ERA = earned_runs * 9 / innings_pitched`
- `WHIP = (walks + hits_allowed) / innings_pitched`

Innings are converted to recorded outs before calculation so values such as `5.1` and `5.2` are handled correctly.

## Pipeline

Run independently:

```powershell
python -m scripts.pipelines.build_pitching_summary_pipeline
```

The current season is selected from `PITCHING_SUMMARY_SEASON`, then `SEASON_START_DATE`, then the current calendar year. To enable the enrichment in the master pipeline:

```text
ENABLE_PITCHING_SUMMARY=true
```

The flag defaults to `false`. All official source requests complete before aggregate rows are modified. Source failures are recorded in `data_refresh_runs` and leave existing pitching aggregate values unchanged.

## Limitations

There is no `agg_team_pitching_season` table in the current schema, so the pipeline does not store team season ERA, WHIP, or strikeouts. A future dedicated team pitching season table is recommended if the product needs a true season-level pitching snapshot separate from the latest weekly row.

The pipeline enriches only existing Statcast aggregate rows. It does not create partial player or team aggregates when a matching row is absent, and it does not replace Statcast metrics with official summary values.

MLB may return a pitching appearance with batters faced but zero recorded outs. ERA and WHIP are mathematically undefined for those rows, so AXScout preserves null values instead of inventing a rate. In the initial 2026 refresh, this affected one player-season row and eleven player-week rows; every team-week row was populated.
