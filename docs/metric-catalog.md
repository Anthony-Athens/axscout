# AX Scout Metric Catalog

This catalog defines the planned analytics warehouse metrics, their expected
meaning, likely source, implementation status, and target storage location.

## Status Legend

- **Available**: currently calculated and stored.
- **Partially available**: a column or upstream input exists, but coverage or
  calculation is incomplete.
- **Planned**: not yet implemented in the warehouse.

Unless noted otherwise, team season metrics use a team-season grain, rolling
metrics use the latest 14 completed games, and weekly metrics use a
team-calendar-week grain.

## 1. Overall Team Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `games_played` | Number of completed games with a valid win/loss decision. | MLB schedule/game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `wins` | Games in which the team scored more runs than its opponent. | MLB game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `losses` | Games in which the team scored fewer runs than its opponent. | MLB game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `winning_percentage` | Wins divided by games played. | Derived from wins and games played | Available | `agg_team_season`, `agg_team_rolling_14` |
| `runs_scored` | Total runs scored by the team over the metric window. | MLB game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `runs_allowed` | Total runs conceded by the team over the metric window. | MLB game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `run_differential` | Runs scored minus runs allowed. | Derived from game results | Available | `agg_team_season`, `agg_team_rolling_14` |
| `runs_scored_per_game` | Runs scored divided by games played. | Derived from rolling game results | Available | `agg_team_rolling_14` |
| `runs_allowed_per_game` | Runs allowed divided by games played. | Derived from rolling game results | Available | `agg_team_rolling_14` |
| `run_differential_per_game` | Run differential divided by games played. | Derived from rolling game results | Available | `agg_team_rolling_14` |
| `home_away_record` | Separate wins and losses in home and road games. | MLB game results and venue side | Planned | `agg_team_season` |
| `streak` | Consecutive wins or losses through the latest completed game. | Ordered MLB game results | Planned | `agg_team_rolling_14` |

## 2. Team Offense Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `batting_average` | Hits divided by official at-bats. | Statcast terminal plate-appearance events | Available | `agg_team_offense_weekly` |
| `on_base_percentage` | Times on base from hits, walks, and HBP divided by AB + BB + HBP + SF. | Statcast terminal plate-appearance events | Partially available | `agg_team_offense_weekly` |
| `slugging_percentage` | Total bases divided by official at-bats. | Statcast terminal plate-appearance events | Partially available | `agg_team_offense_weekly` |
| `ops` | On-base percentage plus slugging percentage. | Statcast terminal plate-appearance events | Available | `agg_team_offense_weekly` |
| `home_runs` | Plate appearances ending in a home run. | Statcast `events = home_run` | Available | `agg_team_offense_weekly` |
| `runs` | Runs scored during the weekly window. | Statcast batting-score deltas | Available | `agg_team_offense_weekly` |
| `hits` | Singles, doubles, triples, and home runs. | Statcast terminal plate-appearance events | Partially available | `agg_team_offense_weekly` |
| `walks` | Unintentional and intentional walks. | Statcast terminal plate-appearance events | Partially available | `agg_team_offense_weekly` |
| `strikeout_rate` | Batter strikeouts divided by plate appearances. | Statcast terminal plate-appearance events | Planned | `agg_team_offense_weekly` |
| `walk_rate` | Walks divided by plate appearances. | Statcast terminal plate-appearance events | Planned | `agg_team_offense_weekly` |
| `isolated_power` | Slugging percentage minus batting average. | Derived from weekly BA and SLG | Planned | `agg_team_offense_weekly` |
| `runs_per_game` | Weekly runs divided by games played in the week. | Statcast plus game schedule | Planned | `agg_team_offense_weekly` |

