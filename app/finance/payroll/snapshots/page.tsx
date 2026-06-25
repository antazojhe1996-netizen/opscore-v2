"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { Database, Search } from "lucide-react";
import PageGuard from "@/components/PageGuard";

export default function PayrollSnapshotsPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getSnapshots = async () => {
    const { data, error } = await supabase
      .from("payroll_snapshots")
      .select("*")
      .order("snapshot_created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setSnapshots(data || []);
  };

  useEffect(() => {
    getSnapshots();
  }, []);

  const filteredSnapshots = snapshots.filter((item) =>
    `${item.employee_name} ${item.department} ${item.period_label}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

 return (
  <PageGuard moduleKey="payroll_snapshots">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 overflow-x-hidden p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Payroll
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Payroll Snapshots
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Frozen payroll records sent to Payroll Manager.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Database size={18} />
              <span className="font-black">
                {snapshots.length} Snapshots
              </span>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-500"
            />

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 outline-none"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-right">Release</th>
                  <th className="px-4 py-3 text-center">Snapshot Type</th>
                  <th className="px-4 py-3 text-center">Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredSnapshots.map((snapshot) => (
                  <tr
                    key={snapshot.id}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-bold">
                      {snapshot.employee_name}
                    </td>

                    <td className="px-4 py-3">
                      {snapshot.department}
                    </td>

                    <td className="px-4 py-3">
                      {snapshot.period_label}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(snapshot.gross_pay)}
                    </td>

                    <td className="px-4 py-3 text-right text-red-400">
                      {formatMoney(snapshot.total_deductions)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {formatMoney(snapshot.net_pay)}
                    </td>

                    <td className="px-4 py-3 text-right text-cyan-400">
                      {formatMoney(snapshot.release_amount)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
                        {snapshot.snapshot_type}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center text-slate-400">
                      {new Date(
                        snapshot.snapshot_created_at
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {filteredSnapshots.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No payroll snapshots found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      </div>
  </PageGuard>
);
}


