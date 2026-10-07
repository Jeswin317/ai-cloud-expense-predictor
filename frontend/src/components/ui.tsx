import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ApiError } from "../api";

export const Spinner = () => (
  <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
);

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  const t = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-slate-500";
  return (
    <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className={`mt-1 text-xs ${t}`}>{hint}</p>}</div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card"><h3 className="mb-4 font-semibold">{title}</h3><div className="h-72">{children}</div></div>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-400" /><h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 mt-1 max-w-md text-sm text-slate-500">{text}</p>{action}
    </div>
  );
}

/** Shows a friendly error; a 404 means "no data yet" so we point to the Upload page. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  if (error.status === 404) {
    return <EmptyState title="No data yet" text={error.message} action={<Link to="/upload" className="btn">Go to Upload</Link>} />;
  }
  return (
    <div className="card flex items-start gap-3 border-rose-300 dark:border-rose-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-500" />
      <div className="flex-1"><p className="font-medium">Something needs attention</p><p className="text-sm text-slate-500">{error.message}</p></div>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  );
}