## 3. Team Pitching Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `era` | Earned runs allowed per nine innings pitched. | Reliable box-score pitching summaries | Partially available | `agg_team_pitching_weekly` |
| `whip` | Walks plus hits allowed divided by innings pitched. | Reliable box-score pitching summaries | Partially available | `agg_team_pitching_weekly` |
| `strikeouts` | Plate appearances ending in a pitcher strikeout. | Statcast terminal plate-appearance events | Available | `agg_team_pitching_weekly` |
| `innings_pitched` | Pitching outs recorded divided by three. | MLB box scores or play-by-play | Planned | `agg_team_pitching_weekly` |
| `earned_runs` | Runs charged as earned to the pitching team. | MLB box scores | Planned | `agg_team_pitching_weekly` |
| `hits_allowed` | Hits conceded by the pitching team. | Statcast terminal plate-appearance events | Planned | `agg_team_pitching_weekly` |
| `walks_allowed` | Walks conceded by the pitching team. | Statcast terminal plate-appearance events | Planned | `agg_team_pitching_weekly` |
| `home_runs_allowed` | Home runs conceded by the pitching team. | Statcast terminal plate-appearance events | Planned | `agg_team_pitching_weekly` |
| `strikeouts_per_nine` | Strikeouts divided by innings pitched, multiplied by nine. | Derived pitching totals | Planned | `agg_team_pitching_weekly` |
| `walks_per_nine` | Walks allowed divided by innings pitched, multiplied by nine. | Derived pitching totals | Planned | `agg_team_pitching_weekly` |
| `strikeout_to_walk_ratio` | Strikeouts divided by walks allowed. | Derived pitching totals | Planned | `agg_team_pitching_weekly` |

## 4. Team Statcast Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `avg_exit_velocity` | Mean launch speed on tracked batted balls. | Baseball Savant Statcast | Available | `agg_team_offense_weekly` |
| `avg_pitch_speed` | Mean release speed across tracked pitches. | Baseball Savant Statcast | Available | `agg_team_pitching_weekly` |
| `avg_spin_rate` | Mean release spin rate across tracked pitches. | Baseball Savant Statcast | Available | `agg_team_pitching_weekly` |
| `avg_launch_angle` | Mean launch angle on tracked batted balls. | Baseball Savant Statcast | Planned | `agg_team_offense_weekly` |
| `hard_hit_rate` | Batted balls at 95 mph or greater divided by tracked batted balls. | Baseball Savant Statcast | Planned | `agg_team_offense_weekly` |
| `barrel_rate` | Barrels divided by tracked batted-ball events. | Baseball Savant Statcast launch metrics | Planned | `agg_team_offense_weekly` |
| `xwoba` | Expected weighted on-base average based on contact and PA outcomes. | Baseball Savant expected statistics | Planned | `agg_team_offense_weekly` |
| `whiff_rate` | Swinging strikes divided by swings. | Statcast pitch descriptions | Planned | `agg_team_pitching_weekly` |
| `chase_rate` | Swings at pitches outside the strike zone divided by such pitches. | Statcast pitch location and descriptions | Planned | `agg_team_pitching_weekly` |
| `zone_rate` | Pitches in the rulebook strike zone divided by tracked pitches. | Statcast pitch location | Planned | `agg_team_pitching_weekly` |
| `pitch_type_usage` | Share of pitches thrown by pitch type. | Statcast pitch type | Planned | `fact_statcast_events` |
| `event_level_statcast` | One row per tracked pitch with pitch, contact, player, team, and game identifiers. | Baseball Savant Statcast | Planned | `fact_statcast_events` |

