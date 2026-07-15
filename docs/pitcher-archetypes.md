# Pitcher Archetypes Phase 1A

Phase 1A adds an aggregated Statcast arsenal layer, baseline pitcher clusters,
and precomputed similar-pitcher relationships. It does not persist raw pitches,
change predictions or scouting calculations, or generate model labels with an
LLM.

## User-facing purpose

The Pitcher Archetype Explorer gives users a practical starting point for
understanding MLB pitchers through arsenal shape, pitch mix, velocity,
movement, outcome indicators, and similar-pitcher relationships. It is an
orientation and comparison tool: archetypes add context to a pitcher's profile
but do not replace individual scouting, projection, or matchup analysis.

The pitcher routes have distinct jobs:

- `/pitchers` is the primary explorer. It supports searching and filtering
  individual pitchers, comparing key arsenal indicators, and opening a
  pitcher's similarity profile. Pitcher names are the profile links so the
  table can retain team and arsenal context without a separate action column.
- `/pitchers/archetypes` is the archetype library. It starts with the modeled
  groups and explains their defining standardized features, members, and
  available team and batter matchup context.
- `/pitchers/[pitcherId]` summarizes one pitcher's arsenal, primary archetype,
  pitch-type characteristics, and nearest modeled pitchers.
- `/pitchers/archetypes/[slug]` explains one modeled group in detail. Stored
  names and descriptions are shown conservatively and are not embellished in
  the frontend.
- `/matchups` applies the selected pitcher's primary archetype to team and
  batter research. It shows descriptive performance against the full
  archetype, not a prediction for the selected individual pitcher. See
  `docs/matchups.md` for data requirements and interpretation guidance.

Archetype names can be model-generated placeholders unless they have been
manually reviewed. Cluster membership is relative to the eligible pitchers,
feature set, season, and analysis window used in a particular model run. It
should not be interpreted as a permanent baseball taxonomy or a claim that all
pitchers in a group perform identically.

## Reviewing and Naming Archetypes

Use the following workflow when replacing model-generated placeholder labels
with human-readable baseball language:

1. Run the pitcher archetype pipeline for the intended season, window, model
   version, and feature version.
2. Review each archetype's representative pitchers and top defining features
   in the Archetype Library and detail page.
3. Assign a conservative human-readable name that the observed cluster
   characteristics support.
4. Add a short description for quick display and a longer description that
   records the interpretation and its limits.
5. Keep `model_version` and `feature_version` attached to the interpretation so
   the label is not assumed to apply to a different clustering run.

Example manual update:

```sql
update public.pitcher_archetypes
set
  archetype_name = 'Power Fastball / Slider Starters',
  archetype_slug = 'power-fastball-slider-starters',
  short_description = 'Pitchers built around high-velocity fastballs and a primary breaking ball.',
  long_description = 'This archetype generally includes pitchers with elevated fastball velocity, strong breaking-ball usage, and above-average swing-and-miss indicators. Review representative pitchers and defining features before using this label broadly.',
  updated_at = now()
where archetype_id = '<ARCHETYPE_UUID>';
```

Do not rename archetypes blindly. Review cluster features and representative
pitchers first. Because slugs are used in archetype URLs, coordinate a slug
change with any saved or externally shared links.

## Pitcher handedness metadata

`public.dim_players.throws` is the canonical throwing-hand field. Pitcher
profile and Matchups queries join `pitcher_profiles.mlb_player_id` to
`dim_players.mlb_player_id`; handedness is intentionally not duplicated in
`pitcher_profiles` or `pitcher_pitch_profiles`.

The handedness backfill reads eligible pitcher IDs from `pitcher_profiles`,
requests each player's MLB People record, and stores the validated
`pitchHand.code` value (`R`, `L`, or `S`) only when `dim_players.throws` is null.
It does not overwrite existing player metadata or infer values from names or
pitch characteristics.

Run:

