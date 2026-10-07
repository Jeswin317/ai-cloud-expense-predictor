import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface Toast { id: number; kind: "success" | "error" | "info"; text: string }
interface Ctx {
  theme: Theme; setTheme: (t: Theme) => void;
  currency: string; setCurrency: (c: string) => void;
  money: (n: number | null | undefined) => string;
  toast: (kind: Toast["kind"], text: string) => void;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const saved = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(saved("theme", "light") as Theme);
  const [currency, setCurrencyState] = useState(saved("currency", "₹"));
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  const setTheme = (t: Theme) => { setThemeState(t); try { localStorage.setItem("theme", t); } catch { /* ignore */ } };
  const setCurrency = (c: string) => { setCurrencyState(c); try { localStorage.setItem("currency", c); } catch { /* ignore */ } };
  const money = (n: number | null | undefined) =>
    n == null ? "—" : `${currency}${Math.round(n).toLocaleString(currency === "₹" ? "en-IN" : "en-US")}`;
  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const color = { success: "bg-emerald-600", error: "bg-rose-600", info: "bg-slate-800" };
  return (
    <AppCtx.Provider value={{ theme, setTheme, currency, setCurrency, money, toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${color[t.kind]}`}>{t.text}</div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
