export interface Insight { type: "info" | "warning" | "success" | "recommendation"; text: string }
export interface DashboardData {
  has_data: boolean;
  total_cost?: number; current_month_cost?: number; current_month_label?: string; previous_month_cost?: number;
  daily_average?: number; projected_next_month?: number | null; change_pct?: number | null;
  top_service?: { name: string; cost: number }; date_range?: [string, string]; anomaly_count?: number;
  forecast_available?: boolean; recommendations?: string[]; insights?: Insight[];
}
export interface Period { period: string; cost: number }
export interface ServiceCost { service: string; provider: string; cost: number; usage: number }
export interface RegionCost { region: string; cost: number }
export interface ForecastPoint { date: string; predicted: number; lower: number; upper: number }
export interface Summary { total: number; lower: number; upper: number }
export interface PredictionData {
  history: { date: string; actual: number }[];
  forecast: ForecastPoint[];
  summary: Record<string, Summary>;
  metrics: { model: string; backtest_mape: number; accuracy_pct: number; r2: number; training_days: number; trend_pct_per_30d: number; trend: string };
}
export interface Anomaly {
  date: string; service: string; actual_cost: number; expected_cost: number; difference: number; deviation_pct: number; reason: string;
}
export interface UploadResult { rows_imported: number; rows_skipped: number; date_range: [string, string] }