```bash
python -m scripts.pipelines.backfill_player_handedness_pipeline
```

The run is recorded in `data_refresh_runs` as
`backfill_player_handedness_pipeline` and logs players checked, updated,
skipped, and errored. MLB records that are unavailable or omit `pitchHand` are
left null. The Pitcher Explorer hides its Hand filter and column when every
loaded profile has null handedness; with partial coverage it displays an em
dash for missing rows. Pitcher profiles omit the throwing-hand phrase when it
is unknown, while Matchups explicitly marks it unavailable.

For opt-in, count-only server diagnostics, set
`PITCHER_METADATA_DIAGNOSTICS=true`. The pitcher data helper then logs profile
rows, joined `dim_players` rows, and joined rows with non-null `throws`; it does
not log player records or credentials.

### Handedness validation SQL

Confirm the actual `dim_players` columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'dim_players'
order by ordinal_position;
```

Check overall metadata population:

```sql
select
  count(*) as total_players,
  count(*) filter (where throws is not null) as players_with_throws
from public.dim_players;
```

Check pitcher-profile join coverage and handedness together:

```sql
select
  count(*) as pitcher_profiles,
  count(dp.*) as joined_players,
  count(*) filter (where dp.throws is not null) as joined_players_with_throws
from public.pitcher_profiles pp
left join public.dim_players dp
  on dp.mlb_player_id = pp.mlb_player_id;
```

If join coverage is incomplete, inspect the missing MLB IDs before running a
backfill:

```sql
select distinct pp.mlb_player_id
from public.pitcher_profiles pp
left join public.dim_players dp
  on dp.mlb_player_id = pp.mlb_player_id
