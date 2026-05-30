"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function EmploymentTypesPage() {
  /// STATES
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employmentTypeName, setEmploymentTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");

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
    });

    if (error) {
      console.log(error);
      return;
    }

    setEmploymentTypeName("");
    getEmploymentTypes();
  };

  const editEmploymentType = (type: any) => {
    setEditingTypeId(type.id);
    setEmploymentTypeName(type.name);
  };

  const updateEmploymentType = async () => {
    if (!editingTypeId) return;
    if (!employmentTypeName.trim()) return;

    const { error } = await supabase
      .from("employment_types")
      .update({ name: employmentTypeName })
      .eq("id", editingTypeId);

    if (error) {
      console.log(error);
      return;
    }

    setEditingTypeId("");
    setEmploymentTypeName("");
    getEmploymentTypes();
  };

  const cancelEdit = () => {
    setEditingTypeId("");
    setEmploymentTypeName("");
  };

  const deleteEmploymentType = async (id: string) => {
    const confirmDelete = confirm("Delete this employment type?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("employment_types")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    getEmploymentTypes();
  };

  /// EFFECTS
  useEffect(() => {
    getEmploymentTypes();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Employment Type Management</h1>

        <p className="mt-2 text-slate-400">
          Configure employment types used in employee records.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">
            {editingTypeId ? "Edit Employment Type" : "Add Employment Type"}
          </h2>

          <div className="mt-4 flex gap-3">
            <input
              value={employmentTypeName}
              onChange={(e) => setEmploymentTypeName(e.target.value)}
              placeholder="Employment Type Name"
              className="flex-1 rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
            />

            <button
              onClick={editingTypeId ? updateEmploymentType : addEmploymentType}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              {editingTypeId ? "Update" : "Add"}
            </button>

            {editingTypeId && (
              <button
                onClick={cancelEdit}
                className="rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Employment Type List</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#08081a] text-slate-300">
                <tr>
                  <th className="p-4">Type Name</th>
                  <th className="w-48 p-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {employmentTypes.map((type) => (
                  <tr
                    key={type.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="p-4 font-bold">{type.name}</td>

                    <td className="w-48 p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editEmploymentType(type)}
                          className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteEmploymentType(type.id)}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {employmentTypes.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={2}>
                      No employment types yet.
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