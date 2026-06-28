# Player Statcast Aggregates

The player Statcast pipeline builds public weekly and year-to-date offense and
pitching aggregates. It runs independently with:

```powershell
python -m scripts.pipelines.build_player_statcast_pipeline
```

`PLAYER_STATCAST_LOOKBACK_DAYS` controls the weekly refresh window and defaults
to 30 days. Season aggregates always use the current calendar year-to-date
Statcast extract so they are not mislabeled partial-window totals. The master
pipeline skips this work unless `ENABLE_PLAYER_STATCAST=true`.

## Offense

Plate appearances and rate statistics use terminal Statcast `events` values.
Hits are singles, doubles, triples, and home runs. Official at-bats use the
same conservative event set as the team Statcast transform. OBP includes hits,
walks, hit by pitch, and sacrifice flies; SLG uses total bases per at-bat.

pybaseball's standard Statcast response identifies the pitcher in
`player_name`, but often has no batter-name column. The loader uses matching
records from AX Scout's operational `players` table to enrich hitter names,
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
