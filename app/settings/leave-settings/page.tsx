"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

export default function LeaveSettingsPage() {
  /// STATES
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);

  /// FUNCTIONS

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

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
    leave: any,
    field: "is_enabled" | "requires_credits",
    value: boolean
  ) => {
    const oldValue = { ...leave };

    const { data, error } = await supabase
      .from("leave_settings")
      .update({ [field]: value })
      .eq("id", leave.id)
      .select()
      .single();

    if (error) {
      console.log("UPDATE LEAVE SETTING ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    const fieldLabel =
      field === "is_enabled" ? "availability" : "credit deduction";

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Leave Settings",
      action: "UPDATE_LEAVE_SETTING",
      description: `Updated ${leave.leave_type} ${fieldLabel} to ${
        value ? "enabled" : "disabled"
      }`,
      severity: "warning",
      recordId: String(leave.id),
      oldValue,
      newValue: data,
    });

    getLeaveSettings();
  };

  /// EFFECTS

  useEffect(() => {
    getLeaveSettings();
  }, []);

  /// UI

 return (
  <PageGuard moduleKey="leave_settings">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Leave Settings</h1>
          <p className="text-sm text-slate-400">
            Control which leave types are available and which ones deduct credits.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Leave Policy Controls</h2>
            <p className="text-sm text-slate-400">
              Enabled leaves appear in the request form. Deduct Credits controls
              whether approval reduces employee leave balance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="py-3 pr-4">Leave Type</th>
                  <th className="py-3 pr-4">Enabled</th>
                  <th className="py-3 pr-4">Deduct Credits</th>
                </tr>
              </thead>

              <tbody>
                {leaveSettings.map((leave) => (
                  <tr
                    key={leave.id}
                    className="border-b border-slate-800/70 text-slate-200"
                  >
                    <td className="py-4 pr-4 font-medium">
                      {leave.leave_type}
                    </td>

                    <td className="py-4 pr-4">
                      <button
                        onClick={() =>
                          updateLeaveSetting(
                            leave,
                            "is_enabled",
                            !leave.is_enabled
                          )
                        }
                        className={`w-28 rounded-full border px-4 py-1 text-center text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                          leave.is_enabled
                            ? "border-green-500/30 bg-green-500/20 text-green-400"
                            : "border-red-500/30 bg-red-500/20 text-red-400"
                        }`}
                      >
                        {leave.is_enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>

                    <td className="py-4 pr-4">
                      <button
                        onClick={() =>
                          updateLeaveSetting(
                            leave,
                            "requires_credits",
                            !leave.requires_credits
                          )
                        }
                        className={`w-32 rounded-full border px-4 py-1 text-center text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                          leave.requires_credits
                            ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                            : "border-slate-600 bg-slate-700 text-slate-300"
                        }`}
                      >
                        {leave.requires_credits ? "Deduct" : "No Deduction"}
                      </button>
                    </td>
                  </tr>
                ))}

                {leaveSettings.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
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
  </PageGuard>
  );
}


