# Pipeline Scheduling

AXScout uses `.github/workflows/daily-data-refresh.yml` to refresh production
data automatically. The workflow runs daily at 10:17 UTC and can also be
started manually from GitHub Actions.

The job checks out the repository, installs Python 3.12 and the dependencies
from `scripts/data/requirements.txt`, then runs:

```text
python -m scripts.pipeline
```

The scheduled job loads data beginning at `SEASON_START_DATE=2026-03-27`.
Team and player Statcast pipelines are enabled. The scheduled refresh also
loads player injuries and odds, builds predictions, and scores completed
predictions. Because `SEASON_END_DATE` and `STATCAST_END_DATE` are not set,
their configured pipelines refresh through the current date.

## Repository Secrets

Add these repository secrets in GitHub under **Settings > Secrets and
variables > Actions > New repository secret**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ODDS_API_KEY`

The service-role key is read from GitHub Actions secrets at runtime. It must
not be placed in the workflow file, committed environment files, logs, or
documentation. `ODDS_API_KEY` must also be configured as a GitHub Actions
repository secret; odds ingestion cannot call The Odds API without it.

## Scheduled Pipeline Environment

The workflow passes the following environment variables to
`python -m scripts.pipeline`:

- Supabase: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, both sourced from
  repository secrets.
- Odds ingestion: `ODDS_API_KEY` from a repository secret, plus
  `ENABLE_ODDS=true`, `ODDS_API_REGIONS=us`,
  `ODDS_API_MARKETS=h2h,spreads,totals`, and
  `ODDS_API_ODDS_FORMAT=american`.
- Player injuries: `ENABLE_PLAYER_INJURIES=true`.
- Prediction generation: `ENABLE_PREDICTIONS=true`.
- Prediction tracking: `ENABLE_PREDICTION_TRACKING=true`.

The master pipeline completes games, warehouse, and metric refreshes before
loading injuries and odds. It then builds predictions and scores completed
predictions last, so scoring sees the latest game results and prediction data.
When enabled, pitcher archetypes and archetype matchup aggregates are built
after the core team/player metrics and before injuries, odds, predictions, and
prediction scoring. This makes the newest compatible matchup context available
to predictions without changing the required daily stages.

Pitcher archetypes are intentionally not enabled in the daily workflow during
Phase 1A. After the schema is deployed and a production date window is chosen,
add `ENABLE_PITCHER_ARCHETYPES=true` plus the `PITCHER_ARCHETYPE_*` variables
documented in `docs/pitcher-archetypes.md` to the workflow environment. Until
then, the master pipeline logs that the optional stage is skipped.

Archetype matchups are also disabled by default. `ENABLE_ARCHETYPE_MATCHUPS`
depends on primary pitcher memberships for the same
`ARCHETYPE_MATCHUP_SEASON` and `ARCHETYPE_MATCHUP_MODEL_VERSION`. When enabling
it later, run `ENABLE_PITCHER_ARCHETYPES=true` first (or in the same master
pipeline invocation) and configure the remaining `ARCHETYPE_MATCHUP_*`
variables documented in `docs/pitcher-archetypes.md`. Do not enable the matchup
stage in GitHub Actions until both new aggregate tables have been deployed and
the model-version dependency has been verified.

Prediction model `rules_based_v1` version `0.2.0` reads these tables
optionally. If either archetype stage is disabled, has no eligible rows, or is
temporarily unavailable, prediction generation continues with a neutral
archetype adjustment. No new prediction environment flag is required.

## Manual Refresh

1. Open the repository's **Actions** tab.
2. Select **Daily AXScout Data Refresh**.
3. Select **Run workflow**.
4. Choose the branch and confirm **Run workflow**.

The concurrency group permits only one AXScout refresh at a time. A manually
started run waits for an active scheduled run instead of cancelling it.

## Verification

Confirm that the GitHub Actions run completed successfully, then inspect the
latest refresh records in Supabase:

```sql
select
  pipeline_name,
  status,
  source_date,
  records_loaded,
  started_at,
  finished_at,
  error_message
from public.data_refresh_runs
order by started_at desc
limit 25;
```

Each enabled pipeline should have a recent `success` row with a populated
`finished_at` timestamp. A `failed` row includes `error_message`; use the
matching GitHub Actions log to locate the failing pipeline stage.
