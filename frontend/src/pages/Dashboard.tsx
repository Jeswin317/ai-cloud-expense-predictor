import { Lightbulb, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useApp } from "../AppContext";
import { ChartCard, EmptyState, ErrorState, PageHeader, Spinner, StatCard } from "../components/ui";
import { useApi } from "../hooks";

export default function Dashboard() {
  const { money, toast } = useApp();
  const dash = useApi(api.dashboard);
  const daily = useApi(() => api.history("daily").catch(() => []), [dash.data?.has_data]);
  const monthly = useApi(() => api.history("monthly").catch(() => []), [dash.data?.has_data]);
  const [busy, setBusy] = useState(false);

  const loadDemo = async () => {
    setBusy(true);
    try { await api.demo(); toast("success", "Demo data loaded."); dash.reload(); }
    catch (e) { toast("error", (e as Error).message); }
    finally { setBusy(false); }
  };

  if (dash.loading) return <Spinner />;
  if (dash.error) return <ErrorState error={dash.error} onRetry={dash.reload} />;
  const d = dash.data!;
  if (!d.has_data) {
    return (
      <EmptyState title="Welcome! No billing data yet" text="Upload a cloud billing CSV, or explore the app instantly with realistic demo data."
        action={<button className="btn" disabled={busy} onClick={loadDemo}>{busy ? "Loading…" : "Load demo data"}</button>} />
    );
  }
  const change = d.change_pct;
  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Data from ${d.date_range?.[0]} to ${d.date_range?.[1]}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total expenditure" value={money(d.total_cost)} />
        <StatCard label={`Spend in ${d.current_month_label}`} value={money(d.current_month_cost)} hint={`Previous month: ${money(d.previous_month_cost)}`} />
        <StatCard label="Daily average (last 30 days)" value={money(d.daily_average)} />
        <StatCard label="Projected next 30 days" value={d.forecast_available ? money(d.projected_next_month) : "Not enough data"}
          hint={change != null ? `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs last 30 days` : undefined} tone={change != null && change > 0 ? "bad" : "good"} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Most expensive service" value={d.top_service!.name} hint={money(d.top_service!.cost)} />
        <StatCard label="Anomalies detected" value={String(d.anomaly_count)} hint="See the Anomalies page for details" tone={d.anomaly_count ? "bad" : "good"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily cost">
          <ResponsiveContainer><AreaChart data={daily.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="period" minTickGap={40} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} /><Tooltip formatter={(v) => money(Number(v))} />
            <Area dataKey="cost" stroke="#6366f1" fill="#6366f133" name="Cost" />
          </AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly cost">
          <ResponsiveContainer><BarChart data={monthly.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} /><Tooltip formatter={(v) => money(Number(v))} />
            <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} name="Cost" />
          </BarChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-amber-500" />AI insights</h3>
          <ul className="space-y-2 text-sm">
            {d.insights?.filter((i) => i.type !== "recommendation").map((i, k) => (
              <li key={k} className="flex gap-2">{i.type === "warning" && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}<span>{i.text}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">Cost-saving recommendations</h3>
          <p className="mb-3 text-xs text-slate-500">Suggestions based only on your uploaded data; actual savings are not guaranteed.</p>
          {d.recommendations?.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{d.recommendations.map((r, k) => <li key={k}>{r}</li>)}</ul>
            : <p className="text-sm text-slate-500">No specific recommendations right now.</p>}
        </div>
      </div>
    </>
  );
}
