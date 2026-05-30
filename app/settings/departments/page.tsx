"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
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

    const { error } = await supabase
      .from("departments")
      .insert({
        name: departmentName,
      });

    if (error) {
      console.log(error);
      return;
    }

    setDepartmentName("");
    getDepartments();
  };

  const deleteDepartment = async (id: string) => {
  const confirmDelete = confirm(
    "Delete this department?"
  );

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
    return;
  }

  getDepartments();
};

  /// EFFECTS

  useEffect(() => {
    getDepartments();
  }, []);

  /// UI

  return (
  <div className="flex min-h-screen bg-[#050514] text-white">
    <Sidebar />

    <main className="flex-1 p-8">
      <h1 className="text-3xl font-bold">Department Management</h1>

      <p className="mt-2 text-slate-400">
        Configure departments used across OPSCORE.
      </p>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Add Department</h2>

        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            placeholder="Department Name"
            className="flex-1 rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
          />

          <button
            onClick={addDepartment}
            className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Department List</h2>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#08081a] text-slate-300">
              <tr>
                <th className="p-4">Department Name</th>
                <th className="w-48 p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-t border-slate-800">
                  <td className="p-4 font-bold">{dept.name}</td>

                  <td className="w-48 p-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600">
                        Edit
                      </button>

                      <button
                        onClick={() => deleteDepartment(dept.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {departments.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={2}>
                    No departments yet.
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