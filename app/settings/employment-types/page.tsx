"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function EmploymentTypesPage() {
  /// STATES
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employmentTypeName, setEmploymentTypeName] = useState("");
  const [countInWorkforce, setCountInWorkforce] = useState(true);
  const [allowScheduling, setAllowScheduling] = useState(true);
  const [showInReports, setShowInReports] = useState(true);

  /// FUNCTIONS
  const getEmploymentTypes = async () => {
    const { data, error } = await supabase
      .from("employment_types")
      .select("*")
      .order("name");

    if (error) {
      console.log(error);
      return;
    }

    setEmploymentTypes(data || []);
  };

  const addEmploymentType = async () => {
    if (!employmentTypeName.trim()) return;

    const { error } = await supabase.from("employment_types").insert({
      name: employmentTypeName,
      count_in_workforce: countInWorkforce,
      allow_scheduling: allowScheduling,
      show_in_reports: showInReports,
    });

    if (error) {
      console.log(error);
      return;
    }

    setEmploymentTypeName("");
    setCountInWorkforce(true);
    setAllowScheduling(true);
    setShowInReports(true);
    getEmploymentTypes();
  };

  /// EFFECTS
  useEffect(() => {
    getEmploymentTypes();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">
          Employment Type Management
        </h1>

        <p className="mt-2 text-slate-400">
          Configure employment types and how they behave in workforce and scheduling.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">
            Add Employment Type
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              value={employmentTypeName}
              onChange={(e) => setEmploymentTypeName(e.target.value)}
              placeholder="Type Name"
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
            onClick={addEmploymentType}
            className="mt-4 rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black"
          >
            Add Type
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">
            Employment Type List
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-300">
                <th className="py-3">Type Name</th>
                <th className="py-3 text-center">Workforce</th>
                <th className="py-3 text-center">Scheduling</th>
                <th className="py-3 text-center">Reports</th>
              </tr>
            </thead>

            <tbody>
              {employmentTypes.map((type) => (
                <tr
                  key={type.id}
                  className="border-b border-slate-800"
                >
                  <td className="py-3 font-semibold">{type.name}</td>

                  <td className="py-3 text-center">
                    {type.count_in_workforce ? "Yes" : "No"}
                  </td>

                  <td className="py-3 text-center">
                    {type.allow_scheduling ? "Yes" : "No"}
                  </td>

                  <td className="py-3 text-center">
                    {type.show_in_reports ? "Yes" : "No"}
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