# Probable Pitchers

## Source

AXScout reads probable starters from the official MLB Stats API schedule endpoint. The schedule request uses `hydrate=team,linescore,probablePitcher`. When MLB has announced a starter, each game-side payload contains a player ID and full name under `teams.home.probablePitcher` or `teams.away.probablePitcher`.

Probable starters are expected to change as teams make announcements. The daily games upsert refreshes all four values from the latest MLB response.

## Storage

The operational `games` table and warehouse `fact_games` table store:

- `home_probable_pitcher_mlb_id`
- `home_probable_pitcher_name`
- `away_probable_pitcher_mlb_id`
- `away_probable_pitcher_name`

The columns are nullable because MLB may not have announced one or both starters. Missing values do not fail extraction, transformation, loading, warehouse synchronization, or frontend rendering.

The game loader also upserts announced pitchers into `dim_players` by `mlb_player_id`. Existing non-empty player names and profile attributes are preserved; schedule names fill missing values.

## Schema Deployment

Apply the idempotent probable-pitcher `ALTER TABLE` statements in `supabase/schema.sql` before deploying or running the updated games pipeline. The repository does not currently contain a Supabase migrations directory, so the canonical schema file tracks this change.

No existing rows are deleted. A subsequent games and warehouse refresh backfills probable pitchers for the configured schedule window:

```powershell
python -m scripts.pipelines.load_games_pipeline
python -m scripts.pipelines.build_warehouse_pipeline
```

## Product Use

- Dashboard Today's Games displays away and home probable starters.
- Scouting Report finds upcoming games in which either selected team is home or away, orders them by game date, and displays the next three games for each team.
- Each row uses the probable-pitcher field for that team's side of the game and joins the MLB player ID to `agg_player_pitching_season` for ERA, WHIP, and strikeouts.
- Missing pitcher announcements or season rates display `Not announced`; a team with no games in the 60-day lookup window displays `No upcoming games found`.

## ML Feature Path

Future prediction work can call:

```python
from scripts.utils.probable_pitchers import fetch_probable_pitcher_features

rows = fetch_probable_pitcher_features("2026-06-30", "2026-07-07")
```

Each returned game includes team keys, probable-pitcher IDs/names, and season ERA, WHIP, strikeouts, average pitch speed, and average spin rate for both sides. This helper is read-only and does not implement predictions.

Probable pitchers are not guaranteed starters. Future models should record the feature snapshot time and handle late pitcher changes or null announcements explicitly.
