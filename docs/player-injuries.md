# Player Injuries

AXScout stores active MLB injury context in `public.player_injuries`. The data
supports the Scouting Report today and provides stable identifiers for future
prediction features.

## Source

The optional injury pipeline uses official MLB Stats API data:

- Each club's 40-man roster supplies the current player status and injured-list
  designation.
- Team transactions enrich active entries with the original injured-list date
  and a diagnosis when MLB includes one in the transaction description.

The 40-man roster is the active-state authority. This avoids treating older
transactions as current injuries and excludes most minor-league roster noise.
MLB does not currently provide a consistent structured expected-return date, so
`expected_return` remains null unless a reliable official field becomes
available. The pipeline does not scrape third-party injury pages.

## Storage

`player_injuries` contains the season, team, MLB player ID, player name, roster
status, injury description, injured-list designation, placement date, source
timestamp, and active flag. Nullable source fields remain null instead of being
inferred. A deterministic `injury_key` makes refreshes idempotent, while public
RLS permits reads but not writes.

Players with MLB IDs are safely upserted into `dim_players`. Existing names and
biographical data are preserved; injury data only fills missing identity fields
and updates the current team.

## Refresh Behavior

Run the pipeline independently with:

```powershell
python -m scripts.pipelines.load_player_injuries_pipeline
```

Enable it in the master refresh with:

```text
ENABLE_PLAYER_INJURIES=true
```

The pipeline logs its start, success, or failure to `data_refresh_runs` and
prints source, transformed, loaded, and deactivated row counts. Reconciliation
only runs after all 30 MLB teams are fetched. Rows still present in MLB's active
roster statuses are upserted; prior current-season rows absent from a complete
refresh are marked inactive. No injury rows are deleted.

If MLB is unavailable or the response is incomplete, the injury refresh is
marked failed and existing rows remain untouched. Because the source is
optional, a failure does not block the rest of `scripts.pipeline`.

## Scouting Report

The Scouting Report queries active injuries for both selected teams. It shows a
compact injury list and tags injured players wherever their MLB player ID
appears in season leaders, rolling seven-day hot/cold lists, or probable starter
cards. Missing injury data produces the friendly `No active injuries found.`
state. Generated Markdown, HTML, and plain-text reports include the same injury
context and mark ranked injured players.

## Future Prediction Features

The table can later support deterministic model inputs such as active injuries
by team, injured pitchers and hitters, an injured probable-starter flag, and a
top-player injury flag. A severity feature should wait for a reliable official
classification; free-text descriptions should not be treated as severity
without a documented normalization model.
