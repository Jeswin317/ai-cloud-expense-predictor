"""Anomaly detection: compare each service's daily cost with its own recent baseline."""
from __future__ import annotations

import pandas as pd

WINDOW = 14        # days used for the baseline
MIN_PERIODS = 7    # minimum history before judging a day
RATIO = 1.4        # must be at least 40% above expected
SIGMA = 3.0        # ...and 3 standard deviations above expected


def detect_anomalies(df: pd.DataFrame) -> list[dict]:
    daily = df.groupby(["service", "date"], as_index=False).agg(cost=("cost", "sum"), usage=("usage", "sum"))
    found: list[dict] = []
    for service, g in daily.groupby("service"):
        g = g.sort_values("date").reset_index(drop=True)
        prior_cost, prior_usage = g["cost"].shift(1), g["usage"].shift(1)
        exp_cost = prior_cost.rolling(WINDOW, min_periods=MIN_PERIODS).median()
        exp_usage = prior_usage.rolling(WINDOW, min_periods=MIN_PERIODS).median()
        std = prior_cost.rolling(WINDOW, min_periods=MIN_PERIODS).std()
        for i, row in g.iterrows():
            e = exp_cost[i]
            if pd.isna(e) or e <= 0:
                continue
            spread = max(0 if pd.isna(std[i]) else std[i], 0.1 * e)
            if row["cost"] > e * RATIO and row["cost"] > e + SIGMA * spread:
                ratio_c = row["cost"] / e
                eu = exp_usage[i]
                ratio_u = row["usage"] / eu if not pd.isna(eu) and eu > 0 else 1.0
                if ratio_u > 0.8 * ratio_c:
                    reason = f"Usage rose {ratio_u:.1f}x versus normal, so the spike is likely a workload increase."
                elif ratio_u < 1.3:
                    reason = ("Cost rose while usage stayed near normal; possible causes are a pricing tier "
                              "change, data-transfer charges or a misconfigured resource (inferred, please verify).")
                else:
                    reason = f"Cost rose {ratio_c:.1f}x but usage only {ratio_u:.1f}x; part of the increase is not explained by usage."
                found.append({
                    "date": str(row["date"]), "service": service,
                    "actual_cost": round(float(row["cost"]), 2), "expected_cost": round(float(e), 2),
                    "difference": round(float(row["cost"] - e), 2),
                    "deviation_pct": round(float(ratio_c * 100 - 100), 1), "reason": reason,
                })
    return sorted(found, key=lambda a: a["date"], reverse=True)
