# Team Weekly Statcast Metrics

The weekly Statcast pipeline groups pitch-level data into Monday-through-Sunday
team offense and pitching rows.

## Offense

Batting average and OPS are derived directly from the terminal plate-appearance
`events` value in Statcast data. Hits include `single`, `double`, `triple`, and
`home_run`. Total bases use weights of 1, 2, 3, and 4 for those events.

Official at-bats include those hit events plus safely identified outs and
reached-on-error events: `field_error`, `field_out`, `fielders_choice`,
`fielders_choice_out`, `force_out`, `grounded_into_double_play`, `strikeout`,
`strikeout_double_play`, `double_play`, `triple_play`, and `other_out`.

Walks include `walk`, `intent_walk`, and `intentional_walk`. Hit by pitch uses
`hit_by_pitch`, and sacrifice flies use `sac_fly`.

The formulas are:

```text
BA  = H / AB
OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
SLG = TB / AB
OPS = OBP + SLG
```

BA and OPS remain null when their required denominator is zero. Exit velocity,
home runs, and runs continue to use the existing Statcast calculations.

## Pitching

Strikeouts, average pitch speed, and average spin rate remain Statcast-derived.
ERA and WHIP remain null because the current pipeline does not yet have a
reliable weekly source for innings pitched, earned runs, hits allowed, and
walks allowed. A future pitching source should populate those fields without
changing the existing Statcast metrics.

No FanGraphs or Baseball-Reference summary endpoints are used.
