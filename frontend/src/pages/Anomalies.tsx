import { CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";
import { useApi } from "../hooks";

export default function Anomalies() {
  const { money } = useApp();
  const { data, error, loading, reload } = useApi(api.anomalies);
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Anomalies" subtitle="Days where a service cost much more than its recent baseline" />
      {data!.length === 0 ? (
        <EmptyState title="No anomalies found" text="Spending looks consistent with its recent history." action={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>{["Date", "Service", "Actual", "Expected", "Difference", "Possible reason"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data!.map((a, i) => (
                <tr key={i} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap">{a.date}</td>
                  <td className="px-4 py-3">{a.service}</td>
                  <td className="px-4 py-3 font-medium text-rose-600">{money(a.actual_cost)}</td>
                  <td className="px-4 py-3">{money(a.expected_cost)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">+{money(a.difference)} (+{a.deviation_pct}%)</td>
                  <td className="px-4 py-3 text-slate-500">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">Reasons are inferred from usage vs cost patterns and should be verified in your cloud console.</p>
    </>
  );
}