## 5. Player Offense Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `plate_appearances` | Completed batter plate appearances during the week. | Statcast terminal events or MLB box scores | Planned | `agg_player_offense_weekly` |
| `at_bats` | Official batter at-bats during the week. | Statcast terminal events | Planned | `agg_player_offense_weekly` |
| `hits` | Singles, doubles, triples, and home runs by the player. | Statcast terminal events | Planned | `agg_player_offense_weekly` |
| `batting_average` | Player hits divided by official at-bats. | Derived player weekly totals | Planned | `agg_player_offense_weekly` |
| `on_base_percentage` | Player H + BB + HBP divided by AB + BB + HBP + SF. | Derived player weekly totals | Planned | `agg_player_offense_weekly` |
| `slugging_percentage` | Player total bases divided by official at-bats. | Derived player weekly totals | Planned | `agg_player_offense_weekly` |
| `ops` | Player on-base percentage plus slugging percentage. | Derived player weekly totals | Planned | `agg_player_offense_weekly` |
| `home_runs` | Player plate appearances ending in a home run. | Statcast terminal events | Planned | `agg_player_offense_weekly` |
| `walk_rate` | Player walks divided by plate appearances. | Statcast terminal events | Planned | `agg_player_offense_weekly` |
| `strikeout_rate` | Player strikeouts divided by plate appearances. | Statcast terminal events | Planned | `agg_player_offense_weekly` |
| `avg_exit_velocity` | Mean launch speed on the player's tracked batted balls. | Baseball Savant Statcast | Planned | `agg_player_offense_weekly` |
| `hard_hit_rate` | Player batted balls at 95 mph or greater divided by tracked batted balls. | Baseball Savant Statcast | Planned | `agg_player_offense_weekly` |
| `barrel_rate` | Player barrels divided by tracked batted balls. | Baseball Savant Statcast | Planned | `agg_player_offense_weekly` |

## 6. Player Pitching Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `innings_pitched` | Pitching outs recorded by the player divided by three. | MLB box scores or play-by-play | Planned | `agg_player_pitching_weekly` |
| `era` | Player earned runs allowed per nine innings. | MLB box-score pitching lines | Planned | `agg_player_pitching_weekly` |
| `whip` | Player walks plus hits allowed divided by innings pitched. | MLB box-score pitching lines | Planned | `agg_player_pitching_weekly` |
| `strikeouts` | Batter strikeouts recorded by the pitcher. | Statcast terminal events | Planned | `agg_player_pitching_weekly` |
| `walks` | Batter walks issued by the pitcher. | Statcast terminal events | Planned | `agg_player_pitching_weekly` |
| `strikeout_rate` | Strikeouts divided by batters faced. | Derived player pitching totals | Planned | `agg_player_pitching_weekly` |
| `walk_rate` | Walks divided by batters faced. | Derived player pitching totals | Planned | `agg_player_pitching_weekly` |
| `avg_pitch_speed` | Mean release speed across the player's tracked pitches. | Baseball Savant Statcast | Planned | `agg_player_pitching_weekly` |
| `avg_spin_rate` | Mean release spin rate across the player's tracked pitches. | Baseball Savant Statcast | Planned | `agg_player_pitching_weekly` |
| `whiff_rate` | Swinging strikes divided by swings against the pitcher. | Statcast pitch descriptions | Planned | `agg_player_pitching_weekly` |
| `chase_rate` | Out-of-zone swings divided by pitches outside the zone. | Statcast pitch location and descriptions | Planned | `agg_player_pitching_weekly` |
| `pitch_mix` | Percentage of the player's pitches by pitch type. | Baseball Savant Statcast | Planned | `agg_player_pitching_weekly` |

