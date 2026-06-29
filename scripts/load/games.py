from scripts.utils.supabase_client import supabase
from scripts.utils.supabase_pagination import batches


def upsert_games(games: list[dict]) -> int:
    print(f"Attempting to upsert {len(games)} games...")

    # Verify there are no duplicate game IDs
    game_ids = [g["mlb_game_pk"] for g in games]
    duplicates = len(game_ids) - len(set(game_ids))

    print(f"Duplicate game IDs found: {duplicates}")

    if duplicates > 0:
        duplicate_values = {
            game_id
            for game_id in game_ids
            if game_ids.count(game_id) > 1
        }
        print("Duplicate IDs:", duplicate_values)

    for game_batch in batches(games):
        supabase.table("games").upsert(
            game_batch,
            on_conflict="mlb_game_pk",
        ).execute()

    return len(games)
