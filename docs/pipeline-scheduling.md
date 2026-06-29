# Pipeline Scheduling

AX Scout uses `.github/workflows/daily-data-refresh.yml` to refresh production
data automatically. The workflow runs daily at 10:17 UTC and can also be
started manually from GitHub Actions.

The job checks out the repository, installs Python 3.12 and the dependencies
from `scripts/data/requirements.txt`, then runs:

```text
python -m scripts.pipeline
```

The scheduled job loads data beginning at `SEASON_START_DATE=2026-03-27`.
Team and player Statcast pipelines are enabled. Because `SEASON_END_DATE` and
`STATCAST_END_DATE` are not set, their configured pipelines refresh through
the current date.

## Repository Secrets

Add these repository secrets in GitHub under **Settings > Secrets and
variables > Actions > New repository secret**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is read from GitHub Actions secrets at runtime. It must
not be placed in the workflow file, committed environment files, logs, or
documentation.

## Manual Refresh

1. Open the repository's **Actions** tab.
2. Select **Daily AX Scout Data Refresh**.
3. Select **Run workflow**.
4. Choose the branch and confirm **Run workflow**.

The concurrency group permits only one AX Scout refresh at a time. A manually
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
