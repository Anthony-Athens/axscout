from datetime import date

from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches

PAGE_SIZE = 1000
PITCHING_FEATURE_COLUMNS = (
    "season,mlb_player_id,era,whip,strikeouts,avg_pitch_speed,avg_spin_rate"
)


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"Invalid probable-pitcher feature date: {value}.") from error


def fetch_probable_pitcher_features(
    start_date: str,
    end_date: str,
) -> list[dict]:
    start = _parse_date(start_date)
    end = _parse_date(end_date)
    if end < start:
        raise ValueError("end_date cannot precede start_date.")

    games: list[dict] = []
    offset = 0
    while True:
        page = (
            supabase.table("fact_games")
            .select(
                "mlb_game_pk,game_date,home_team_key,away_team_key,"
                "home_probable_pitcher_mlb_id,home_probable_pitcher_name,"
                "away_probable_pitcher_mlb_id,away_probable_pitcher_name"
            )
            .gte("game_date", start_date)
            .lte("game_date", end_date)
            .order("game_date")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        games.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    player_ids = sorted(
        {
            int(player_id)
            for game in games
            for player_id in (
                game.get("home_probable_pitcher_mlb_id"),
                game.get("away_probable_pitcher_mlb_id"),
            )
            if player_id is not None
        }
    )
    seasons = sorted({int(game["game_date"][:4]) for game in games})
    pitching_rows = []
    for player_id_batch in batches(player_ids):
        pitching_rows.extend(
            (
                supabase.table("agg_player_pitching_season")
                .select(PITCHING_FEATURE_COLUMNS)
                .in_("mlb_player_id", player_id_batch)
                .in_("season", seasons)
                .execute()
                .data
                or []
            )
        )

    feature_lookup = {
        (int(row["season"]), int(row["mlb_player_id"])): row
        for row in pitching_rows
    }
    output = []
    for game in games:
        season = int(game["game_date"][:4])
        row = {**game}
        for side in ("home", "away"):
            player_id = game.get(f"{side}_probable_pitcher_mlb_id")
            features = (
                feature_lookup.get((season, int(player_id)))
                if player_id is not None
                else None
            )
            for metric in (
                "era",
                "whip",
                "strikeouts",
                "avg_pitch_speed",
                "avg_spin_rate",
            ):
                row[f"{side}_probable_pitcher_{metric}"] = (
                    features.get(metric) if features else None
                )
        output.append(row)

    return output
