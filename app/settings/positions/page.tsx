"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PositionsPage() {
  /// STATES
  const [positions, setPositions] = useState<any[]>([]);
  const [positionName, setPositionName] = useState("");

  /// FUNCTIONS
  const getPositions = async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("name");

    if (error) {
      console.log(error);
      return;
    }

    setPositions(data || []);
  };

  const addPosition = async () => {
    if (!positionName.trim()) return;

    const { error } = await supabase.from("positions").insert({
      name: positionName,
    });

    if (error) {
      console.log(error);
      return;
    }

    setPositionName("");
    getPositions();
  };

  /// EFFECTS
  useEffect(() => {
    getPositions();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Position Management</h1>
        <p className="mt-2 text-slate-400">
          Configure positions used across employee records.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">Add Position</h2>

          <div className="flex gap-3">
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="Position Name"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            />

            <button
              onClick={addPosition}
              className="rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">Position List</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 text-left">Position Name</th>
              </tr>
            </thead>

            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-b border-slate-800">
                  <td className="py-3">{position.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}