"""Generate a realistic sample billing CSV (data/sample_billing.csv).

Run:  python ml/generate_sample.py
Contains a growing trend, weekday seasonality, several services/regions
and four deliberate spending anomalies.
"""
from pathlib import Path

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
dates = pd.date_range("2026-04-01", "2026-09-30", freq="D")

# provider, service, region, base daily usage, unit price (INR), monthly growth
SERVICES = [
    ("AWS", "AWS EC2", "ap-south-1", 120, 14.0, 0.06),
    ("AWS", "AWS EC2", "us-east-1", 60, 15.5, 0.04),
    ("AWS", "AWS S3", "ap-south-1", 800, 0.9, 0.05),
    ("AWS", "AWS RDS", "ap-south-1", 48, 38.0, 0.03),
    ("AWS", "AWS Lambda", "us-east-1", 300, 1.2, 0.08),
    ("Azure", "Azure Virtual Machines", "centralindia", 90, 16.0, 0.02),
    ("Azure", "Azure Blob Storage", "centralindia", 600, 0.8, 0.03),
    ("Azure", "Azure SQL Database", "eastus", 36, 44.0, -0.01),
    ("GCP", "GCP Compute Engine", "asia-south1", 100, 13.0, 0.05),
    ("GCP", "GCP BigQuery", "asia-south1", 150, 6.5, 0.07),
    ("GCP", "GCP Cloud Storage", "europe-west1", 500, 0.85, 0.02),
]

# (date, service, region, usage multiplier, cost-only multiplier)
SPIKES = [
    ("2026-06-12", "AWS EC2", "ap-south-1", 3.2, 1.0),       # usage surge
    ("2026-07-25", "GCP BigQuery", "asia-south1", 2.8, 1.0),  # heavy queries
    ("2026-08-19", "AWS S3", "ap-south-1", 1.0, 3.5),         # cost without usage (e.g. egress)
    ("2026-09-08", "Azure SQL Database", "eastus", 1.1, 2.6),
]

rows = []
for d in dates:
    months = (d - dates[0]).days / 30
    weekend = 0.78 if d.dayofweek >= 5 else 1.0
    for provider, service, region, usage0, price, growth in SERVICES:
        usage = usage0 * (1 + growth * months) * weekend * rng.normal(1, 0.05)
        cost = usage * price * rng.normal(1, 0.03)
        for sd, ss, sr, um, cm in SPIKES:
            if d == pd.Timestamp(sd) and service == ss and region == sr:
                usage *= um
                cost *= um * cm
        rows.append((d.date().isoformat(), provider, service, region, round(usage, 2), round(cost, 2)))

out = Path(__file__).resolve().parent.parent / "data" / "sample_billing.csv"
pd.DataFrame(rows, columns=["date", "provider", "service", "region", "usage", "cost"]).to_csv(out, index=False)
print(f"Wrote {len(rows)} rows to {out}")
