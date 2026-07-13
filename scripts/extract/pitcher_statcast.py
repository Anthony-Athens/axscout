import pandas as pd

from scripts.extract.statcast import fetch_statcast


def fetch_pitcher_statcast(start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch pitch-level Statcast data without persisting raw rows."""
    data = fetch_statcast(start_date, end_date)
    if data.empty or "pitcher" not in data.columns:
        return pd.DataFrame()
    return data.loc[data["pitcher"].notna()].copy()
