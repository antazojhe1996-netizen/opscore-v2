"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function PayrollPage() {
  const cards = [
    {
      title: "Payroll Register",
      subtitle: "Generate payroll, compute net pay, and review payroll period.",
      href: "/finance/payroll/register",
      status: "Next Build",
      accent: "border-emerald-500/40",
    },
    {
      title: "Payroll Manager",
      subtitle: "Approve OT, payroll exceptions, and payroll release.",
      href: "/finance/payroll/manager",
      status: "Ready",
      accent: "border-blue-500/40",
    },
    {
      title: "Payroll Settings",
      subtitle: "Manage payroll rules, holidays, leave, benefits, and OT.",
      href: "/finance/payroll/settings",
      status: "Ready",
      accent: "border-amber-500/40",
    },
    {
      title: "Payslips",
      subtitle: "Print employee payslips after payroll approval.",
      href: "/finance/payroll/payslips",
      status: "Coming Soon",
      accent: "border-purple-500/40",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Payroll
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Payroll Center
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Manage employee rates, payroll computation, OT approvals,
              holiday pay, deductions, and payslip generation.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300">
              Payroll Status
            </p>
            <h2 className="mt-1 text-xl font-black text-amber-400">
              Setup Mode
            </h2>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Rate Types" value="Daily / Weekly / Monthly" />
          <SummaryCard title="OT Approval" value="Required" />
          <SummaryCard title="Leave Pay" value="Disabled" />
          <SummaryCard title="Holiday Pay" value="Enabled" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {cards.map((card) =>
            card.href === "#" ? (
              <div
                key={card.title}
                className={`rounded-3xl border ${card.accent} bg-slate-900 p-6 opacity-70`}
              >
                <CardContent card={card} />
              </div>
            ) : (
              <Link
                key={card.title}
                href={card.href}
                className={`group rounded-3xl border ${card.accent} bg-slate-900 p-6 transition hover:-translate-y-1 hover:bg-slate-800`}
              >
                <CardContent card={card} />
              </Link>
            )
          )}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Payroll Build Roadmap</h2>
            <p className="mt-2 text-sm text-slate-400">
              Current payroll direction for OPSCORE.
            </p>

            <div className="mt-6 space-y-4">
              <RoadmapItem
                number="01"
                title="Payroll Settings"
                status="Done"
                description="Rules for rates, OT, leave threshold, holidays, and benefits."
              />
              <RoadmapItem
                number="02"
                title="Employee Payroll Profile"
                status="Next"
                description="Add rate type, basic rate, and payroll active status per employee."
              />
              <RoadmapItem
                number="03"
                title="Payroll Register"
                status="Next"
                description="Auto-calculate basic pay, holiday pay, OT pay, deductions, and net pay."
              />
              <RoadmapItem
                number="04"
                title="Payslip PDF"
                status="Later"
                description="Generate printable payslips from approved payroll."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Payroll V1 Formula</h2>

            <div className="mt-5 space-y-3 text-sm">
              <FormulaLine label="Basic Pay" value="Rate × Worked" />
              <FormulaLine label="Gross Pay" value="Basic + Holiday + OT + Allowance" />
              <FormulaLine label="Net Pay" value="Gross - Deductions" />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm font-bold text-amber-400">
                Important Rule
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Approved leave is unpaid but not tagged as absent. Excess leave
                can affect employee KPI based on threshold settings.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 text-xl font-black text-white">{value}</h2>
    </div>
  );
}

function CardContent({ card }: any) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">{card.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {card.subtitle}
          </p>
        </div>

        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300">
          {card.status}
        </span>
      </div>

      <div className="mt-8 text-sm font-bold text-amber-400">
        Open Module →
      </div>
    </>
  );
}

function RoadmapItem({ number, title, status, description }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-slate-950">
            {number}
          </span>
          <h3 className="font-black">{title}</h3>
        </div>

        <span className="text-xs font-bold text-slate-400">{status}</span>
      </div>

      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function FormulaLine({ label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-bold text-emerald-400">{value}</span>
    </div>
  );
}