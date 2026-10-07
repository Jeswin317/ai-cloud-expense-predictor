"""Rule-based insights generated from the data (no unverifiable claims)."""
from __future__ import annotations

import pandas as pd


def generate_insights(df: pd.DataFrame, fc: dict | None, anomalies: list[dict]) -> list[dict]:
    out: list[dict] = []
    total = df["cost"].sum()
    by_service = df.groupby("service")["cost"].sum().sort_values(ascending=False)
    top, share = by_service.index[0], by_service.iloc[0] / max(total, 1e-9) * 100

    if fc:
        m = fc["metrics"]
        pct = m["trend_pct_per_30d"]
        if m["trend"] == "increasing":
            out.append({"type": "warning", "text": f"Your cloud spending is increasing by approximately {pct:.1f}% per 30 days."})
        elif m["trend"] == "decreasing":
            out.append({"type": "success", "text": f"Your cloud spending is decreasing by approximately {abs(pct):.1f}% per 30 days."})
        else:
            out.append({"type": "info", "text": "Your cloud spending is relatively stable."})
        out.append({"type": "info", "text": f"Your projected monthly expense is ₹{fc['summary']['30']['total']:,.0f} "
                    f"(model backtest accuracy about {m['accuracy_pct']}%)."})

    out.append({"type": "info", "text": f"{top} is responsible for the highest spending (~{share:.0f}% of total cost)."})

    # Services whose cost grew most in the latest 30 days vs the 30 days before.
    d = df.copy()
    d["date"] = pd.to_datetime(d["date"])
    last = d["date"].max()
    recent = d[d["date"] > last - pd.Timedelta(days=30)]
    prev = d[(d["date"] <= last - pd.Timedelta(days=30)) & (d["date"] > last - pd.Timedelta(days=60))]
    if not prev.empty:
        r, p = recent.groupby("service")["cost"].sum(), prev.groupby("service")["cost"].sum()
        growth = ((r / p - 1) * 100).dropna().sort_values(ascending=False)
        if len(growth) and growth.iloc[0] > 10:
            out.append({"type": "recommendation", "text": f"Recommendation: {growth.index[0]} grew {growth.iloc[0]:.0f}% versus the previous 30 days. "
                        "Review its usage for idle or oversized resources (based on the available data)."})
    if share > 35:
        out.append({"type": "recommendation", "text": f"Recommendation: you could reduce costs by optimizing high-usage services such as {top}, "
                    "e.g. right-sizing instances or using committed-use discounts. Actual savings depend on your workloads."})
    if anomalies:
        out.append({"type": "warning", "text": f"{len(anomalies)} unusual spending event(s) detected; the latest was {anomalies[0]['service']} on {anomalies[0]['date']}."})
    return out
