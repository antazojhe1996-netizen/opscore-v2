"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";

export default function DepartmentsPage() {
  /// STATES
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentName, setDepartmentName] = useState("");

  /// FUNCTIONS
  const getDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    if (error) {
      console.log(error);
      return;
    }

    setDepartments(data || []);
  };

  const addDepartment = async () => {
    if (!departmentName.trim()) return;

    const { error } = await supabase.from("departments").insert({
      name: departmentName,
    });

    if (error) {
      console.log(error);
      return;
    }

    setDepartmentName("");
    getDepartments();
  };

  /// EFFECTS
  useEffect(() => {
    getDepartments();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="departments_settings">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold">
            Department Management
          </h1>

          <p className="mt-2 text-slate-400">
            Configure departments used across OPSCORE.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-bold">
              Add Department
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="Department Name"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
              />

              <button
                onClick={addDepartment}
                className="rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-bold">
              Department List
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-3 text-left">
                    Department Name
                  </th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department) => (
                  <tr
                    key={department.id}
                    className="border-b border-slate-800"
                  >
                    <td className="py-3">
                      {department.name}
                    </td>
                  </tr>
                ))}

                {departments.length === 0 && (
                  <tr>
                    <td className="py-6 text-slate-500">
                      No departments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}