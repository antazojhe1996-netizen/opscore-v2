"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

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
    green: { bg: "#15803d40", text: "#86efac" },
    yellow: { bg: "#ca8a0440", text: "#fde047" },
    purple: { bg: "#7e22ce40", text: "#d8b4fe" },
    red: { bg: "#b91c1c40", text: "#fca5a5" },
    gray: { bg: "#47556966", text: "#cbd5e1" },
  };

  /// FUNCTIONS
  const normalizeColor = (color: string) => {
    if (!color) return "blue";
    if (color.includes("green")) return "green";
    if (color.includes("yellow")) return "yellow";
    if (color.includes("purple")) return "purple";
    if (color.includes("red")) return "red";
    if (color.includes("slate") || color.includes("gray")) return "gray";
    return "blue";
  };

  const getShifts = async () => {
    const { data, error } = await supabase
      .from("shift_templates")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log("GET SHIFTS ERROR:", error);
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
    if (!shiftName.trim()) return;

    const { error } = await supabase.from("shift_templates").insert({
      shift_name: shiftName,
      start_time: startTime || null,
      end_time: endTime || null,
      color: shiftColor,
    });

    if (error) {
      console.log("ADD SHIFT ERROR:", error);
      return;
    }

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
    if (!editingId || !shiftName.trim()) return;

    const { error } = await supabase
      .from("shift_templates")
      .update({
        shift_name: shiftName,
        start_time: startTime || null,
        end_time: endTime || null,
        color: shiftColor,
      })
      .eq("id", editingId);

    if (error) {
      console.log("UPDATE SHIFT ERROR:", error);
      return;
    }

    resetForm();
    getShifts();
  };

  const deleteShift = async (id: number) => {
    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE SHIFT ERROR:", error);
      return;
    }

    getShifts();
  };

  /// EFFECTS
  useEffect(() => {
    getShifts();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-[#050514] text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Shift Management</h1>

        <p className="mt-2 text-slate-400">
          Configure shift templates used for scheduling and workforce planning.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Shift" : "Add Shift"}
          </h2>

          <div className="mt-4 flex gap-3">
            <input
              className="flex-1 rounded bg-slate-800 p-2 text-white outline-none placeholder:text-slate-400"
              placeholder="Shift Name"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
            />

            <input
              type="time"
              className="w-44 rounded bg-slate-800 p-2 text-white outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              type="time"
              className="w-44 rounded bg-slate-800 p-2 text-white outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <select
              className="w-36 rounded bg-slate-800 p-2 text-white outline-none"
              value={shiftColor}
              onChange={(e) => setShiftColor(e.target.value)}
            >
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="purple">Purple</option>
              <option value="red">Red</option>
              <option value="gray">Gray</option>
            </select>

            <button
              onClick={editingId ? updateShift : addShift}
              className="w-32 rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
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
                        {shift.start_time || "—"}
                      </td>

                      <td className="p-4 text-slate-300">
                        {shift.end_time || "—"}
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
                            onClick={() => deleteShift(shift.id)}
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
                    <td className="p-4 text-slate-400" colSpan={4}>
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
  );
}