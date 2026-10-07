import { Activity, BarChart3, CloudCog, LayoutDashboard, LineChart, Menu, Settings, TriangleAlert, Upload, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Data", icon: Upload },
  { to: "/predictions", label: "Predictions", icon: LineChart },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/anomalies", label: "Anomalies", icon: TriangleAlert },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <span className="flex items-center gap-2 font-bold"><CloudCog className="h-5 w-5 text-brand-600" />Cloud Expense AI</span>
        <button aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </header>
      <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-12 z-40 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:fixed md:inset-y-0 md:left-0 md:top-0 md:block md:w-60`}>
        <div className="mb-6 hidden items-center gap-2 text-lg font-bold md:flex"><CloudCog className="h-6 w-6 text-brand-600" />Cloud Expense AI</div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-6 hidden items-center gap-1 text-xs text-slate-400 md:flex"><Activity className="h-3 w-3" />AWS · Azure · Google Cloud</p>
      </aside>
      <main className="p-4 md:ml-60 md:p-8"><Outlet /></main>
    </div>
  );
}
