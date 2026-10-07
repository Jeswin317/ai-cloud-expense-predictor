"""Billing data sources.

Version 1 only has CsvBillingSource. To add a live cloud API later (AWS Cost
Explorer, Azure Cost Management, GCP BigQuery export), subclass BillingSource
and return a DataFrame from fetch(); everything downstream stays unchanged.
"""
from __future__ import annotations

import io
from abc import ABC, abstractmethod

import pandas as pd

REQUIRED = ["date", "service", "region", "usage", "cost"]


class BillingDataError(ValueError):
    """User-facing problem with the billing data."""


def infer_provider(service: str) -> str:
    s = service.lower()
    if s.startswith(("aws", "amazon")):
        return "AWS"
    if s.startswith(("azure", "microsoft")):
        return "Azure"
    if s.startswith(("gcp", "google", "bigquery")):
        return "GCP"
    return "Unknown"


class BillingSource(ABC):
    @abstractmethod
    def fetch(self) -> pd.DataFrame:
        """Return a cleaned DataFrame with columns date, provider, service, region, usage, cost."""


class CsvBillingSource(BillingSource):
    def __init__(self, content: bytes):
        self.content = content

    def fetch(self) -> pd.DataFrame:
        if not self.content.strip():
            raise BillingDataError("The CSV file is empty.")
        try:
            raw = pd.read_csv(io.BytesIO(self.content), dtype=str, skipinitialspace=True)
        except UnicodeDecodeError:
            raise BillingDataError("The file is not valid UTF-8 text. Please export the CSV as UTF-8.")
        except Exception:
            raise BillingDataError("The file could not be read as CSV.")
        raw.columns = [str(c).strip().lower() for c in raw.columns]
        missing = [c for c in REQUIRED if c not in raw.columns]
        if missing:
            raise BillingDataError(f"Missing required column(s): {', '.join(missing)}. Required: {', '.join(REQUIRED)}.")
        if raw.empty:
            raise BillingDataError("The CSV has headers but no data rows.")

        df = raw.copy()
        df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
        df["usage"] = pd.to_numeric(df["usage"], errors="coerce")
        df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
        df["service"] = df["service"].fillna("").str.strip().str[:120]
        df["region"] = df["region"].fillna("unknown").str.strip().str[:60]
        if "provider" in df.columns:
            df["provider"] = df["provider"].fillna("").str.strip().str[:20]
        else:
            df["provider"] = ""
        df["provider"] = [p or infer_provider(s) for p, s in zip(df["provider"], df["service"])]

        valid = df["date"].notna() & df["usage"].notna() & df["cost"].notna() & (df["service"] != "") & (df["cost"] >= 0) & (df["usage"] >= 0)
        cleaned = df[valid][["date", "provider", "service", "region", "usage", "cost"]].reset_index(drop=True)
        if cleaned.empty:
            raise BillingDataError("No valid rows found. Check date formats and make sure usage and cost are non-negative numbers.")
        cleaned.attrs["skipped"] = int(len(df) - len(cleaned))
        return cleaned
