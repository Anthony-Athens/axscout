from datetime import datetime

import pandas as pd


def fetch_statcast(start_date: str, end_date: str) -> pd.DataFrame:
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()

    if start > end:
        raise ValueError("Statcast start_date must be on or before end_date.")

    print(f"Fetching Statcast data from {start_date} through {end_date}...")

    try:
        from pybaseball import statcast
    except ImportError as error:
        raise RuntimeError(
            "pybaseball is required for the Statcast pipeline. "
            "Install scripts/data/requirements.txt."
        ) from error

    data = statcast(start_dt=start_date, end_dt=end_date)

    if data is None or data.empty:
        print("Statcast returned no rows for the requested date range.")
        return pd.DataFrame()

    print(f"Fetched {len(data)} Statcast pitch rows.")
    return data
