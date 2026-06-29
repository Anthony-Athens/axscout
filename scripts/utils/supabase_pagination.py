from collections.abc import Iterable

from scripts.utils.supabase_client import supabase

PAGE_SIZE = 1000


def select_all(
    table_name: str,
    columns: str,
    *,
    order_by: Iterable[str],
) -> list[dict]:
    rows: list[dict] = []
    offset = 0

    while True:
        query = supabase.table(table_name).select(columns)
        for column in order_by:
            query = query.order(column)

        page = (
            query.range(offset, offset + PAGE_SIZE - 1).execute().data or []
        )
        rows.extend(page)

        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return rows


def batches(rows: list[dict], size: int = 500):
    for index in range(0, len(rows), size):
        yield rows[index : index + size]
