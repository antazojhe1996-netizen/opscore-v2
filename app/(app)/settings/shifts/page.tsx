"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { createAuditLog } from "@/lib/audit";
import PageGuard from "@/components/PageGuard";

export default function ShiftManagementPage() {
  /// STATES
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [shiftColor, setShiftColor] = useState("blue");
  const [editingId, setEditingId] = useState<number | null>(null);

  /// DATA
  const colorMap: any = {
    blue: { bg: "#1d4ed840", text: "#93c5fd" },
    sky: { bg: "#0284c740", text: "#7dd3fc" },
    cyan: { bg: "#0891b240", text: "#67e8f9" },
    teal: { bg: "#0f766e40", text: "#5eead4" },
    green: { bg: "#15803d40", text: "#86efac" },
    emerald: { bg: "#04785740", text: "#6ee7b7" },
    lime: { bg: "#65a30d40", text: "#bef264" },
    yellow: { bg: "#ca8a0440", text: "#fde047" },
    amber: { bg: "#d9770640", text: "#fcd34d" },
    orange: { bg: "#ea580c40", text: "#fdba74" },
    red: { bg: "#b91c1c40", text: "#fca5a5" },
    rose: { bg: "#be123c40", text: "#fda4af" },
    pink: { bg: "#be185d40", text: "#f9a8d4" },
    purple: { bg: "#7e22ce40", text: "#d8b4fe" },
    violet: { bg: "#6d28d940", text: "#c4b5fd" },
    indigo: { bg: "#4338ca40", text: "#a5b4fc" },
    slate: { bg: "#33415566", text: "#cbd5e1" },
    gray: { bg: "#47556966", text: "#cbd5e1" },
  };

  const colorOptions = [
    "blue",
    "sky",
    "cyan",
    "teal",
    "green",
    "emerald",
    "lime",
    "yellow",
    "amber",
    "orange",
    "red",
    "rose",
    "pink",
    "purple",
    "violet",
    "indigo",
    "slate",
    "gray",
  ];

  /// FUNCTIONS

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const normalizeColor = (color: string) => {
    const cleanColor = String(color || "").toLowerCase().trim();

    if (colorMap[cleanColor]) return cleanColor;
    if (cleanColor.includes("sky")) return "sky";
    if (cleanColor.includes("cyan")) return "cyan";
    if (cleanColor.includes("teal")) return "teal";
    if (cleanColor.includes("emerald")) return "emerald";
    if (cleanColor.includes("green")) return "green";
    if (cleanColor.includes("lime")) return "lime";
    if (cleanColor.includes("yellow")) return "yellow";
    if (cleanColor.includes("amber")) return "amber";
    if (cleanColor.includes("orange")) return "orange";
    if (cleanColor.includes("rose")) return "rose";
    if (cleanColor.includes("pink")) return "pink";
    if (cleanColor.includes("purple")) return "purple";
    if (cleanColor.includes("violet")) return "violet";
    if (cleanColor.includes("indigo")) return "indigo";
    if (cleanColor.includes("red")) return "red";
    if (cleanColor.includes("slate")) return "slate";
    if (cleanColor.includes("gray")) return "gray";

    return "blue";
  };

  const buildTimeLabel = (name: string, start?: string, end?: string) => {
    const cleanName = name.trim();

    if (start && end) {
      return `${start} - ${end}`;
    }

    return cleanName;
  };

  const getShifts = async () => {
    const { data, error } = await supabase
      .from("shift_templates")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log("GET SHIFTS ERROR:", error.message || error);
      return;
    }

    setShifts(data || []);
  };

  const resetForm = () => {
    setShiftName("");
    setStartTime("");
    setEndTime("");
    setShiftColor("blue");
    setEditingId(null);
  };

  const addShift = async () => {
    const cleanName = shiftName.trim();
    if (!cleanName) return;

    const newShift = {
      shift_name: cleanName,
      start_time: startTime || null,
      end_time: endTime || null,
      time_label: buildTimeLabel(cleanName, startTime, endTime),
      color: shiftColor,
    };

    const { data, error } = await supabase
      .from("shift_templates")
      .insert(newShift)
      .select()
      .single();

    if (error) {
      console.log("ADD SHIFT ERROR:", error.message || error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Shifts",
      action: "CREATE_SHIFT",
      description: `Created shift: ${cleanName}`,
      severity: "info",
      recordId: String(data.id),
      oldValue: null,
      newValue: data,
    });

    resetForm();
    getShifts();
  };

  const startEdit = (shift: any) => {
    setEditingId(shift.id);
    setShiftName(shift.shift_name || "");
    setStartTime(shift.start_time || "");
    setEndTime(shift.end_time || "");
    setShiftColor(normalizeColor(shift.color));
  };

  const updateShift = async () => {
    if (!editingId) return;

    const cleanName = shiftName.trim();
    if (!cleanName) return;

    const oldValue = shifts.find((shift) => shift.id === editingId);

    const updatedShift = {
      shift_name: cleanName,
      start_time: startTime || null,
      end_time: endTime || null,
      time_label: buildTimeLabel(cleanName, startTime, endTime),
      color: shiftColor,
    };

    const { data, error } = await supabase
      .from("shift_templates")
      .update(updatedShift)
      .eq("id", editingId)
      .select()
      .single();

    if (error) {
      console.log("UPDATE SHIFT ERROR:", error.message || error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Shifts",
      action: "UPDATE_SHIFT",
      description: `Updated shift: ${cleanName}`,
      severity: "warning",
      recordId: String(editingId),
      oldValue: oldValue || null,
      newValue: data,
    });

    resetForm();
    getShifts();
  };

  const deleteShift = async (shift: any) => {
    const confirmDelete = confirm(`Delete shift "${shift.shift_name}"?`);
    if (!confirmDelete) return;

    const oldValue = { ...shift };

    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", shift.id);

    if (error) {
      console.log("DELETE SHIFT ERROR:", error.message || error);
      return;
    }

    const userEmail = await getCurrentUserEmail();

    await createAuditLog({
      userName: userEmail,
      module: "Settings / Shifts",
      action: "DELETE_SHIFT",
      description: `Deleted shift: ${shift.shift_name}`,
      severity: "critical",
      recordId: String(shift.id),
      oldValue,
      newValue: null,
    });

    getShifts();
  };

  /// EFFECTS

  useEffect(() => {
    getShifts();
  }, []);

  /// UI

