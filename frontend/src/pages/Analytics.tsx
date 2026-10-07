import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { api } from "../api";
import { useApp } from "../AppContext";
import { ChartCard, ErrorState, PageHeader, Spinner } from "../components/ui";
import { useApi } from "../hooks";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];

export default function Analytics() {
  const { money } = useApp();
  const daily = useApi(() => api.history("daily"));
  const monthly = useApi(() => api.history("monthly"));
  const services = useApi(api.byService);
  const regions = useApi(api.byRegion);

  const err = daily.error ?? monthly.error ?? services.error ?? regions.error;
  if (err) return <ErrorState error={err} onRetry={() => { daily.reload(); monthly.reload(); services.reload(); regions.reload(); }} />;
  if (daily.loading || monthly.loading || services.loading || regions.loading) return <Spinner />;
  const yAxis = <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />;
  const tip = <Tooltip formatter={(v) => money(Number(v))} />;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Explore where your cloud money goes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily cost"><ResponsiveContainer><LineChart data={daily.data!}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="period" minTickGap={40} tick={{ fontSize: 11 }} />{yAxis}{tip}
          <Line dataKey="cost" stroke="#6366f1" dot={false} name="Cost" /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Monthly cost"><ResponsiveContainer><BarChart data={monthly.data!}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="period" tick={{ fontSize: 11 }} />{yAxis}{tip}
          <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} name="Cost" /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Cost by cloud service"><ResponsiveContainer><BarChart data={services.data!} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} />
          <YAxis type="category" dataKey="service" width={150} tick={{ fontSize: 11 }} />{tip}
          <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]}>{services.data!.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
        </BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Cost by region"><ResponsiveContainer><PieChart>
          <Pie data={regions.data!} dataKey="cost" nameKey="region" outerRadius={95} label={(e) => e.region}>
            {regions.data!.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
          {tip}<Legend /></PieChart></ResponsiveContainer></ChartCard>
        <div className="lg:col-span-2"><ChartCard title="Usage vs cost (each dot is a service)"><ResponsiveContainer><ScatterChart>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" dataKey="usage" name="Usage" tick={{ fontSize: 11 }} /><YAxis type="number" dataKey="cost" name="Cost" tick={{ fontSize: 11 }} tickFormatter={(v) => money(v)} width={70} />
          <ZAxis range={[80, 80]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => payload?.length ? (
            <div className="rounded-lg border bg-white p-2 text-xs text-slate-800 shadow">
              <b>{payload[0].payload.service}</b><br />Usage: {Math.round(payload[0].payload.usage).toLocaleString()}<br />Cost: {money(payload[0].payload.cost)}</div>) : null} />
          <Scatter data={services.data!} fill="#6366f1" /></ScatterChart></ResponsiveContainer></ChartCard></div>
      </div>
    </>
  );
}
