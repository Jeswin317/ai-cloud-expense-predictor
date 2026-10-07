"""FastAPI application. Run from the backend/ folder:  uvicorn app.main:app --reload"""
from __future__ import annotations

from typing import Literal

import pandas as pd
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import services
from .config import CORS_ORIGINS, MAX_UPLOAD_BYTES, SAMPLE_CSV
from .database import get_db, init_db
from .ingestion import BillingDataError, CsvBillingSource

app = FastAPI(title="AI Cloud Expense Predictor", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST", "DELETE"], allow_headers=["*"])


@app.on_event("startup")
def startup():
    init_db()


@app.exception_handler(Exception)
async def unhandled(_, exc: Exception):
    # Never leak stack traces to the client.
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. Please try again."})


def require_data(db: Session) -> pd.DataFrame:
    df = services.load_df(db)
    if df.empty:
        raise HTTPException(404, "No billing data yet. Upload a CSV or load the demo data first.")
    return df


def ingest(db: Session, content: bytes, replace: bool) -> dict:
    try:
        df = CsvBillingSource(content).fetch()
    except BillingDataError as e:
        raise HTTPException(400, str(e))
    n = services.save_billing(db, df, replace)
    return {"rows_imported": n, "rows_skipped": df.attrs.get("skipped", 0),
            "date_range": [str(df["date"].min()), str(df["date"].max())]}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), mode: Literal["replace", "append"] = Form("replace"), db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are allowed.")
    if file.content_type not in (None, "text/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"):
        raise HTTPException(400, "Unsupported file type. Please upload a CSV file.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)  # kept in memory, never written to disk
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.")
    return ingest(db, content, mode == "replace")


@app.post("/api/demo")
def load_demo(db: Session = Depends(get_db)):
    if not SAMPLE_CSV.exists():
        raise HTTPException(500, "Sample data file is missing. Run: python ml/generate_sample.py")
    return ingest(db, SAMPLE_CSV.read_bytes(), True)


@app.delete("/api/data")
def clear(db: Session = Depends(get_db)):
    services.clear_all(db)
    return {"status": "cleared"}


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    df = services.load_df(db)
    if df.empty:
        return {"has_data": False}
    return services.dashboard(df, services.get_forecast(df), services.stored_anomalies(db))


@app.get("/api/expenses/history")
def history(granularity: Literal["daily", "monthly"] = "daily", db: Session = Depends(get_db)):
    df = require_data(db)
    if granularity == "monthly":
        g = df.groupby(df["date"].dt.strftime("%Y-%m"))["cost"].sum()
    else:
        g = df.groupby(df["date"].dt.strftime("%Y-%m-%d"))["cost"].sum()
    return [{"period": k, "cost": round(float(v), 2)} for k, v in g.items()]


@app.get("/api/expenses/by-service")
def by_service(db: Session = Depends(get_db)):
    df = require_data(db)
    g = df.groupby(["service", "provider"]).agg(cost=("cost", "sum"), usage=("usage", "sum")).reset_index().sort_values("cost", ascending=False)
    return [{"service": r.service, "provider": r.provider, "cost": round(r.cost, 2), "usage": round(r.usage, 2)} for r in g.itertuples()]


@app.get("/api/expenses/by-region")
def by_region(db: Session = Depends(get_db)):
    df = require_data(db)
    g = df.groupby("region")["cost"].sum().sort_values(ascending=False)
    return [{"region": k, "cost": round(float(v), 2)} for k, v in g.items()]


@app.get("/api/predictions")
def predictions(horizon: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)):
    df = require_data(db)
    fc = services.get_forecast(df)
    if fc is None:
        raise HTTPException(422, "Not enough history to predict. At least 14 days of billing data are required.")
    services.store_predictions(db, fc)
    daily = df.groupby("date")["cost"].sum().tail(60)
    return {
        "history": [{"date": d.date().isoformat(), "actual": round(float(c), 2)} for d, c in daily.items()],
        "forecast": fc["points"][:horizon],
        "summary": fc["summary"],
        "metrics": fc["metrics"],
    }


@app.get("/api/anomalies")
def anomalies(db: Session = Depends(get_db)):
    require_data(db)
    return services.stored_anomalies(db)


@app.get("/api/insights")
def insights(db: Session = Depends(get_db)):
    df = require_data(db)
    return services.generate_insights(df, services.get_forecast(df), services.stored_anomalies(db))
