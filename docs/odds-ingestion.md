# MLB Odds Ingestion

AXScout ingests current MLB market lines from [The Odds API v4](https://the-odds-api.com/liveapi/guides/v4/)
using the `baseball_mlb` sport key. This data supports market-aware Predictions
page context and future model features; it does not produce wagering advice.

## Configuration

The API key is server-side only and must never use a `NEXT_PUBLIC_` prefix.

```text
ODDS_API_KEY=your-provider-key
ENABLE_ODDS=true
ODDS_API_REGIONS=us
ODDS_API_MARKETS=h2h,spreads,totals
ODDS_API_ODDS_FORMAT=american
ODDS_API_DATE_FORMAT=iso
```

`ODDS_API_KEY` is required only when the odds pipeline is enabled. The supported
markets are moneyline (`h2h`), run line (`spreads`), and game total (`totals`).
Player props are intentionally excluded.

## Snapshot Storage

`public.odds_snapshots` is append-only. Each refresh uses one `snapshot_at`
timestamp and inserts one row per provider event, sportsbook, and market. This
preserves line movement for later analysis. The loader does not delete or
replace previous observations.

Provider team names are normalized to AXScout abbreviations before storage.
Prices are stored as numeric values so the configured American or decimal format
is preserved, and `odds_format` records how they should be displayed.

Public RLS permits reads for the Predictions page. Writes continue to require
the service role used by the Python pipeline.

## MLB Game Matching

The transformer matches an odds event to `games.mlb_game_pk` using:

1. The event start converted to the America/New_York calendar date.
2. Canonical home-team abbreviation.
3. Canonical away-team abbreviation.

If there is no candidate, or multiple candidates exist for a same-day
doubleheader, `mlb_game_pk` remains null. The odds snapshot still loads. This
avoids silently attaching a market to the wrong game. Unmatched event counts are
printed and recorded with the pipeline run context.

## Running Locally

Apply the tracked Supabase schema, configure the environment variables, then run:

```powershell
python -m scripts.pipelines.load_odds_pipeline
```

The master pipeline runs odds ingestion only when `ENABLE_ODDS=true`. Refreshes
are logged in `data_refresh_runs` under the pipeline name `load_odds`, including
the loaded record count and any failure message.

## GitHub Actions

To enable scheduled ingestion:

1. Add `ODDS_API_KEY` as a GitHub Actions secret.
2. Add `ENABLE_ODDS=true` to the workflow environment.
3. Add optional region, market, odds-format, and date-format values when the
   defaults are not appropriate.

The repository workflow is not enabled automatically because provider requests
consume a paid or rate-limited quota.

## Quota Considerations

The Odds API charges current-odds usage by region and returned market. The
default request asks for three markets in one region. The extractor prints the
provider's last-request cost, used quota, and remaining quota response headers.
HTTP 429 responses fail clearly and do not modify existing snapshots.

## Predictions Page

The Predictions page selects upcoming snapshots and keeps the latest row per
event, sportsbook, and market. It combines moneyline, spread, and total into one
display row and joins probable starters through `mlb_game_pk` when available.
Model lean, win probability, and confidence remain explicit placeholders.

## Future ML Usage

Historical snapshots can support closing-line comparisons, implied probability,
market consensus, line movement, sportsbook dispersion, and model-versus-market
features. Those calculations and any predictive model remain outside this
sprint.