return (
  <PageGuard moduleKey="shift_settings">
    <div className="flex min-h-screen bg-[#050514] text-white">
<main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Shift Management</h1>

        <p className="mt-2 text-slate-400">
          Configure shift templates used for scheduling and workforce planning.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Shift" : "Add Shift"}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              className="flex-1 rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
              placeholder="Shift Name"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
            />

            <input
              type="time"
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              type="time"
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <select
              className="rounded bg-slate-800 p-2 text-white outline-none"
              value={shiftColor}
              onChange={(e) => setShiftColor(e.target.value)}
            >
              {colorOptions.map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </option>
              ))}
            </select>

            <button
              onClick={editingId ? updateShift : addShift}
              className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              {editingId ? "Update" : "Add"}
            </button>
          </div>

          {editingId && (
            <button
              onClick={resetForm}
              className="mt-4 rounded bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600"
            >
              Cancel Edit
            </button>
          )}

          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            <p className="font-black">Tip</p>
            <p className="mt-1 text-blue-100/80">
              Use <span className="font-bold text-white">RD</span> for official rest day.
              Use <span className="font-bold text-white">OFF</span> only when the employee has no schedule assigned yet.
              RD and OFF can be saved without start/end time.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Shift List</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#08081a] text-slate-300">
                <tr>
                  <th className="w-[180px] p-4">Shift Name</th>
                  <th className="p-4">Start Time</th>
                  <th className="p-4">End Time</th>
                  <th className="p-4">Time Label</th>
                  <th className="w-32 p-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {shifts.map((shift) => {
                  const colorKey = normalizeColor(shift.color);
                  const color = colorMap[colorKey];

                  return (
                    <tr
                      key={shift.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="p-4">
                        <span
                          className="inline-flex rounded-md px-2 py-1 text-xs font-bold"
                          style={{
                            backgroundColor: color.bg,
                            color: color.text,
                          }}
                        >
                          {shift.shift_name}
                        </span>
                      </td>

                      <td className="p-4 text-slate-300">
                        {shift.start_time || "â€”"}
                      </td>

                      <td className="p-4 text-slate-300">
                        {shift.end_time || "â€”"}
                      </td>

                      <td className="p-4 text-slate-300">
                        {shift.time_label || buildTimeLabel(shift.shift_name || "", shift.start_time, shift.end_time)}
                      </td>

                      <td className="w-32 p-4">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => startEdit(shift)}
                            className="text-xs font-bold text-yellow-400 hover:text-yellow-300"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteShift(shift)}
                            className="text-xs font-bold text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {shifts.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={5}>
                      No shifts yet.
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



