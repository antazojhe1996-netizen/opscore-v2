"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

export default function PositionsPage() {
  /// STATES
  const [positions, setPositions] = useState<any[]>([]);
  const [positionName, setPositionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  /// FUNCTIONS

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const getPositions = async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET POSITIONS ERROR:", error);
      return;
    }

    setPositions(data || []);
  };

  const addPosition = async () => {
    const cleanName = positionName.trim();
    if (!cleanName) return;

    const { data, error } = await supabase
      .from("positions")
      .insert({ name: cleanName })
      .select()
      .single();

    if (error) {
      console.log("ADD POSITION ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Positions",
      action: "CREATE_POSITION",
      description: `Created position: ${cleanName}`,
      severity: "info",
      recordId: data.id,
      oldValue: null,
      newValue: data,
    });

    setPositionName("");
    getPositions();
  };

  const startEdit = (pos: any) => {
    setEditingId(pos.id);
    setEditingName(pos.name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const updatePosition = async (pos: any) => {
    const cleanName = editingName.trim();
    if (!cleanName) return;

    const oldValue = { ...pos };

    const { data, error } = await supabase
      .from("positions")
      .update({ name: cleanName })
      .eq("id", pos.id)
      .select()
      .single();

    if (error) {
      console.log("UPDATE POSITION ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Positions",
      action: "UPDATE_POSITION",
      description: `Updated position from "${oldValue.name}" to "${cleanName}"`,
      severity: "warning",
      recordId: pos.id,
      oldValue,
      newValue: data,
    });

    cancelEdit();
    getPositions();
  };

  const deletePosition = async (pos: any) => {
    const confirmDelete = confirm(`Delete position "${pos.name}"?`);
    if (!confirmDelete) return;

    const oldValue = { ...pos };

    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", pos.id);

    if (error) {
      console.log("DELETE POSITION ERROR:", error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Positions",
      action: "DELETE_POSITION",
      description: `Deleted position: ${pos.name}`,
      severity: "critical",
      recordId: pos.id,
      oldValue,
      newValue: null,
    });

    getPositions();
  };

  /// EFFECTS

  useEffect(() => {
    getPositions();
  }, []);

  /// UI

return (
  <PageGuard moduleKey="positions_settings">
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Position Management</h1>

        <p className="mt-2 text-slate-400">
          Configure positions used across employee records.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Add Position</h2>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="Position Name"
              className="flex-1 rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
            />

            <button
              onClick={addPosition}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Position List</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#08081a] text-slate-300">
                <tr>
                  <th className="p-4">Position Name</th>
                  <th className="w-56 p-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id} className="border-t border-slate-800">
                    <td className="p-4 font-bold">
                      {editingId === pos.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded bg-slate-800 p-2 text-white outline-none"
                        />
                      ) : (
                        pos.name
                      )}
                    </td>

                    <td className="w-56 p-4">
                      <div className="flex justify-end gap-2">
                        {editingId === pos.id ? (
                          <>
                            <button
                              onClick={() => updatePosition(pos)}
                              className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                            >
                              Save
                            </button>

                            <button
                              onClick={cancelEdit}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(pos)}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-600"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deletePosition(pos)}
                              className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {positions.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={2}>
                      No positions yet.
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


