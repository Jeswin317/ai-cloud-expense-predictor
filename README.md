# AI Cloud Expense Predictor

Monitor cloud spending, spot unusual spikes and forecast the next 7, 30 and 90 days from your AWS, Azure or Google Cloud billing CSVs. Everything runs locally; no cloud credentials are needed.

## Features
- **Dashboard**: total / monthly spend, daily average, projected next-month cost, % change, top service, insights and cost-saving recommendations.
- **CSV upload** with validation (type, size, columns, invalid rows) and one-click **demo data**.
- **Predictions**: 7/30/90-day forecast with a confidence range, backtest accuracy and trend detection.
- **Analytics**: daily, monthly, by service, by region, historical vs predicted, usage vs cost (interactive Recharts).
- **Anomaly detection** with actual vs expected cost, difference and an inferred reason.
- **Insights** written from your data; recommendations are labelled as such, with no guaranteed savings.
- Responsive SaaS UI, dark/light mode, toasts, loading / empty / error states.

## Architecture
```
React + TS + Tailwind  --HTTP/JSON-->  FastAPI  --SQLAlchemy-->  SQLite
                                          |
                                          +--> ml/ (pandas, numpy, scikit-learn)
```
- `backend/app/ingestion.py`: `BillingSource` interface + `CsvBillingSource`. Add AWS Cost Explorer / Azure / GCP API sources later by subclassing; nothing else changes.
- `backend/app/services.py`: glue between the database and `ml/`.
- `ml/`: forecasting, anomaly detection and insights are pure functions with no web or database code.

## Tech stack
React 18, TypeScript, Tailwind CSS 3, Recharts, Vite · Python 3.10+, FastAPI, SQLAlchemy 2, SQLite · pandas, numpy, scikit-learn.

## Folder structure
```
ai-cloud-expense-predictor/
├── backend/            FastAPI app (app/main.py, models.py, services.py, ingestion.py ...)
├── frontend/           React app (src/pages, src/components, src/api.ts)
├── ml/                 forecasting.py, anomalies.py, insights.py, generate_sample.py
├── data/               sample_billing.csv
├── README.md
└── .gitignore
```

## Installation and running

**Backend** (terminal 1):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
uvicorn app.main:app --reload      # http://localhost:8000  (docs at /docs)
```

**Frontend** (terminal 2, Node 18+):
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                        # http://localhost:5173
```
Open the app and click **Load demo data**, or upload your own CSV on the Upload page. The database (`backend/cloud_expense.db`) is created automatically on first start.

## ML approach
- **Model**: Linear Regression on a time index plus day-of-week dummies. It is quick, runs on any laptop, works with as little as 14 days of data, and captures the two things that dominate cloud bills: a trend and a weekly cycle. It is also easy to explain. Tree models (Random Forest/XGBoost) cannot extrapolate a trend and need much more history, so they were not chosen for v1.
- **Training data**: total cost per day (missing days interpolated). Extreme spikes are clipped during training so one anomaly does not bend the trend.
- **Confidence**: range = prediction ± 1.96 × residual standard deviation. **Accuracy**: the last 7 days are held out, predicted, and compared (shown as 100 − MAPE).
- **Trend**: the regression slope per 30 days relative to the recent average (increasing > +2%, decreasing < −2%).
- **Anomalies**: for each service, a day is flagged if its cost is at least 1.4× the median of the previous 14 days and more than 3 standard deviations above it. The reason compares the cost jump with the usage jump.
- There is no separate training step: the model is fitted on demand each time predictions are requested (milliseconds). Retrain simply by uploading new data. Run `python ml/generate_sample.py` to regenerate the sample data.

## Sample CSV format
```csv
date,provider,service,region,usage,cost
2026-09-01,AWS,AWS EC2,ap-south-1,120.5,1700.25
```
Required: `date, service, region, usage, cost`. Optional: `provider`. Costs are treated as ₹ by default (display symbol can be changed in Settings). The included sample covers 2026-04-01 to 2026-09-30, 11 service/region combinations, three clouds, a growth trend and four planted spikes.

## API
Interactive docs: http://localhost:8000/docs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Multipart `file` (.csv, ≤5 MB) + `mode` = `replace` or `append` |
| POST | `/api/demo` | Load the bundled sample data |
| DELETE | `/api/data` | Delete all data |
| GET | `/api/dashboard` | Summary statistics, insights, recommendations |
| GET | `/api/expenses/history?granularity=daily\|monthly` | Cost over time |
| GET | `/api/expenses/by-service` | Cost and usage per service |
| GET | `/api/expenses/by-region` | Cost per region |
| GET | `/api/predictions?horizon=7..90` | History, forecast, summaries, model metrics |
| GET | `/api/anomalies` | Detected spending anomalies |
| GET | `/api/insights` | AI-generated insights |

Errors return `{"detail": "<friendly message>"}` with 400 (bad file/data), 404 (no data yet), 413 (too large), 422 (not enough history).

## Security notes
CSV-only uploads, size limit, in-memory parsing (files are never saved to disk), column and value validation, no secrets in code (`.env`), CORS limited to configured origins, internal errors are never exposed to clients. v1 has no authentication, so run it locally or add auth before exposing it publicly.

## Screenshots
_Add your own screenshots here: `docs/dashboard.png`, `docs/predictions.png`, `docs/anomalies.png`._

## Future improvements
User accounts and multi-tenant data, live AWS/Azure/GCP API connectors, Prophet/XGBoost model comparison, budget alerts by email/Slack, per-service forecasts, Alembic migrations, Docker Compose, automated tests.
