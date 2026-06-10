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
  DollarSign,
  Landmark,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";

export default function FinancePage() {
  const financeHealth = 92;

  const financeBriefing = [
    "Cash position is stable for today’s operations.",
    "Revenue monitoring is ready for room, restaurant, apartment, and other income streams.",
    "Expense exposure is controlled through requests, approvals, release, and liquidation.",
    "Pending requests and cash accountability should be reviewed before end-of-day closing.",
  ];

  const recommendedActions = [
    "Review pending finance approvals before cash release.",
    "Verify today’s revenue posting from rooms, restaurant, and apartment collections.",
    "Check unreconciled cash accountability and liquidation status.",
  ];

  const workbenchActions = [
    {
      title: "Cash Management",
      description: "Open drawer, cash movements, remittance, and accountability.",
      href: "/finance/cash-management",
      primary: true,
    },
    {
      title: "Expenses Ledger",
      description: "Record, review, export, and void operating expenses.",
      href: "/finance/expenses",
    },
    {
      title: "Apartment Operations",
      description: "Review apartment collections, exposure, billing, and payments.",
      href: "/finance/apartment",
    },
    {
      title: "Payroll Manager",
      description: "Review release control, partial balances, and payroll status.",
      href: "/payroll-manager",
    },
    {
      title: "Decision Center",
      description: "Review approvals before releasing cash or payroll actions.",
      href: "/approval-center",
    },
  ];

  return (
    <PageGuard moduleKey="finance_dashboard">
      <div className="flex min-h-screen bg-[#07111f] text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* HERO */}
          <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-[#0B1220] via-[#13203D] to-[#07111f] p-6 shadow-2xl shadow-blue-950/30 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
              <div className="xl:col-span-8">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-200/80">
                  Financial Command Center
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Finance Dashboard
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100/75 sm:text-base">
                  Monitor cash position, revenue performance, expenses,
                  pending approvals, and financial risk from one executive
                  workspace.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <HeroMiniStat label="Cash" value="Stable" />
                  <HeroMiniStat label="Controls" value="Active" />
                  <HeroMiniStat label="Risk" value="Review" />
                </div>
              </div>

              <div className="xl:col-span-4">
                <div className="rounded-[1.5rem] border border-blue-300/20 bg-white/[0.055] p-5 backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200/70">
                    Finance Health
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-5xl font-black leading-none text-white">
                        {financeHealth}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                        Controlled
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-emerald-200">
                      <ShieldCheck size={28} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-blue-100/65">
                    Finance controls are active. Review pending requests,
                    liquidations, and revenue posting before closing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* EXECUTIVE KPIS */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              icon={<Banknote size={22} />}
              title="Cash Position"
              value="₱0.00"
              description="Available cash and accountable funds"
              status="Stable"
            />

            <FinanceKpiCard
              icon={<TrendingUp size={22} />}
              title="Revenue Today"
              value="₱0.00"
              description="Rooms, restaurant, apartments, and other income"
              status="Monitoring"
            />

            <FinanceKpiCard
              icon={<Receipt size={22} />}
              title="Expenses Today"
              value="₱0.00"
              description="Approved, released, and posted expenses"
              status="Controlled"
            />

            <FinanceKpiCard
              icon={<Clock size={22} />}
              title="Pending Requests"
              value="0"
              description="Finance items waiting for review or approval"
              status="Action Queue"
              warning
            />
          </section>

          {/* WORKBENCH ACTIONS */}
          <section className="mt-8 rounded-[1.75rem] border border-blue-300/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Financial Workbench Actions
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Open Daily Finance Workflows
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Use these shortcuts for daily finance operations while this page remains the executive overview.
                </p>
              </div>

              <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-200/70">
                Workbench Layer
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {workbenchActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group rounded-2xl border p-4 transition ${
                    item.primary
                      ? "border-blue-400/30 bg-blue-600 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-200 hover:border-blue-300/20 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black">{item.title}</h3>
                      <p
                        className={`mt-2 text-xs leading-5 ${
                          item.primary ? "text-blue-50/80" : "text-slate-500"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={16}
                      className={item.primary ? "text-white" : "text-blue-300"}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* INTELLIGENCE */}
          <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 xl:col-span-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                    OPSCORE Finance Intelligence
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Executive Finance Briefing
                  </h2>
                </div>
                <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3 text-blue-200">
                  <BarChart3 size={24} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {financeBriefing.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-blue-300/10 bg-slate-950/50 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={16} />
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 xl:col-span-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                Recommended Actions
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Finance Control Checklist
              </h2>

              <div className="mt-6 space-y-3">
                {recommendedActions.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200/70">
                      Action {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FINANCE OVERVIEW */}
          <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <FinancePanel
              icon={<Wallet size={22} />}
              title="Cash Accountability"
              value="₱0.00"
              description="Released cash not yet liquidated or closed."
              items={[
                "Cash drawer monitoring active",
                "Liquidation review ready",
                "Accountability aging pending data",
              ]}
            />

            <FinancePanel
              icon={<CreditCard size={22} />}
              title="Expense Overview"
              value="₱0.00"
              description="Operational spending under finance control."
              items={[
                "Approved expenses included",
                "Voided expenses excluded from totals",
                "Pending approvals monitored separately",
              ]}
            />

            <FinancePanel
              icon={<Landmark size={22} />}
              title="Revenue Mix"
              value="₱0.00"
              description="Consolidated revenue monitoring by source."
              items={[
                "Room sales",
                "Restaurant and sports bar",
                "Apartment and other revenue",
              ]}
            />
          </section>

          {/* RISK MONITOR */}
          <section className="mt-8 rounded-[1.75rem] border border-red-300/10 bg-gradient-to-br from-red-500/10 via-slate-900/70 to-slate-950 p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/80">
                  Financial Risk Monitor
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Items Requiring Finance Review
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  This dashboard should highlight unmatched expenses, overdue
                  bills, pending liquidations, pending approvals, and cash
                  accountability exceptions once connected to live finance data.
                </p>
              </div>

              <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-red-200">
                <AlertTriangle size={30} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RiskMiniCard label="Unmatched Expenses" value="0" />
              <RiskMiniCard label="Pending Liquidations" value="0" />
              <RiskMiniCard label="Overdue Bills" value="0" />
              <RiskMiniCard label="Pending Approvals" value="0" />
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-300/10 bg-white/[0.045] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/60">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
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
    <div className="rounded-[1.5rem] border border-blue-300/10 bg-white/[0.04] p-5 shadow-xl shadow-black/15 transition hover:border-blue-300/20 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-400">{title}</p>
          <h3 className="mt-3 text-3xl font-black text-white">{value}</h3>
        </div>

        <div
          className={`rounded-2xl p-3 ${
            warning
              ? "border border-red-300/20 bg-red-500/10 text-red-200"
              : "border border-blue-300/20 bg-blue-500/10 text-blue-200"
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>

      <div className="mt-4 inline-flex rounded-full border border-blue-300/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200/80">
        {status}
      </div>
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
    <div className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.04] p-6 shadow-xl shadow-black/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
            {title}
          </p>
          <h3 className="mt-3 text-3xl font-black text-white">{value}</h3>
        </div>
        <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3 text-blue-200">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
            <ArrowUpRight size={14} className="text-blue-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-red-300/10 bg-slate-950/50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200/60">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
