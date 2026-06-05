"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { UserCheck } from "lucide-react";

export default function CurrentUserPage() {
  /// STATES
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  /// FUNCTIONS

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        system_roles (
          role_name
        )
      `
      )
      .order("first_name");

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error);
      return;
    }

    setEmployees(data || []);
  };

  const getEmployeeName = (employee: any) => {
    if (!employee) return "Unknown";
    return `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  };

  const saveCurrentUser = async () => {
    if (!currentUserId) {
      alert("Please select an employee.");
      return;
    }

    const oldUserId =
      localStorage.getItem("opscore_current_employee_id") || null;

    const oldUser = employees.find(
      (emp) => String(emp.id) === String(oldUserId)
    );

    const newUser = employees.find(
      (emp) => String(emp.id) === String(currentUserId)
    );

    localStorage.setItem("opscore_current_employee_id", currentUserId);

    await createAuditLog({
      userName: newUser ? getEmployeeName(newUser) : "System User",
      module: "Settings / Current User",
      action:
        oldUserId && currentUserId
          ? "SWITCH_CURRENT_USER"
          : "SET_CURRENT_USER",
      description:
        oldUserId && currentUserId
          ? `Switched active user from ${getEmployeeName(
              oldUser
            )} to ${getEmployeeName(newUser)}`
          : `Set active user to ${getEmployeeName(newUser)}`,
      severity: "info",
      recordId: currentUserId,
      oldValue: oldUser || null,
      newValue: newUser || null,
    });

    window.dispatchEvent(new Event("storage"));

    alert("Current user updated.");
  };

  const clearCurrentUser = async () => {
    const oldUserId =
      localStorage.getItem("opscore_current_employee_id") || null;

    if (!oldUserId) {
      alert("No current user selected.");
      return;
    }

    const oldUser = employees.find(
      (emp) => String(emp.id) === String(oldUserId)
    );

    localStorage.removeItem("opscore_current_employee_id");
    setCurrentUserId("");

    await createAuditLog({
      userName: "System User",
      module: "Settings / Current User",
      action: "CLEAR_CURRENT_USER",
      description: `Cleared active user: ${getEmployeeName(oldUser)}`,
      severity: "warning",
      recordId: String(oldUserId),
      oldValue: oldUser || null,
      newValue: null,
    });

    window.dispatchEvent(new Event("storage"));

    alert("Current user cleared.");
  };

  /// EFFECTS

  useEffect(() => {
    getEmployees();

    const savedUser = localStorage.getItem("opscore_current_employee_id") || "";

    setCurrentUserId(savedUser);
  }, []);

  /// UI

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            System
          </p>

          <h1 className="mt-2 text-4xl font-black">Current User</h1>

          <p className="mt-2 text-sm text-slate-400">
            Temporary user selector for role testing and audit tracking.
          </p>
        </section>

        <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <UserCheck size={24} />
            <h2 className="text-xl font-black">Active User</h2>
          </div>

          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <option value="">Select Employee</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.first_name} {employee.last_name}
                {" — "}
                {employee.system_roles?.role_name || "No Role"}
              </option>
            ))}
          </select>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={saveCurrentUser}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              Save Current User
            </button>

            <button
              onClick={clearCurrentUser}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300 hover:bg-red-500/20"
            >
              Clear User
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm font-bold text-slate-300">Audit Behavior</p>
            <p className="mt-2 text-sm text-slate-500">
              Saving creates SET_CURRENT_USER or SWITCH_CURRENT_USER logs. Clearing creates CLEAR_CURRENT_USER logs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