## 7. Scouting Report Metrics

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `recent_form_index` | Normalized blend of recent production against the player's baseline. | Player weekly aggregates | Planned | `agg_player_offense_weekly`, `agg_player_pitching_weekly` |
| `contact_quality_grade` | Scouting-grade translation of exit velocity, hard-hit rate, and barrel rate. | Player offense Statcast aggregates | Planned | `agg_player_offense_weekly` |
| `plate_discipline_grade` | Grade based on walk, strikeout, chase, and contact rates. | Player offense weekly and Statcast data | Planned | `agg_player_offense_weekly`, `fact_statcast_events` |
| `power_grade` | Grade based on ISO, slugging, barrels, and home-run frequency. | Player offense weekly aggregates | Planned | `agg_player_offense_weekly` |
| `pitch_quality_grade` | Grade based on velocity, spin, movement, and whiff rate. | Player pitching Statcast aggregates | Planned | `agg_player_pitching_weekly`, `fact_statcast_events` |
| `command_grade` | Grade based on walk rate, zone rate, and location consistency. | Player pitching weekly and pitch locations | Planned | `agg_player_pitching_weekly`, `fact_statcast_events` |
| `pitch_mix_summary` | Usage, velocity, and effectiveness by pitch type. | Event-level Statcast | Planned | `fact_statcast_events` |
| `platoon_split` | Performance against left- and right-handed opponents. | Statcast batter/pitcher handedness | Planned | `agg_player_offense_weekly`, `agg_player_pitching_weekly` |
| `workload_risk` | Recent pitches, innings, appearances, and rest relative to baseline. | Game logs and player pitching aggregates | Planned | `agg_player_pitching_weekly` |
| `overall_scouting_grade` | Weighted composite of role-specific scouting grades. | Derived scouting feature layer | Planned | `agg_player_offense_weekly`, `agg_player_pitching_weekly` |

## 8. Prediction Engine Features

| Metric name | Definition | Likely source | Current status | Target table |
| --- | --- | --- | --- | --- |
| `team_season_win_percentage` | Team season wins divided by games played at prediction time. | `agg_team_season` | Available | `fact_predictions` |
| `team_season_run_differential` | Team season runs scored minus runs allowed at prediction time. | `agg_team_season` | Available | `fact_predictions` |
| `team_recent_win_percentage` | Win percentage across the latest 14 completed games. | `agg_team_rolling_14` | Available | `fact_predictions` |
| `team_recent_run_differential_per_game` | Average run differential across the latest 14 games. | `agg_team_rolling_14` | Available | `fact_predictions` |
| `weekly_offense_ops` | Latest available team weekly OPS before first pitch. | `agg_team_offense_weekly` | Available | `fact_predictions` |
| `weekly_offense_exit_velocity` | Latest available team average exit velocity before first pitch. | `agg_team_offense_weekly` | Available | `fact_predictions` |
| `weekly_pitching_strikeouts` | Latest team weekly pitching strikeout total. | `agg_team_pitching_weekly` | Available | `fact_predictions` |
| `weekly_pitch_velocity` | Latest team average pitch speed. | `agg_team_pitching_weekly` | Available | `fact_predictions` |
| `starting_pitcher_quality` | Pregame rating derived from starter form, pitch quality, and workload. | Player pitching aggregates and probable starters | Planned | `fact_predictions` |
| `lineup_quality` | Pregame expected offensive strength of the confirmed lineup. | Player offense aggregates and lineup feed | Planned | `fact_predictions` |
| `home_field_indicator` | Binary indicator identifying the home team. | Game schedule | Partially available | `fact_predictions` |
| `rest_days` | Days since each team's previous completed game. | Ordered game schedule | Planned | `fact_predictions` |
| `travel_distance` | Estimated travel distance since the previous game. | Venue coordinates and schedule | Planned | `fact_predictions` |
| `market_moneyline` | Latest available sportsbook moneyline before prediction cutoff. | Sportsbook odds feed | Planned | `fact_odds` |
| `market_implied_probability` | Probability implied by the market price before vig adjustment. | Derived from `fact_odds` | Planned | `fact_odds`, `fact_predictions` |
| `model_win_probability` | Model-estimated probability that the selected team wins. | Prediction model output | Planned | `fact_predictions` |
| `prediction_edge` | Model probability minus no-vig market probability. | Model output and odds | Planned | `fact_predictions` |
| `predicted_run_margin` | Expected home-team runs minus expected away-team runs. | Prediction model output | Planned | `fact_predictions` |
| `prediction_outcome` | Actual game result joined after completion for evaluation. | Final game results | Planned | `fact_predictions` |
| `model_version` | Immutable identifier for the model and feature contract used. | Model registry or deployment metadata | Planned | `fact_predictions` |
