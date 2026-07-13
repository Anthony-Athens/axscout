# Pitcher Archetypes Phase 1A

Phase 1A adds an aggregated Statcast arsenal layer, baseline pitcher clusters,
and precomputed similar-pitcher relationships. It does not persist raw pitches,
change predictions or scouting calculations, or generate model labels with an
LLM.

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
are null, the page displays an explicit empty state until an upstream model run
stores coordinates.

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

## Limitations and next phases

Phase 1A does not infer starter share, VAA, or HAA; does not persist raw pitches;
and uses baseline K-Means rather than a validated baseball taxonomy. Cluster
identities and map orientation can shift between model versions. Phase 1B does
not calculate map coordinates, infer missing movement, or turn cluster distance
into scouting certainty.

Phase 1C should first evaluate cluster stability and coordinate generation,
then explore batter performance versus pitcher archetype as a separately
validated modeling layer. That work should preserve batter sample-size context
and avoid treating archetype membership as a causal matchup effect. Richer
movement geometry, role-aware models, and temporal comparisons also remain
future work.
