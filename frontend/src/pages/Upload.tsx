import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useApp } from "../AppContext";
import { PageHeader } from "../components/ui";
import type { UploadResult } from "../types";

export default function UploadPage() {
  const { toast } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const pick = (f: File | undefined) => {
    setError(""); setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { setError("Only .csv files are allowed."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("File is larger than 5 MB."); return; }
    setFile(f);
  };

  const run = async (fn: () => Promise<UploadResult>, okText: string) => {
    setBusy(true); setError("");
    try { const r = await fn(); setResult(r); toast("success", okText); }
    catch (e) { setError((e as Error).message); toast("error", "Upload failed."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Upload Data" subtitle="Import AWS, Azure or Google Cloud billing data as CSV" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
            onClick={() => input.current?.click()}
            className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-10 text-center hover:border-brand-500 dark:border-slate-700">
            <FileUp className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm">{file ? file.name : "Drag & drop a CSV here, or click to browse"}</p>
            <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select value={mode} onChange={(e) => setMode(e.target.value as "replace" | "append")}
              className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
              <option value="replace">Replace existing data</option><option value="append">Append to existing data</option>
            </select>
            <button className="btn" disabled={!file || busy} onClick={() => run(() => api.upload(file!, mode), "CSV imported.")}>{busy ? "Working…" : "Upload"}</button>
            <button className="btn-ghost" disabled={busy} onClick={() => run(api.demo, "Demo data loaded.")}>Use demo data</button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
          {result && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Imported {result.rows_imported.toLocaleString()} rows ({result.date_range[0]} to {result.date_range[1]}).
              {result.rows_skipped > 0 && ` ${result.rows_skipped} invalid row(s) were skipped.`}{" "}
              <Link className="underline" to="/">Open dashboard</Link>
            </div>
          )}
        </div>
        <div className="card text-sm">
          <h3 className="mb-2 font-semibold">CSV format</h3>
          <p className="mb-3 text-slate-500">Required columns: <code>date, service, region, usage, cost</code>. Optional: <code>provider</code> (AWS, Azure, GCP; guessed from the service name if missing).</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">{`date,provider,service,region,usage,cost
2026-09-01,AWS,AWS EC2,ap-south-1,120.5,1700.25
2026-09-01,Azure,Azure Blob Storage,centralindia,610,488.00
2026-09-01,GCP,GCP BigQuery,asia-south1,150,975.10`}</pre>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-500">
            <li>Dates like 2026-09-01; cost and usage must be non-negative numbers.</li>
            <li>Invalid rows are skipped and reported. Max 5 MB.</li>
            <li>At least 14 days of data are needed for predictions.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
