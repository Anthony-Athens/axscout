def _rate_from_totals(
    *,
    numerator: int,
    outs_recorded: int,
    innings_multiplier: int,
    digits: int,
) -> float | None:
    if outs_recorded <= 0:
        return None
    return round(numerator * innings_multiplier / outs_recorded, digits)


def build_player_pitching_updates(rows: list[dict]) -> list[dict]:
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        player_id = row.get("mlb_player_id")
        if player_id is not None:
            grouped.setdefault(int(player_id), []).append(row)

    updates = []
    for player_id, player_rows in grouped.items():
        if len(player_rows) == 1:
            era = player_rows[0].get("era")
            whip = player_rows[0].get("whip")
        else:
            outs = sum(row.get("outs_recorded") or 0 for row in player_rows)
            earned_runs = sum(row.get("earned_runs") or 0 for row in player_rows)
            walks_and_hits = sum(
                (row.get("walks") or 0) + (row.get("hits_allowed") or 0)
                for row in player_rows
            )
            era = _rate_from_totals(
                numerator=earned_runs,
                outs_recorded=outs,
                innings_multiplier=27,
                digits=2,
            )
            whip = _rate_from_totals(
                numerator=walks_and_hits,
                outs_recorded=outs,
                innings_multiplier=3,
                digits=3,
            )

        if era is not None or whip is not None:
            updates.append(
                {
                    "mlb_player_id": player_id,
                    "era": era,
                    "whip": whip,
                }
            )

    return updates


def build_team_pitching_updates(rows: list[dict]) -> list[dict]:
    totals: dict[str, dict[str, int]] = {}
    for row in rows:
        abbreviation = row.get("team_abbreviation")
        if not abbreviation:
            continue
        team = totals.setdefault(
            abbreviation,
            {"outs": 0, "earned_runs": 0, "walks_and_hits": 0},
        )
        team["outs"] += row.get("outs_recorded") or 0
        team["earned_runs"] += row.get("earned_runs") or 0
        team["walks_and_hits"] += (
            (row.get("walks") or 0) + (row.get("hits_allowed") or 0)
        )

    updates = []
    for abbreviation, team in totals.items():
        era = _rate_from_totals(
            numerator=team["earned_runs"],
            outs_recorded=team["outs"],
            innings_multiplier=27,
            digits=2,
        )
        whip = _rate_from_totals(
            numerator=team["walks_and_hits"],
            outs_recorded=team["outs"],
            innings_multiplier=3,
            digits=3,
        )
        if era is not None or whip is not None:
            updates.append(
                {
                    "team_abbreviation": abbreviation,
                    "era": era,
                    "whip": whip,
                }
            )

    return updates
