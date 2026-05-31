"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function FinancePage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="mt-2 text-slate-400">
            Monitor revenue, expenses, and profit across hotel operations.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/finance/restaurant-import"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
          >
            <h2 className="text-xl font-bold">Restaurant Import</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Upload Poster POS sales data for restaurant revenue tracking.
            </p>

            <p className="mt-6 text-sm font-semibold text-yellow-400">
              Open Finance →
            </p>
          </Link>

          <Link
            href="/finance/settings"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
            >
            <h2 className="text-xl font-bold">Finance Settings</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
                Configure expense categories, payment methods, and revenue sources.
            </p>

            <p className="mt-6 text-sm font-semibold text-yellow-400">
                Open Finance →
            </p>
            </Link>

          <Link
  href="/finance/expenses"
  className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400 hover:bg-slate-800"
>
  <h2 className="text-xl font-bold">Expenses</h2>

  <p className="mt-3 text-sm leading-6 text-slate-400">
    Encode daily expenses by category, department, and payment method.
  </p>

  <p className="mt-6 text-sm font-semibold text-yellow-400">
    Open Finance →
  </p>
</Link>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 opacity-60">
            <h2 className="text-xl font-bold">Profit Dashboard</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              View hotel revenue, restaurant revenue, expenses, and net profit.
            </p>

            <p className="mt-6 text-sm font-semibold text-slate-500">
              Coming Soon
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}