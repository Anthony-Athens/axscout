# Player Rolling 7 Metrics

## Purpose

Scouting Report hot and cold player cards use rolling seven-day metrics so player form remains meaningful early in a calendar week. Weekly player aggregates remain available for weekly trend charts and are not used by these cards.

## Tables

- `agg_player_offense_rolling_7`
- `agg_player_pitching_rolling_7`

Both tables use the unique grain `(season, window_end_date, team_abbreviation, mlb_player_id)`. Public read policies support unauthenticated Scouting Report access.

## Window

The default window ends on the pipeline run date and begins six days earlier, producing seven inclusive calendar days. `ROLLING_7_END_DATE` overrides the end date. `ROLLING_7_START_DATE` may also be supplied, but the two dates must still span exactly seven inclusive days.

Run independently with:

```powershell
python -m scripts.pipelines.build_player_rolling_7_statcast_pipeline
```

The master pipeline runs this stage by default. Set `ENABLE_PLAYER_ROLLING_7=false` only when the rolling tables have not yet been deployed or the refresh must be intentionally skipped.

## Metrics

Offense reuses the event definitions from the player weekly and season transforms. BA, OBP, SLG, and OPS are calculated from rolling-window hits, at-bats, walks, HBP, sacrifice flies, and total bases rather than averaging weekly rates. Average exit velocity is calculated from available `launch_speed` values.

Pitching strikeouts, walks, hits, home runs allowed, batters faced, pitch speed, and spin rate come from Statcast events. The pipeline requests official MLB Stats API `byDateRange` pitching summaries for innings, earned runs, ERA, WHIP, and authoritative counting totals. If that enrichment is unavailable, the Statcast metrics still load while ERA, WHIP, innings, and earned runs remain null.

## Scouting Report Rules

- Offense qualification: at least 10 plate appearances.
- Pitching qualification: at least 10 batters faced.
- Hot offense: OPS descending, then average exit velocity descending.
- Cold offense: OPS ascending, then strikeouts descending.
- Hot pitching: ERA ascending, WHIP ascending, then strikeouts descending.
- Cold pitching: ERA descending, WHIP descending, hits allowed descending, then home runs allowed descending.
- When fewer than three qualified pitchers have ERA, pitching rankings fall back to WHIP and supported counting metrics.

Missing metrics display `--`. When no player qualifies, the card displays `No qualified players in the last 7 days.`

## Limitations

Probable starters and rolling player form are separate features. A probable starter can lack a rolling row if the pitcher did not meet the seven-day workload threshold. Official date-range pitching data can also lag completed games, in which case ERA and WHIP remain nullable until the next successful refresh.
