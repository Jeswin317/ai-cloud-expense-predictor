"""Cost forecasting.

Model: Linear Regression on [time index + day-of-week dummies].
Why: it is fast, runs anywhere, needs no GPU, works with ~2 weeks of data,
captures the two patterns that matter for cloud bills (a trend and a weekly
cycle) and is easy to explain. Prediction intervals come from the residual
standard deviation. Accuracy is measured by a hold-out backtest.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

MIN_DAYS = 14
BACKTEST_DAYS = 7


class InsufficientDataError(ValueError):
    """Raised when there is not enough history to build a forecast."""


def build_daily_series(df: pd.DataFrame) -> pd.Series:
    """Total cost per calendar day; missing days are interpolated."""
    daily = df.groupby("date")["cost"].sum().sort_index()
    daily.index = pd.to_datetime(daily.index)
    full = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    return daily.reindex(full).interpolate(limit_direction="both")


def _features(index: pd.DatetimeIndex, start: pd.Timestamp) -> pd.DataFrame:
    t = (index - start).days.values.astype(float)
    X = pd.DataFrame({"t": t}, index=index)
    for d in range(1, 7):  # day-of-week dummies (Monday is the baseline)
        X[f"dow{d}"] = (index.dayofweek == d).astype(float)
    return X


def _fit(y: pd.Series) -> LinearRegression:
    # Clip extreme spikes so a single anomaly does not skew the trend.
    cap = y.median() + 3 * (y.quantile(0.75) - y.quantile(0.25) + 1e-9)
    model = LinearRegression()
    model.fit(_features(y.index, y.index[0]), y.clip(upper=cap))
    return model


def forecast(daily: pd.Series, horizon: int = 90) -> dict:
    if len(daily) < MIN_DAYS:
        raise InsufficientDataError(
            f"At least {MIN_DAYS} days of data are needed to predict costs; found {len(daily)}."
        )
    start = daily.index[0]

    # --- backtest: train on all but the last N days, predict those N days
    n_test = max(1, min(BACKTEST_DAYS, len(daily) // 4))
    train, test = daily.iloc[:-n_test], daily.iloc[-n_test:]
    bt_pred = _fit(train).predict(_features(test.index, train.index[0]))
    mape = float(np.mean(np.abs(bt_pred - test.values) / np.maximum(test.values, 1e-9)) * 100)

    # --- final model on all data
    model = _fit(daily)
    fitted = model.predict(_features(daily.index, start))
    resid_std = float(np.std(daily.values - fitted))
    future_idx = pd.date_range(daily.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D")
    pred = np.maximum(model.predict(_features(future_idx, start)), 0)
    band = 1.96 * resid_std

    points = [
        {"date": d.date().isoformat(), "predicted": round(float(p), 2),
         "lower": round(float(max(p - band, 0)), 2), "upper": round(float(p + band), 2)}
        for d, p in zip(future_idx, pred)
    ]
    summary = {
        str(h): {
            "total": round(float(pred[:h].sum()), 2),
            "lower": round(float(sum(max(p - band, 0) for p in pred[:h])), 2),
            "upper": round(float(pred[:h].sum() + band * h), 2),
        }
        for h in (7, 30, 90) if h <= horizon
    }
    slope_per_30d = float(model.coef_[0]) * 30
    trend_pct = slope_per_30d / max(float(daily.tail(30).mean()), 1e-9) * 100
    ss_tot = max(float(np.sum((daily.values - daily.mean()) ** 2)), 1e-9)
    return {
        "points": points,
        "summary": summary,
        "metrics": {
            "model": "LinearRegression (trend + weekday seasonality)",
            "backtest_mape": round(mape, 2),
            "accuracy_pct": round(max(0.0, 100 - mape), 1),
            "r2": round(1 - float(np.sum((daily.values - fitted) ** 2)) / ss_tot, 3),
            "training_days": int(len(daily)),
            "trend_pct_per_30d": round(trend_pct, 2),
            "trend": "increasing" if trend_pct > 2 else "decreasing" if trend_pct < -2 else "stable",
        },
    }
