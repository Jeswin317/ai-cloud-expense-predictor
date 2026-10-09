import streamlit as st
import pandas as pd
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from ml.forecasting import build_daily_series, forecast, InsufficientDataError
from ml.anomalies import detect_anomalies

st.set_page_config(
    page_title="AI Cloud Expense Predictor",
    page_icon="☁️",
    layout="wide",
)

st.title("☁️ AI Cloud Expense Predictor")
st.caption("Monitor cloud spending, detect anomalies, and predict future expenses using Machine Learning.")

st.sidebar.header("📂 Billing Data")
uploaded_file = st.sidebar.file_uploader("Upload billing CSV", type=["csv"])


@st.cache_data
def load_demo_data():
    path = ROOT / "data" / "sample_billing.csv"
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    return df


df = None

if uploaded_file is not None:
    try:
        df = pd.read_csv(uploaded_file)
        df["date"] = pd.to_datetime(df["date"])
        st.sidebar.success("CSV loaded successfully.")
    except Exception as e:
        st.error(f"Could not read CSV: {e}")
        st.stop()
else:
    try:
        df = load_demo_data()
        st.sidebar.info("Demo data is being used.")
    except Exception as e:
        st.error(f"Could not load demo data: {e}")
        st.stop()

required_columns = {"date", "service", "usage", "cost"}
missing = required_columns - set(df.columns)

if missing:
    st.error("Missing required columns: " + ", ".join(sorted(missing)))
    st.stop()

df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
df = df.dropna(subset=["date", "cost"])

if df.empty:
    st.error("The CSV contains no valid billing records.")
    st.stop()

total_cost = float(df["cost"].sum())
latest_date = df["date"].max()
month_data = df[
    (df["date"].dt.year == latest_date.year)
    & (df["date"].dt.month == latest_date.month)
]
monthly_cost = float(month_data["cost"].sum())

days = max((latest_date - df["date"].min()).days + 1, 1)
daily_average = total_cost / days

service_costs = df.groupby("service")["cost"].sum().sort_values(ascending=False)
most_expensive_service = (
    service_costs.index[0] if not service_costs.empty else "N/A"
)

st.subheader("📊 Cloud Expense Dashboard")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Expenditure", f"₹{total_cost:,.2f}")
c2.metric("Current Month", f"₹{monthly_cost:,.2f}")
c3.metric("Daily Average", f"₹{daily_average:,.2f}")
c4.metric("Most Expensive Service", str(most_expensive_service))

daily = build_daily_series(df)

prediction = None
try:
    prediction = forecast(daily, horizon=90)
except InsufficientDataError as e:
    st.warning(str(e))

st.divider()

left, right = st.columns(2)

with left:
    st.subheader("📈 Daily Cloud Spending")
    st.line_chart(daily.rename("Daily Cost"))

with right:
    st.subheader("☁️ Cost by Service")
    st.bar_chart(service_costs)

if prediction:
    st.divider()
    st.subheader("🤖 AI Cost Predictions")

    p1, p2, p3 = st.columns(3)

    for col, horizon in zip([p1, p2, p3], [7, 30, 90]):
        result = prediction["summary"][str(horizon)]
        col.metric(f"Next {horizon} Days", f"₹{result['total']:,.2f}")
        col.caption(
            f"Estimated range: ₹{result['lower']:,.2f} – ₹{result['upper']:,.2f}"
        )

    st.subheader("🔮 Future Cost Forecast")
    future = pd.DataFrame(prediction["points"])
    future["date"] = pd.to_datetime(future["date"])
    future = future.set_index("date")
    st.line_chart(future[["predicted"]])

    metrics = prediction["metrics"]
    st.subheader("🧠 Model Information")

    m1, m2, m3 = st.columns(3)
    m1.metric("Model", "Linear Regression")
    m2.metric("Estimated Accuracy", f"{metrics['accuracy_pct']}%")
    m3.metric("Spending Trend", metrics["trend"].title())

    st.caption(
        "Accuracy is estimated using a hold-out backtest; it is not a guarantee "
        "of future prediction accuracy."
    )

st.divider()
st.subheader("🚨 Spending Anomalies")

try:
    anomalies = detect_anomalies(df)
    if anomalies:
        anomaly_df = pd.DataFrame(anomalies)
        st.dataframe(anomaly_df, use_container_width=True, hide_index=True)
    else:
        st.success("No significant spending anomalies detected.")
except Exception as e:
    st.warning(f"Anomaly detection could not run: {e}")

st.divider()

with st.expander("📄 View Billing Data"):
    st.dataframe(df, use_container_width=True, hide_index=True)

st.caption("AI Cloud Expense Predictor • Machine Learning powered cloud cost analysis")