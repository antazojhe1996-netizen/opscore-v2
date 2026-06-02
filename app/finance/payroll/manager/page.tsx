"use client";

import Sidebar from "@/components/Sidebar";

export default function PayrollManagerPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Payroll
          </p>

          <h1 className="mt-2 text-4xl font-black">Payroll Manager</h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            Review OT approvals, payroll exceptions, deductions, and final payroll release.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card title="Pending OT" value="0" />
          <Card title="Payroll Exceptions" value="0" />
          <Card title="For Approval" value="0" />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">Approval Center</h2>
          <p className="mt-2 text-sm text-slate-400">
            Payroll approval workflow will be connected after Attendance and Payroll Register are stable.
          </p>
        </section>
      </main>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 text-3xl font-black text-white">{value}</h2>
    </div>
  );
}