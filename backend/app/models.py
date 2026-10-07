from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class BillingRecord(Base):
    __tablename__ = "billing_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    provider: Mapped[str] = mapped_column(String(20), default="Unknown")
    service: Mapped[str] = mapped_column(String(120), index=True)
    region: Mapped[str] = mapped_column(String(60), index=True)
    usage: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float)


class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    target_date: Mapped[date] = mapped_column(Date, index=True)
    predicted_cost: Mapped[float] = mapped_column(Float)
    lower: Mapped[float] = mapped_column(Float)
    upper: Mapped[float] = mapped_column(Float)


class Anomaly(Base):
    __tablename__ = "anomalies"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    service: Mapped[str] = mapped_column(String(120))
    actual_cost: Mapped[float] = mapped_column(Float)
    expected_cost: Mapped[float] = mapped_column(Float)
    difference: Mapped[float] = mapped_column(Float)
    deviation_pct: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(500), default="")

# Users table intentionally omitted: v1 has no authentication.
