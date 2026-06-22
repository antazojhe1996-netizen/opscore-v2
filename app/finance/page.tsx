"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Landmark,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import TopNavbar from "@/components/TopNavbar";

export default function FinancePage() {
  const workbenchActions = [
    {
      title: "Cash Management",
      description: "Open drawer, cash movements, remittance, liquidation, and accountability.",
      href: "/finance/cash-management",
      primary: true,
    },
    {
      title: "Financial Watcher",
      description: "Review cash variance, posting issues, and financial exposure.",
      href: "/finance/watcher",
      watcher: true,
    },
    {
      title: "Expenses Ledger",
      description: "Record, review, export, and void operating expenses.",
      href: "/finance/expenses",
    },
    {
      title: "Bills Monitoring",
      description: "Monitor bills, payables, due dates, and owner obligations.",
      href: "/finance/bills",
    },
    {
      title: "Apartment Operations",
      description: "Review apartment collections, exposure, billing, and payments.",
      href: "/finance/apartment",
    },
    {
      title: "Approval Center",
      description: "Review requests before cash or payroll release.",
      href: "/approval-center",
    },
  ];

  return (
    <PageGuard moduleKey="finance_dashboard">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />
        <TopNavbar breadcrumb="FINANCE / DASHBOARD" />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          {/* PAGE HEADER */}
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Finance
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Finance Dashboard
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Monitor cash control, revenue, expenses, approvals, accountability, and financial risk from one workspace.
              </p>
            </div>

            <Link
              href="/finance/watcher"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              <Eye size={16} />
              Open Financial Watcher
            </Link>
          </section>

          {/* KPI ROW */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              icon={<Banknote size={22} />}
              title="Cash Position"
              value="₱0.00"
              description="Available cash and accountable funds."
              status="Stable"
            />

            <FinanceKpiCard
              icon={<BarChart3 size={22} />}
              title="Revenue Today"
              value="₱0.00"
              description="Rooms, restaurant, apartment, and other collections."
              status="Monitoring"
            />

            <FinanceKpiCard
              icon={<Receipt size={22} />}
              title="Expenses Today"
              value="₱0.00"
              description="Approved, released, posted, and liquidated expenses."
              status="Controlled"
            />

            <FinanceKpiCard
              icon={<AlertTriangle size={22} />}
              title="Financial Exposure"
              value="₱0.00"
              description="Variance, missing postings, and unresolved findings."
              status="Review"
              warning
            />
          </section>

          {/* WATCHER HIGHLIGHT */}
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  OPSCORE Watcher
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Financial Watcher
                </h2>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Financial Watcher reviews drawer variance, missing movements, approval posting gaps, and financial exposure so managers can understand cash issues without reading full audit trails.
                </p>
              </div>

              <Link
                href="/finance/watcher"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                View Findings
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <WatcherMiniCard label="Critical Findings" value="0" tone="danger" />
              <WatcherMiniCard label="Needs Review" value="0" tone="warning" />
              <WatcherMiniCard label="Balanced Areas" value="0" tone="success" />
            </div>
          </section>

          {/* WORKBENCH ACTIONS */}
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Financial Workbench Actions
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Open Daily Finance Workflows
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Use these shortcuts for cash control, expenses, approvals, bills, and financial monitoring.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workbenchActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">
                          {item.title}
                        </h3>

                        {item.primary && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                            Primary
                          </span>
                        )}

                        {item.watcher && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">
                            Watcher
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>

                    <ArrowUpRight
                      size={17}
                      className="shrink-0 text-slate-400 transition group-hover:text-slate-950"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* FINANCE CONTROL SUMMARY */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <FinancePanel
              icon={<Wallet size={22} />}
              title="Cash Accountability"
              value="₱0.00"
              description="Released cash, drawer accountability, remittance, and liquidation exposure."
              items={[
                "Cash drawer monitoring active",
                "Liquidation review ready",
                "Variance findings routed to Watcher",
              ]}
            />

            <FinancePanel
              icon={<CreditCard size={22} />}
              title="Expense Control"
              value="₱0.00"
              description="Operational spending under approval and liquidation control."
              items={[
                "Approved expenses monitored",
                "Voided expenses excluded",
                "Missing posting checks planned",
              ]}
            />

            <FinancePanel
              icon={<Landmark size={22} />}
              title="Revenue Mix"
              value="₱0.00"
              description="Consolidated revenue monitoring by source."
              items={[
                "Room sales",
                "Restaurant and pool bar sales",
                "Apartment and other revenue",
              ]}
            />
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function FinanceKpiCard({
  icon,
  title,
  value,
  description,
  status,
  warning,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  status: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </h3>
        </div>

        <div
          className={`rounded-2xl border p-3 ${
            warning
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>

      <div
        className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
          warning
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {status}
      </div>
    </div>
  );
}

function WatcherMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function FinancePanel({
  icon,
  title,
  value,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </h3>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700">
          {icon}
        </div>
      </div>  

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}