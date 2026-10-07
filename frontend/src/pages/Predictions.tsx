import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useApp } from "../AppContext";
import { ChartCard, ErrorState, PageHeader, Spinner, StatCard } from "../components/ui";
import { useApi } from "../hooks";

export default function Predictions() {
  const { money } = useApp();
  const [horizon, setHorizon] = useState(30);
  const { data, error, loading, reload } = useApi(() => api.predictions(horizon), [horizon]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const p = data!;
  const chart = [
    ...p.history.map((h) => ({ date: h.date, actual: h.actual })),
    ...p.forecast.map((f) => ({ date: f.date, predicted: f.predicted, band: [f.lower, f.upper] })),
  ];
  const m = p.metrics;
  return (
    <>
      <PageHeader title="Predictions" subtitle="Forecast of future cloud spending from your historical data">
        <div className="flex gap-2">{[7, 30, 90].map((h) => (
          <button key={h} onClick={() => setHorizon(h)} className={h === horizon ? "btn" : "btn-ghost"}>{h} days</button>))}</div>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        {["7", "30", "90"].map((h) => (
          <StatCard key={h} label={`Next ${h} days`} value={money(p.summary[h].total)} hint={`Likely range ${money(p.summary[h].lower)} – ${money(p.summary[h].upper)}`} />))}
      </div>
      <div className="mt-6"><ChartCard title="Historical vs predicted daily cost">
        <ResponsiveContainer><ComposedChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="date" minTickGap={40} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />
          <Tooltip formatter={(v) => Array.isArray(v) ? `${money(Number(v[0]))} – ${money(Number(v[1]))}` : money(Number(v))} /><Legend />
          <Area dataKey="band" name="Confidence range" stroke="none" fill="#f59e0b33" />
          <Line dataKey="actual" name="Actual" stroke="#6366f1" dot={false} strokeWidth={2} />
          <Line dataKey="predicted" name="Predicted" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="5 4" />
        </ComposedChart></ResponsiveContainer>
      </ChartCard></div>
      <div className="card mt-6 text-sm">
        <h3 className="mb-3 font-semibold">Model information</h3>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <div><dt className="text-slate-500">Model</dt><dd>{m.model}</dd></div>
          <div><dt className="text-slate-500">Trend</dt><dd className="capitalize">{m.trend} ({m.trend_pct_per_30d}% per 30 days)</dd></div>
          <div><dt className="text-slate-500">Backtest accuracy</dt><dd>{m.accuracy_pct}% (average daily error {m.backtest_mape}%)</dd></div>
          <div><dt className="text-slate-500">Training days / R²</dt><dd>{m.training_days} / {m.r2}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">Predictions are statistical estimates. Sudden changes in workloads or pricing are not captured.</p>
      </div>
    </>
  );
}
