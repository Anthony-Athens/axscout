# Archetype Matchups

The `/matchups` page supports research into how an opposing MLB team and its
current hitters have performed against pitchers who share the selected
pitcher's primary archetype. Users select a pitcher, opponent team, and season;
the page then combines pitcher context, arsenal characteristics, team-level
results, and batter-level results in one view.

The page defaults to Paul Skenes and the Chicago Cubs when both are available
in the selected matchup dataset. Otherwise, it falls back to the first pitcher
and team with eligible archetype matchup data. Selections are represented in
the URL with `pitcherId`, `team`, and `season` search parameters.

## How archetypes power the page

Each eligible `pitcher_profiles` row identifies a primary archetype and model
version. The Matchups page uses that identity to retrieve team and batter
aggregates calculated against every pitcher assigned to the same archetype.
It does not treat the aggregate as a projection for the selected individual
pitcher.

Required tables:

- `pitcher_profiles` for the pitcher, primary archetype, season, and model
  context.
- `pitcher_archetypes` for the stored archetype name and route slug.
- `pitcher_pitch_profiles` for the compact arsenal table.
- `team_vs_pitcher_archetype` for opponent-level aggregate performance.
- `batter_vs_pitcher_archetype` for hitter-level aggregate performance.
- `dim_players` for pitcher and batter display names, handedness, and current
  team association.
- `dim_teams` for team names and abbreviations.

The pitcher archetype pipeline must run before matchup aggregation so primary
memberships exist. Then run the archetype matchup pipeline with matching season
and pitcher model-version configuration. The frontend never fabricates rows or
infers missing archetypes.

## Interpretation limitations

Team and batter results are descriptive aggregates against an archetype, not
guarantees of performance against the selected pitcher. Samples can be small
and do not isolate handedness, venue, count, pitch sequence, role, opponent
quality, injuries, roster movement, or changes in player skill. The batter
table uses each player's current `dim_players.current_team_abbreviation` because
the matchup aggregate does not persist a team field; historical team changes
therefore require cautious interpretation.

OPS, xwOBA, strikeout rate, walk rate, exit velocity, and hard-hit rate remain
unavailable when their source fields are missing. Sample-quality labels measure
volume only and do not validate predictive signal.

## Not a betting recommendation page

Matchup indicators identify descriptive leaders within the available rows.
They are not picks, wagers, prop recommendations, expected outcomes, or betting
advice. The page does not consume sportsbook odds and does not alter AXScout's
prediction engine or Scouting Report calculations.

## Future prop-analysis roadmap

Future research could add minimum-sample controls, handedness and pitch-type
splits, projected lineup confirmation, uncertainty intervals, role-aware model
versions, and out-of-sample validation. Any future prop-analysis feature should
separate descriptive evidence from projections, expose assumptions and sample
sizes, and remain independent from sportsbook recommendation language.
