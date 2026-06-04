"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function FinancePage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        {/* HEADER */}
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Finance
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Finance Dashboard
          </h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Manage expenses, billing, revenue, cash management,
            finance reports, and operational cash flow.
          </p>
        </section>

        {/* QUICK STATS */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Today's Revenue"
            value="₱0.00"
            description="Rooms + Restaurant + Other Revenue"
          />

          <DashboardCard
            title="Today's Expenses"
            value="₱0.00"
            description="Approved and released expenses"
          />

          <DashboardCard
            title="Pending Requests"
            value="0"
            description="Expense requests awaiting approval"
          />

          <DashboardCard
            title="Cash Accountability"
            value="₱0.00"
            description="Released cash not yet liquidated"
          />
        </section>

        {/* FINANCE MODULES */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">
            Finance Modules
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <FinanceModuleCard
              title="Expenses"
              description="Track expenses, approvals, releases and liquidation."
              href="/finance/expenses"
            />

            <FinanceModuleCard
              title="Expense Requests"
              description="Review and approve submitted expense requests."
              href="/finance/expense-requests"
            />

            <FinanceModuleCard
              title="Bills Monitoring"
              description="Track supplier payables and recurring bills."
              href="/finance/bills"
            />

            <FinanceModuleCard
              title="Cash Management"
              description="Monitor released cash and accountability."
              href="/finance/cash-management"
            />

            <FinanceModuleCard
              title="Revenue Sources"
              description="Track hotel, restaurant and other revenue."
              href="/finance/room-sales"
            />

            <FinanceModuleCard
              title="Finance Settings"
              description="Manage categories, payment methods and finance controls."
              href="/finance/settings"
            />
          </div>
        </section>

        {/* FINANCE HEALTH */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">
            Finance Health
          </h2>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Finance analytics, profit monitoring,
              budget tracking, cash flow analysis,
              and management reporting will appear here.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-3 text-3xl font-black">
        {value}
      </h3>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function FinanceModuleCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-amber-400"
    >
      <h3 className="text-lg font-bold group-hover:text-amber-400">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        {description}
      </p>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-400">
        Open Module →
      </p>
    </Link>
  );
}