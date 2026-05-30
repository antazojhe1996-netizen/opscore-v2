"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function EmploymentStatusPage() {
  /// STATES
  const [employmentStatuses, setEmploymentStatuses] = useState<any[]>([]);
  const [employmentStatusName, setEmploymentStatusName] = useState("");
  const [countInWorkforce, setCountInWorkforce] = useState(true);
  const [allowScheduling, setAllowScheduling] = useState(true);
  const [showInReports, setShowInReports] = useState(true);

  /// FUNCTIONS
  const getEmploymentStatuses = async () => {
    const { data, error } = await supabase
      .from("employment_statuses")
      .select("*")
      .order("name");

    if (error) {
      console.log(error);
      return;
    }

    setEmploymentStatuses(data || []);
  };

  const addEmploymentStatus = async () => {
    if (!employmentStatusName.trim()) return;

    const { error } = await supabase.from("employment_statuses").insert({
      name: employmentStatusName,
      count_in_workforce: countInWorkforce,
      allow_scheduling: allowScheduling,
      show_in_reports: showInReports,
    });

    if (error) {
      console.log(error);
      return;
    }

    setEmploymentStatusName("");
    setCountInWorkforce(true);
    setAllowScheduling(true);
    setShowInReports(true);
    getEmploymentStatuses();
  };

  /// EFFECTS
  useEffect(() => {
    getEmploymentStatuses();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">
          Employment Status Management
        </h1>

        <p className="mt-2 text-slate-400">
          Configure employment statuses and how they behave in workforce and scheduling.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">
            Add Employment Status
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              value={employmentStatusName}
              onChange={(e) => setEmploymentStatusName(e.target.value)}
              placeholder="Status Name"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={countInWorkforce}
                  onChange={(e) => setCountInWorkforce(e.target.checked)}
                />
                Count in Workforce
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={allowScheduling}
                  onChange={(e) => setAllowScheduling(e.target.checked)}
                />
                Allow Scheduling
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={showInReports}
                  onChange={(e) => setShowInReports(e.target.checked)}
                />
                Show in Reports
              </label>
            </div>
          </div>

          <button
            onClick={addEmploymentStatus}
            className="mt-4 rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black"
          >
            Add Status
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">
            Employment Status List
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-300">
                <th className="py-3">Status Name</th>
                <th className="py-3 text-center">Workforce</th>
                <th className="py-3 text-center">Scheduling</th>
                <th className="py-3 text-center">Reports</th>
              </tr>
            </thead>

            <tbody>
              {employmentStatuses.map((status) => (
                <tr
                  key={status.id}
                  className="border-b border-slate-800"
                >
                  <td className="py-3 font-semibold">{status.name}</td>

                  <td className="py-3 text-center">
                    {status.count_in_workforce ? "Yes" : "No"}
                  </td>

                  <td className="py-3 text-center">
                    {status.allow_scheduling ? "Yes" : "No"}
                  </td>

                  <td className="py-3 text-center">
                    {status.show_in_reports ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}