where dp.mlb_player_id is null
order by pp.mlb_player_id;
```

## Data model

- `pitcher_pitch_profiles`: observed pitch-type arsenal aggregates by pitcher,
  season, analysis window, and feature version.
- `pitcher_profiles`: one display/model summary per pitcher and analysis window.
- `pitcher_archetypes`: K-Means clusters with conservative `Archetype N` names.
- `pitcher_archetype_memberships`: primary membership, center distance, and a
  documented confidence proxy of `1 / (1 + center_distance)`.
- `pitcher_archetype_features`: standardized cluster-center summaries.
- `pitcher_similarities`: top ten neighbors with bounded score
  `1 / (1 + Euclidean distance)`.
- `pitcher_model_runs`: pitcher-specific model-run status and parameters.

All player relationships use the existing unique `dim_players.mlb_player_id`.
The existing `data_refresh_runs` table records the pipeline-level refresh. RLS
allows public reads and provides no public write policy; the service-role Python
client performs writes.

## Source and features

The pipeline queries Baseball Savant Statcast through `pybaseball`, keeps raw
pitch rows in memory, and persists only aggregates. Observed pitch-type metrics
include usage, velocity, spin, movement, release, zone/chase, whiff, CSW,
ground-ball, hard-hit, barrel, and xwOBA fields where Statcast supports them.
VAA and HAA remain null in v1 because they require geometry beyond Phase 1A.

Pitcher-level features cover arsenal size and mix, pitch-family usage, velocity
and movement ranges, entropy, whiff, CSW, and xwOBA allowed. Missing display
metrics remain null. Median imputation and missing-value indicators exist only
inside the deterministic model matrix, followed by `StandardScaler`.

K-Means uses a fixed seed (`42`) and configurable cluster count. The stored
silhouette score is a model diagnostic, not evidence that clusters represent
fixed real-world pitcher types. Similarity explanations are deterministic and
do not use an LLM.

## Schema installation

There is currently no migrations directory. Apply the new idempotent pitcher
section in `supabase/schema.sql` through the Supabase SQL editor or the
repository's normal schema deployment process before running the pipeline. Do
not run the pipeline against production before all seven tables, indexes, and
RLS policies exist.

## Configuration

Required existing secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Pitcher configuration:

- `ENABLE_PITCHER_ARCHETYPES` (default `false`)
- `PITCHER_ARCHETYPE_SEASON` (defaults to the current year)
- `PITCHER_ARCHETYPE_START_DATE` (defaults to March 1 of the season)
- `PITCHER_ARCHETYPE_END_DATE` (defaults to today)
- `PITCHER_ARCHETYPE_MIN_PITCHES` (default `300`)
- `PITCHER_ARCHETYPE_CLUSTER_COUNT` (default `8`)
- `PITCHER_ARCHETYPE_MODEL_VERSION` (default `pitcher_archetypes_v1`)
- `PITCHER_ARCHETYPE_FEATURE_VERSION` (default `pitcher_features_v1`)

Install Python dependencies from `scripts/data/requirements.txt`, which now
includes scikit-learn.

```bash
export ENABLE_PITCHER_ARCHETYPES=true
export PITCHER_ARCHETYPE_SEASON=2026
export PITCHER_ARCHETYPE_START_DATE=2026-03-27
export PITCHER_ARCHETYPE_END_DATE=2026-06-30
python -m scripts.pipelines.build_pitcher_archetypes_pipeline
```

Through the master pipeline:

```bash
export ENABLE_PITCHER_ARCHETYPES=true
python -m scripts.pipeline
```

The pipeline logs source pitches, eligible pitchers, aggregate/output counts,
model version, feature version, and errors. Empty Statcast results finish safely
without replacing existing model output. Non-empty reruns replace only the
matching season/model/window output before idempotent inserts.

## Frontend and empty states

Routes are `/pitchers`, `/pitchers/[pitcherId]`, `/pitchers/archetypes`, and
`/pitchers/archetypes/[slug]`. Phase 1B also adds `/pitchers/map`. If the schema
is not deployed or tables contain no output, pages explain how data becomes
available and never substitute demo production records.

### Pitcher Map interpretation

The Pitcher Map reads existing `pitcher_profiles.map_x` and `map_y` values. One
point represents one pitcher's latest profile; color represents the primary
archetype when available. Nearby points indicate more similar standardized
arsenal and pitch-profile characteristics.

The axes are model similarity-space coordinates. They are not velocity,
movement, performance, quality, or any other direct baseball metric, and their
orientation can change between model versions. Phase 1B does not synthesize
coordinates in the browser or change the model pipeline. If `map_x` and `map_y`
are null, the page displays a polished coming-soon state until an upstream
model run stores coordinates. A missing map does not mean pitcher profiles or
archetype memberships are unavailable.

The map supports season, archetype, and pitcher-name filters. A role filter is
shown only when `starter_share` exists. Hover details expose the pitcher's
archetype, primary pitch, fastball velocity, whiff rate, and membership
confidence; selecting a point opens the pitcher profile.

### Profile visualizations

Pitcher profiles include a pitch-usage bar chart, where labels retain observed
pitch counts, and a movement scatter plot using aggregated horizontal and
vertical `pfx_x`/`pfx_z`-derived features. Movement point size reflects pitch
usage. The full mobile-scrollable arsenal table remains the source for exact
display values, and null metrics remain visibly unavailable.

Archetype pages show model and feature versions, representative pitchers,
silhouette scores, and defining standardized features. Generated `Archetype N`
labels remain placeholders; generic descriptions display as pending manual
review rather than implying an unsupported baseball taxonomy.

## Phase 1C archetype matchup intelligence

Phase 1C adds two public-read aggregate tables:

- `batter_vs_pitcher_archetype` stores batter results by season, analysis
  window, primary pitcher archetype, and model version.
- `team_vs_pitcher_archetype` stores the equivalent team offensive results.

The pipeline fetches Statcast in memory, joins each pitcher's MLB ID to the
primary `pitcher_archetype_memberships` row for the configured season/model,
and persists only batter/team aggregates. It does not create a raw pitch table.
Counting metrics come from terminal plate-appearance events. Whiff and CSW use
pitch descriptions; exit velocity, hard-hit, barrel, xwOBA, wOBA, and run value
remain null when their Statcast source fields are unavailable.

Configuration:

- `ENABLE_ARCHETYPE_MATCHUPS` (default `false`)
- `ARCHETYPE_MATCHUP_SEASON` (defaults to the current year)
- `ARCHETYPE_MATCHUP_START_DATE` (defaults to March 1 of the season)
- `ARCHETYPE_MATCHUP_END_DATE` (defaults to today)
- `ARCHETYPE_MATCHUP_MODEL_VERSION` (default `pitcher_archetypes_v1`)
- `ARCHETYPE_MATCHUP_FEATURE_VERSION` (default `archetype_matchups_v1`)
- `ARCHETYPE_MATCHUP_MIN_PA_BATTER` (default `20`)
- `ARCHETYPE_MATCHUP_MIN_PA_TEAM` (default `50`)

```bash
export ENABLE_ARCHETYPE_MATCHUPS=true
export ARCHETYPE_MATCHUP_SEASON=2026
export ARCHETYPE_MATCHUP_START_DATE=2026-03-27
export ARCHETYPE_MATCHUP_END_DATE=2026-06-30
export ARCHETYPE_MATCHUP_MODEL_VERSION=pitcher_archetypes_v1
export ARCHETYPE_MATCHUP_FEATURE_VERSION=archetype_matchups_v1
python -m scripts.pipelines.build_archetype_matchups_pipeline
```

Through the master pipeline, run pitcher archetypes first so the configured
primary memberships exist:

```bash
export ENABLE_PITCHER_ARCHETYPES=true
export ENABLE_ARCHETYPE_MATCHUPS=true
python -m scripts.pipeline
```

Sample quality is `low` below the configured PA threshold, `medium` from one to
less than two times the threshold, and `high` at two times the threshold or
more. These labels describe sample volume only; they do not validate predictive
signal.

Archetype detail pages provide sortable team and batter tables. Pitcher profile
pages summarize leading offense against the pitcher's primary archetype and
explicitly state that the results are not specific to that individual pitcher.
The Scouting Report optionally links expected starters to the opposing team's
aggregate performance against that starter's archetype. This is read-only
context and does not alter existing Scouting Report calculations.

Rules-based predictions version `0.2.0` also consumes the team aggregates as a
small, optional signal. It matches season and pitcher model version, ignores
low samples, discounts medium samples, and caps the total game-level movement
at four probability points. Missing matchup data remains neutral. The stored
prediction transparency fields contain archetype names, OPS, xwOBA, and sample
quality; they do not claim an individual-pitcher projection.

## Limitations and next phases

All displayed rates and matchup aggregates are sensitive to sample size and
the selected analysis window. Small pitch totals can make arsenal usage,
whiff, and contact-quality metrics unstable. Similarity scores describe
distance in the standardized feature matrix; they do not imply identical
talent, future performance, pitch quality, role, health, or developmental
trajectory. Compare seasons and model versions cautiously because the eligible
population, inputs, cluster identities, and map orientation can change.

Phase 1A does not infer starter share, VAA, or HAA; does not persist raw pitches;
and uses baseline K-Means rather than a validated baseball taxonomy. Cluster
identities and map orientation can shift between model versions. Phase 1B does
not calculate map coordinates, infer missing movement, or turn cluster distance
into scouting certainty.

Matchup aggregates do not control for batter/pitcher handedness, park, count,
pitch sequence, role, opponent quality, or changing cluster identity. They are
descriptive and should not be treated as causal effects, individual-pitcher
projections, prop recommendations, or betting advice. A recommended next step
is an out-of-sample stability study with handedness and time-window splits
before these features inform any predictive model. Richer movement geometry,
role-aware models, and temporal comparisons also remain future work.
