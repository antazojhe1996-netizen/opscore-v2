import Link from "next/link";

export default function Sidebar() {
  const menuItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Workforce", href: "/workforce" },
    { label: "Scheduling", href: "/scheduling" },
    { label: "Leave Management", href: "/leave-management" },
    { label: "Forecasting", href: "/forecasting" },
    { label: "Finance", href: "/finance" },
    { label: "Employee Details", href: "/employees" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <aside className="min-h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-5 text-white">
      {/* BRAND */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-sm font-black tracking-tight text-white shadow-lg shadow-blue-500/20">
            OS
          </div>

          <div>
            <h1 className="text-sm font-black tracking-wide text-white">
              OPSCORE
            </h1>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Hotel Ops Platform
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-900 hover:text-white"
          >
            {item.label}
          </Link>



        ))}

                <Link
            href="/finance/payroll"
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            Payroll
          </Link>
      </nav>

      {/* FOOTER */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold text-slate-400">
          OPSCORE v1
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Operations, workforce, finance, and executive monitoring.
        </p>
      </div>
    </aside>
  );
}