import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-800 bg-slate-950 p-6 text-white">
      <div className="mb-8">
        <p className="font-bold text-amber-400">● OPSCORE</p>
      </div>

      <nav className="flex flex-col gap-2">
        <Link href="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm">
          Dashboard
        </Link>

        <Link href="/workforce" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
          Workforce
        </Link>

        <Link href="/scheduling" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
          Scheduling
        </Link>

        <Link href="/forecasting" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
          Forecasting
        </Link>

        <Link href="/finance" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
          Finance
        </Link>
        <Link href="/employees" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
          Employee Details
        </Link>

        <Link
        href="/settings"
        className="block rounded-lg px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        Settings
      </Link>
      
      </nav>
    </aside>
  );
}