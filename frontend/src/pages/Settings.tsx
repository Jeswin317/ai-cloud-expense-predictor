import { useState } from "react";
import { api, API_URL } from "../api";
import { useApp } from "../AppContext";
import { PageHeader } from "../components/ui";

export default function SettingsPage() {
  const { theme, setTheme, currency, setCurrency, toast } = useApp();
  const [busy, setBusy] = useState(false);

  const clear = async () => {
    if (!window.confirm("Delete all billing data, predictions and anomalies?")) return;
    setBusy(true);
    try { await api.clear(); toast("success", "All data deleted."); }
    catch (e) { toast("error", (e as Error).message); }
    finally { setBusy(false); }
  };
  const field = "rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700";

  return (
    <>
      <PageHeader title="Settings" />
      <div className="card max-w-xl space-y-5 text-sm">
        <div className="flex items-center justify-between"><span>Theme</span>
          <select className={field} value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
            <option value="light">Light</option><option value="dark">Dark</option></select></div>
        <div className="flex items-center justify-between"><span>Currency symbol (display only)</span>
          <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {["₹", "$", "€", "£"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="flex items-center justify-between"><span>Backend URL</span><code className="text-xs">{API_URL}</code></div>
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="mb-2 text-slate-500">Danger zone</p>
          <button className="btn bg-rose-600 hover:bg-rose-700" disabled={busy} onClick={clear}>Delete all data</button>
        </div>
      </div>
    </>
  );
}
