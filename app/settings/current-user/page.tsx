"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { UserCheck } from "lucide-react";

export default function CurrentUserPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        system_roles (
          role_name
        )
      `)
      .order("first_name");

    if (error) {
      console.log(error);
      return;
    }

    setEmployees(data || []);
  };

  const saveCurrentUser = () => {
    localStorage.setItem(
      "opscore_current_employee_id",
      currentUserId
    );

    alert("Current user updated.");
  };

  useEffect(() => {
    getEmployees();

    const savedUser =
      localStorage.getItem(
        "opscore_current_employee_id"
      ) || "";

    setCurrentUserId(savedUser);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            System
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Current User
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Temporary user selector for role testing.
          </p>
        </section>

        <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <UserCheck size={24} />
            <h2 className="text-xl font-black">
              Active User
            </h2>
          </div>

          <select
            value={currentUserId}
            onChange={(e) =>
              setCurrentUserId(e.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <option value="">
              Select Employee
            </option>

            {employees.map((employee) => (
              <option
                key={employee.id}
                value={employee.id}
              >
                {employee.first_name}{" "}
                {employee.last_name}
                {" — "}
                {employee.system_roles?.role_name ||
                  "No Role"}
              </option>
            ))}
          </select>

          <button
            onClick={saveCurrentUser}
            className="mt-4 rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950"
          >
            Save Current User
          </button>
        </div>
      </main>
    </div>
  );
}