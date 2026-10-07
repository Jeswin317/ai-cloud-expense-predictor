"""Business logic between the database and the ml/ package."""
from __future__ import annotations

import sys

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import PROJECT_ROOT
from .models import Anomaly, BillingRecord, Prediction

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))  # lets the backend import the top-level ml/ package

from ml.anomalies import detect_anomalies  # noqa: E402
from ml.forecasting import InsufficientDataError, build_daily_series, forecast  # noqa: E402
from ml.insights import generate_insights  # noqa: E402


def load_df(db: Session) -> pd.DataFrame:
    rows = db.execute(select(BillingRecord.date, BillingRecord.provider, BillingRecord.service,
                             BillingRecord.region, BillingRecord.usage, BillingRecord.cost)).all()
    df = pd.DataFrame(rows, columns=["date", "provider", "service", "region", "usage", "cost"])
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
    return df


def save_billing(db: Session, df: pd.DataFrame, replace: bool) -> int:
    if replace:
        db.execute(delete(BillingRecord))
    db.bulk_insert_mappings(BillingRecord, df.to_dict("records"))
    db.commit()
    refresh_anomalies(db)
    return len(df)


def clear_all(db: Session):
    for m in (BillingRecord, Prediction, Anomaly):
        db.execute(delete(m))
    db.commit()


def refresh_anomalies(db: Session) -> list[dict]:
    df = load_df(db)
    db.execute(delete(Anomaly))
    found = detect_anomalies(df.assign(date=df["date"].dt.date)) if not df.empty else []
    db.bulk_insert_mappings(Anomaly, [{**a, "date": pd.to_datetime(a["date"]).date()} for a in found])
    db.commit()
    return found


def get_forecast(df: pd.DataFrame, horizon: int = 90) -> dict | None:
    """Returns None when there is not enough data (callers explain this to the user)."""
    if df.empty:
        return None
    try:
        return forecast(build_daily_series(df), horizon)
    except InsufficientDataError:
        return None


def store_predictions(db: Session, fc: dict):
    db.execute(delete(Prediction))
    db.bulk_insert_mappings(Prediction, [
        {"target_date": pd.to_datetime(p["date"]).date(), "predicted_cost": p["predicted"], "lower": p["lower"], "upper": p["upper"]}
        for p in fc["points"]])
    db.commit()


def stored_anomalies(db: Session) -> list[dict]:
    rows = db.scalars(select(Anomaly).order_by(Anomaly.date.desc())).all()
    return [{"date": a.date.isoformat(), "service": a.service, "actual_cost": a.actual_cost, "expected_cost": a.expected_cost,
             "difference": a.difference, "deviation_pct": a.deviation_pct, "reason": a.reason} for a in rows]


def dashboard(df: pd.DataFrame, fc: dict | None, anomalies: list[dict]) -> dict:
    last = df["date"].max()
    month_start = last.replace(day=1)
    prev_start = (month_start - pd.Timedelta(days=1)).replace(day=1)
    current = float(df[df["date"] >= month_start]["cost"].sum())
    previous = float(df[(df["date"] >= prev_start) & (df["date"] < month_start)]["cost"].sum())
    last30 = df[df["date"] > last - pd.Timedelta(days=30)]
    by_service = df.groupby("service")["cost"].sum().sort_values(ascending=False)
    projected = fc["summary"]["30"]["total"] if fc else None
    base = float(last30["cost"].sum())
    insights = generate_insights(df, fc, anomalies)
    return {
        "has_data": True,
        "total_cost": round(float(df["cost"].sum()), 2),
        "current_month_cost": round(current, 2),
        "current_month_label": month_start.strftime("%B %Y"),
        "previous_month_cost": round(previous, 2),
        "daily_average": round(base / max(last30["date"].nunique(), 1), 2),
        "projected_next_month": projected,
        "change_pct": round((projected / base - 1) * 100, 1) if projected and base else None,
        "top_service": {"name": by_service.index[0], "cost": round(float(by_service.iloc[0]), 2)},
        "date_range": [df["date"].min().date().isoformat(), last.date().isoformat()],
        "anomaly_count": len(anomalies),
        "forecast_available": fc is not None,
        "recommendations": [i["text"] for i in insights if i["type"] == "recommendation"],
        "insights": insights,
    }
