"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";
import { RefreshCw, Save, ShieldCheck, UserCheck, Users } from "lucide-react";

type Employee = {
  id: string;
  company_id?: string | null;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  position: string | null;
  can_access_pos: boolean | null;
  pos_pin: string | null;
};

export default function POSCashiersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_company_id")
      : null;

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("employees")
      .select(
        "id, company_id, first_name, last_name, department, position, can_access_pos, pos_pin",
      )
      .order("first_name", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setEmployees((data || []) as Employee[]);
    setLoading(false);
  }

  function fullName(emp: Employee) {
    return `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unnamed";
  }

  function updateLocalAccess(employeeId: string, value: boolean) {
    setEmployees((current) =>
      current.map((emp) =>
        emp.id === employeeId ? { ...emp, can_access_pos: value } : emp,
      ),
    );
  }

  function updateLocalPin(employeeId: string, value: string) {
    setEmployees((current) =>
      current.map((emp) =>
        emp.id === employeeId ? { ...emp, pos_pin: value } : emp,
      ),
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

  const activeCashiers = useMemo(
    () => employees.filter((emp) => emp.can_access_pos).length,
    [employees],
  );

  const missingPins = useMemo(
    () =>
      employees.filter((emp) => emp.can_access_pos && !emp.pos_pin?.trim())
        .length,
    [employees],
  );

  return (
    <PageGuard moduleKey="pos_cashiers">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  POS
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  POS Cashiers
                </h1>

                <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                  Manage employee POS access, cashier PIN login, and session
                  eligibility.
                </p>
              </div>

              <button
                onClick={loadEmployees}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Employees
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {employees.length}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Total employee records loaded.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Active Cashiers
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {activeCashiers}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-emerald-800">
                  Employees allowed to access POS.
                </p>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  Missing PIN
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {missingPins}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
                  Enabled cashiers without PIN.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Login Method
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  PIN
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-blue-800">
                  Cashier sessions use PIN-only access.
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Cashier Access
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Employee POS Permissions
                  </h2>
                </div>

                <UserCheck className="text-slate-500" size={22} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Employee
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Department
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Position
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        POS Access
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        PIN
                      </th>
                      <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading cashier access...
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-14 text-center text-sm font-semibold text-slate-500"
                        >
                          No employees found.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                                <Users size={16} />
                              </div>

                              <div>
                                <p className="font-black text-slate-950">
                                  {fullName(emp)}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                  Employee ID: {emp.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">{emp.department || "-"}</td>

                          <td className="px-5 py-4">{emp.position || "-"}</td>

                          <td className="px-5 py-4">
                            <label className="inline-flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!emp.can_access_pos}
                                onChange={(event) =>
                                  updateLocalAccess(emp.id, event.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />

                              <span
                                className={
                                  emp.can_access_pos
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700"
                                    : "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700"
                                }
                              >
                                {emp.can_access_pos ? "Enabled" : "Disabled"}
                              </span>
                            </label>
                          </td>

                          <td className="px-5 py-4">
                            <input
                              type="password"
                              value={emp.pos_pin || ""}
                              onChange={(event) =>
                                updateLocalPin(emp.id, event.target.value)
                              }
                              placeholder="PIN"
                              className="h-11 w-40 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                onClick={() => saveCashier(emp)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                              >
                                <Save size={16} />
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 shrink-0 text-blue-700" size={20} />

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Production Note
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-blue-800">
                    Current POS access uses employee PIN. For final production
                    hardening, PIN should be hashed or moved to a secured auth
                    flow before wider SaaS rollout.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}



