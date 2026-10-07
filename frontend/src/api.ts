import type { Anomaly, DashboardData, Period, PredictionData, RegionCost, ServiceCost, UploadResult } from "./types";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Make sure it is running.`);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch { /* keep default message */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardData>("/api/dashboard"),
  history: (g: "daily" | "monthly") => request<Period[]>(`/api/expenses/history?granularity=${g}`),
  byService: () => request<ServiceCost[]>("/api/expenses/by-service"),
  byRegion: () => request<RegionCost[]>("/api/expenses/by-region"),
  predictions: (horizon: number) => request<PredictionData>(`/api/predictions?horizon=${horizon}`),
  anomalies: () => request<Anomaly[]>("/api/anomalies"),
  demo: () => request<UploadResult>("/api/demo", { method: "POST" }),
  clear: () => request<{ status: string }>("/api/data", { method: "DELETE" }),
  upload: (file: File, mode: "replace" | "append") => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    return request<UploadResult>("/api/upload", { method: "POST", body: form });
  },
};
