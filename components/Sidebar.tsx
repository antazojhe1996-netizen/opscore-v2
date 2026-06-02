import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-5 text-white">
      {/* BRAND */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-sm font-black text-white shadow-lg shadow-blue-500/20">
            OS
          </div>

          <div>
            <h1 className="text-sm font-black tracking-wide">
              OPSCORE
            </h1>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Hotel Ops Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">

        {/* DASHBOARD */}
        <Link
          href="/dashboard"
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
        >
          Dashboard
        </Link>

        {/* WORKFORCE */}
        <div className="mt-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          Workforce
        </div>

        <Link
          href="/workforce"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Workforce
        </Link>

        <Link
          href="/employees"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Employee Details
        </Link>

        <Link
          href="/scheduling"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Scheduling
        </Link>

        <Link
          href="/leave-management"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Leave Management
        </Link>

        <Link
          href="/forecasting"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Forecasting
        </Link>

        {/* FINANCE */}
        <div className="mt-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          Finance
        </div>

        <Link
          href="/finance"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Finance Dashboard
        </Link>

        {/* PAYROLL */}
        <div className="mt-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          Payroll
        </div>

        <Link
          href="/finance/payroll"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Payroll Center
        </Link>

        <Link
          href="/finance/payroll/attendance"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Attendance
        </Link>

        {/* SYSTEM */}
        <div className="mt-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          System
        </div>

        <Link
          href="/settings"
          className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Settings
        </Link>

      </nav>

      {/* FOOTER */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold text-slate-400">
          OPSCORE v1
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Operations, workforce, finance, payroll, and executive monitoring.
        </p>
      </div>
    </aside>
  );
}