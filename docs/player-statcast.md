# Player Statcast Aggregates

The player Statcast pipeline builds public weekly and year-to-date offense and
pitching aggregates. It runs independently with:

```powershell
python -m scripts.pipelines.build_player_statcast_pipeline
```

`PLAYER_STATCAST_LOOKBACK_DAYS` controls the default extraction window and
defaults to 30 days. Short-window runs update weekly aggregates and preserve
the existing season aggregates. Set `SEASON_START_DATE=YYYY-MM-DD` to extract
from the season start through today and safely rebuild the player season
aggregates. `STATCAST_START_DATE` can override the extraction start and
`STATCAST_END_DATE` can pin the end; when omitted, the end is today.

Season aggregates are rebuilt only when the resolved window covers the
configured `SEASON_START_DATE`, preventing a local 30-day run from replacing
season-to-date totals with partial data. The master pipeline skips player work
unless `ENABLE_PLAYER_STATCAST=true`.

Missing player names can be backfilled independently with:

```powershell
python -m scripts.pipelines.backfill_player_names_pipeline
```

The backfill preserves every nonblank `dim_players.full_name`. For blank rows,
it first checks the operational `players` table and then falls back to MLB's
official people endpoint. Updates use the MLB player ID plus the original blank
value as a concurrency guard, and each run is recorded in
`data_refresh_runs`.

## Offense

Plate appearances and rate statistics use terminal Statcast `events` values.
Hits are singles, doubles, triples, and home runs. Official at-bats use the
same conservative event set as the team Statcast transform. OBP includes hits,
walks, hit by pitch, and sacrifice flies; SLG uses total bases per at-bat.

pybaseball's standard Statcast response identifies the pitcher in
`player_name`, but often has no batter-name column. The loader uses matching
records from AXScout's operational `players` table to enrich hitter names,
handedness, and positions. Offense names remain null only when neither source
has the metadata; player IDs and statistics still load normally.

## Pitching

Batters faced, strikeouts, walks, hits allowed, home runs allowed, average
pitch speed, and average spin rate are calculated directly from Statcast.
Pitcher names use `player_name` when available.

ERA and WHIP remain null. Statcast pitch events alone do not provide a reliable
official accounting of earned runs and innings pitched, including scoring
decisions and fractional innings. Those metrics require a future official
pitching-stat source.

## Loading

The loader enriches and upserts `dim_players` before aggregate tables, resolves
each `player_key`, and preserves existing player metadata when neither source
provides a value. No rows are deleted. Failures are recorded in
`data_refresh_runs`; extraction completes before any player rows are changed.
