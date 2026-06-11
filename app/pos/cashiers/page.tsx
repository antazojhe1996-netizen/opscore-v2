"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

/// TYPES
type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  position: string | null;
  can_access_pos: boolean | null;
  pos_pin: string | null;
};

/// PAGE
export default function POSCashiersPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /// LOAD DATA
  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, department, position, can_access_pos, pos_pin"
      )
      .order("first_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setEmployees((data || []) as Employee[]);
    setLoading(false);
  }

  /// FUNCTIONS
  function fullName(emp: Employee) {
    return `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unnamed";
  }

  function updateLocalAccess(employeeId: string, value: boolean) {
    setEmployees((current) =>
      current.map((emp) =>
        emp.id === employeeId ? { ...emp, can_access_pos: value } : emp
      )
    );
  }

  function updateLocalPin(employeeId: string, value: string) {
    setEmployees((current) =>
      current.map((emp) =>
        emp.id === employeeId ? { ...emp, pos_pin: value } : emp
      )
    );
  }

  async function saveCashier(emp: Employee) {
    setMessage("");

    if (emp.can_access_pos && !emp.pos_pin?.trim()) {
      setMessage("PIN is required when POS access is enabled.");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update({
        can_access_pos: !!emp.can_access_pos,
        pos_pin: emp.pos_pin?.trim() || null,
      })
      .eq("id", emp.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${fullName(emp)} POS access updated.`);
    await loadEmployees();
  }

  /// UI
  return (
    <PageGuard moduleKey="pos_cashiers">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden p-6">
          {/* HEADER */}
          <section className="mb-6 rounded-[2rem] border border-blue-300/10 bg-slate-900 p-6">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
              OPSCORE POS
            </p>

            <h1 className="mt-2 text-4xl font-black">POS Cashiers</h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage cashier POS access, PIN login, and future POS permissions.
            </p>
          </section>

          {/* MESSAGE */}
          {message && (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
              {message}
            </div>
          )}

          {/* CASHIER TABLE */}
          <section className="rounded-[1.75rem] border border-blue-300/10 bg-white/[0.035] p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Cashier Access</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Employees with POS access can open cashier sessions using PIN only.
                </p>
              </div>

              <button
                onClick={loadEmployees}
                disabled={loading}
                className="rounded-2xl border border-blue-300/20 px-4 py-2 text-sm font-black text-blue-200 disabled:opacity-40"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">POS Access</th>
                    <th className="px-4 py-3">PIN</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-bold text-white">
                        {fullName(emp)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {emp.department || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {emp.position || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <label className="flex items-center gap-3 font-bold text-slate-200">
                          <input
                            type="checkbox"
                            checked={!!emp.can_access_pos}
                            onChange={(e) =>
                              updateLocalAccess(emp.id, e.target.checked)
                            }
                          />
                          Enabled
                        </label>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="password"
                          value={emp.pos_pin || ""}
                          onChange={(e) => updateLocalPin(emp.id, e.target.value)}
                          placeholder="PIN"
                          className="w-40 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-300"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => saveCashier(emp)}
                          className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white hover:bg-blue-500"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && employees.length === 0 && (
                <p className="p-5 text-sm text-slate-400">No employees found.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}