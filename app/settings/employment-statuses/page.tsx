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
  const [editingStatusId, setEditingStatusId] = useState("");

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

  const clearForm = () => {
    setEditingStatusId("");
    setEmploymentStatusName("");
    setCountInWorkforce(true);
    setAllowScheduling(true);
    setShowInReports(true);
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

    clearForm();
    getEmploymentStatuses();
  };

  const editEmploymentStatus = (status: any) => {
    setEditingStatusId(status.id);
    setEmploymentStatusName(status.name);
    setCountInWorkforce(status.count_in_workforce);
    setAllowScheduling(status.allow_scheduling);
    setShowInReports(status.show_in_reports);
  };

  const updateEmploymentStatus = async () => {
    if (!editingStatusId) return;
    if (!employmentStatusName.trim()) return;

    const { error } = await supabase
      .from("employment_statuses")
      .update({
        name: employmentStatusName,
        count_in_workforce: countInWorkforce,
        allow_scheduling: allowScheduling,
        show_in_reports: showInReports,
      })
      .eq("id", editingStatusId);

    if (error) {
      console.log(error);
      return;
    }

    clearForm();
    getEmploymentStatuses();
  };

  const deleteEmploymentStatus = async (id: string) => {
    const confirmDelete = confirm("Delete this employment status?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("employment_statuses")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    getEmploymentStatuses();
  };

  /// EFFECTS
  useEffect(() => {
    getEmploymentStatuses();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Employment Status Management</h1>

        <p className="mt-2 text-slate-400">
          Configure employment statuses and how they behave in workforce and scheduling.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">
            {editingStatusId ? "Edit Employment Status" : "Add Employment Status"}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
              placeholder="Status Name"
              value={employmentStatusName}
              onChange={(e) => setEmploymentStatusName(e.target.value)}
            />

            <label className="flex items-center gap-2 rounded bg-slate-800 p-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={countInWorkforce}
                onChange={(e) => setCountInWorkforce(e.target.checked)}
              />
              Count in Workforce
            </label>

            <label className="flex items-center gap-2 rounded bg-slate-800 p-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={allowScheduling}
                onChange={(e) => setAllowScheduling(e.target.checked)}
              />
              Allow Scheduling
            </label>

            <label className="flex items-center gap-2 rounded bg-slate-800 p-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={showInReports}
                onChange={(e) => setShowInReports(e.target.checked)}
              />
              Show in Reports
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={editingStatusId ? updateEmploymentStatus : addEmploymentStatus}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              {editingStatusId ? "Update Status" : "Add Status"}
            </button>

            {editingStatusId && (
              <button
                onClick={clearForm}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Employment Status List</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#08081a] text-slate-300">
                <tr>
                  <th className="p-4">Status Name</th>
                  <th className="p-4 text-center">Workforce</th>
                  <th className="p-4 text-center">Scheduling</th>
                  <th className="p-4 text-center">Reports</th>
                  <th className="w-48 p-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {employmentStatuses.map((status) => (
                  <tr
                    key={status.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="p-4 font-bold">{status.name}</td>

                    <td className="p-4 text-center">
                      <span
                        className={
                          status.count_in_workforce
                            ? "font-semibold text-green-400"
                            : "font-semibold text-red-400"
                        }
                      >
                        {status.count_in_workforce ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={
                          status.allow_scheduling
                            ? "font-semibold text-green-400"
                            : "font-semibold text-red-400"
                        }
                      >
                        {status.allow_scheduling ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={
                          status.show_in_reports
                            ? "font-semibold text-green-400"
                            : "font-semibold text-red-400"
                        }
                      >
                        {status.show_in_reports ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="w-48 p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editEmploymentStatus(status)}
                          className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteEmploymentStatus(status.id)}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {employmentStatuses.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={5}>
                      No employment statuses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}