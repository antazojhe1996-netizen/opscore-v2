"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function LeaveSettingsPage() {
  /// STATES
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);

  /// FUNCTIONS
  const getLeaveSettings = async () => {
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log("GET LEAVE SETTINGS ERROR:", error);
      return;
    }

    setLeaveSettings(data || []);
  };

  const updateLeaveSetting = async (
    id: number,
    field: string,
    value: any
  ) => {
    const { error } = await supabase
      .from("leave_settings")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      console.log("UPDATE LEAVE SETTING ERROR:", error);
      alert("Failed to update leave setting.");
      return;
    }

    getLeaveSettings();
  };

  useEffect(() => {
    getLeaveSettings();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Leave Settings</h1>
          <p className="text-sm text-slate-400">
            Manage leave types, credits, and leave policy rules.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Leave Controls</h2>
              <p className="text-sm text-slate-400">
                Configure which leave types are available and whether credits
                are required.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Leave Type</th>
                  <th className="py-3 pr-4">Default Credits</th>
                  <th className="py-3 pr-4">Enabled</th>
                  <th className="py-3 pr-4">Requires Credits</th>
                  <th className="py-3 pr-4">Policy Meaning</th>
                </tr>
              </thead>

              <tbody>
                {leaveSettings.map((leave) => (
                  <tr
                    key={leave.id}
                    className="border-b border-slate-800/70 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {leave.leave_type}
                    </td>

                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min="0"
                        value={leave.default_credits}
                        onChange={(e) =>
                          updateLeaveSetting(
                            leave.id,
                            "default_credits",
                            Number(e.target.value)
                          )
                        }
                        className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                      />
                    </td>

                    <td className="py-3 pr-4">
                      <button
                        onClick={() =>
                          updateLeaveSetting(
                            leave.id,
                            "is_enabled",
                            !leave.is_enabled
                          )
                        }
                        className={`rounded-full px-4 py-1 text-xs font-semibold ${
                          leave.is_enabled
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {leave.is_enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>

                    <td className="py-3 pr-4">
                      <button
                        onClick={() =>
                          updateLeaveSetting(
                            leave.id,
                            "requires_credits",
                            !leave.requires_credits
                          )
                        }
                        className={`rounded-full px-4 py-1 text-xs font-semibold ${
                          leave.requires_credits
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-slate-700 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {leave.requires_credits ? "Required" : "Not Required"}
                      </button>
                    </td>

                    <td className="py-3 pr-4 text-slate-400">
                      {leave.requires_credits
                        ? `Deduct from ${leave.default_credits} credits when approved`
                        : "Allowed even without leave credits"}
                    </td>
                  </tr>
                ))}

                {leaveSettings.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-slate-500"
                    >
                      No leave settings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}