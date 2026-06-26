"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import PageGuard from "@/components/PageGuard";import { createAuditLog } from "@/lib/audit";

export default function EmploymentTypesPage() {
  /// STATES
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employmentTypeName, setEmploymentTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");

  /// FUNCTIONS
  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const getEmploymentTypes = async () => {
    const { data, error } = await supabase
      .from("employment_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYMENT TYPES ERROR:", error);
      return;
    }

    setEmploymentTypes(data || []);
  };

  const clearForm = () => {
    setEditingTypeId("");
    setEmploymentTypeName("");
  };

  const addEmploymentType = async () => {
    const cleanName = employmentTypeName.trim();
    if (!cleanName) return;

    const { data, error } = await supabase
      .from("employment_types")
      .insert({ name: cleanName })
      .select()
      .single();

    if (error) {
      console.log("ADD EMPLOYMENT TYPE ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Employment Types",
      action: "CREATE_EMPLOYMENT_TYPE",
      description: `Created employment type: ${cleanName}`,
      severity: "info",
      recordId: data.id,
      oldValue: null,
      newValue: data,
    });

    clearForm();
    getEmploymentTypes();
  };

  const editEmploymentType = (type: any) => {
    setEditingTypeId(type.id);
    setEmploymentTypeName(type.name || "");
  };

  const updateEmploymentType = async () => {
    if (!editingTypeId) return;

    const cleanName = employmentTypeName.trim();
    if (!cleanName) return;

    const oldValue = employmentTypes.find((type) => type.id === editingTypeId);

    const { data, error } = await supabase
      .from("employment_types")
      .update({ name: cleanName })
      .eq("id", editingTypeId)
      .select()
      .single();

    if (error) {
      console.log("UPDATE EMPLOYMENT TYPE ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Employment Types",
      action: "UPDATE_EMPLOYMENT_TYPE",
      description: `Updated employment type from "${
        oldValue?.name || "-"
      }" to "${cleanName}"`,
      severity: "warning",
      recordId: editingTypeId,
      oldValue: oldValue || null,
      newValue: data,
    });

    clearForm();
    getEmploymentTypes();
  };

  const deleteEmploymentType = async (type: any) => {
    const confirmDelete = confirm(`Delete employment type "${type.name}"?`);
    if (!confirmDelete) return;

    const oldValue = { ...type };

    const { error } = await supabase
      .from("employment_types")
      .delete()
      .eq("id", type.id);

    if (error) {
      console.log("DELETE EMPLOYMENT TYPE ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Employment Types",
      action: "DELETE_EMPLOYMENT_TYPE",
      description: `Deleted employment type: ${type.name}`,
      severity: "critical",
      recordId: type.id,
      oldValue,
      newValue: null,
    });

    getEmploymentTypes();
  };

  /// EFFECTS
  useEffect(() => {
    getEmploymentTypes();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="employment_settings">
      <div className="flex min-h-screen bg-[#050514] text-white">
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
                  onClick={clearForm}
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
                            onClick={() => deleteEmploymentType(type)}
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
    </PageGuard>
  );
}



