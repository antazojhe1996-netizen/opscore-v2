"use client";

import Sidebar from "@/components/Sidebar";

export default function Home() {
  /// STATES

  /// DATA

  /// CALCULATIONS

  /// FUNCTIONS

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Hotel operations command center
          </p>
        </section>

        <section className="mt-8 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Occupancy Today</p>
            <p className="mt-2 text-3xl font-bold">72%</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Rooms Sold</p>
            <p className="mt-2 text-3xl font-bold">43</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Required HC</p>
            <p className="mt-2 text-3xl font-bold">31</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Critical Alerts</p>
            <p className="mt-2 text-3xl font-bold text-red-400">3</p>
          </div>
        </section>
      </main>
    </div>
  );
}