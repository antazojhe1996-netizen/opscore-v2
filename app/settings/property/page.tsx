"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function PropertySettingsPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);

  const [unitName, setUnitName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [internetFee, setInternetFee] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [status, setStatus] = useState("Occupied");

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getUnits = async () => {
    const { data, error } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (error) {
      console.log("GET APARTMENT UNITS ERROR:", error);
      return;
    }

    setUnits(data || []);
  };

  const addUnit = async () => {
    if (!unitName.trim()) {
      alert("Please enter unit name.");
      return;
    }

    const { error } = await supabase.from("apartment_units").insert({
      unit_name: unitName.trim(),
      tenant_name: tenantName.trim(),
      monthly_rent: Number(monthlyRent || 0),
      internet_fee: Number(internetFee || 0),
      due_day: Number(dueDay || 5),
      status,
    });

    if (error) {
      console.log("ADD APARTMENT UNIT ERROR:", error);
      alert("Failed to add apartment unit.");
      return;
    }

    setUnitName("");
    setTenantName("");
    setMonthlyRent("");
    setInternetFee("");
    setDueDay("5");
    setStatus("Occupied");

    getUnits();
  };

  const deleteUnit = async (id: string) => {
    const confirmDelete = confirm("Delete this apartment unit?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("apartment_units")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE APARTMENT UNIT ERROR:", error);
      alert("Failed to delete apartment unit.");
      return;
    }

    getUnits();
  };

  /// EFFECTS
  useEffect(() => {
    getUnits();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold">Property Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage apartment units, tenants, rent defaults, due dates, and billing setup.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Add Apartment Unit</h2>

            <div className="mt-5 space-y-4">
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Unit name / room number"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Tenant name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Monthly rent"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                value={internetFee}
                onChange={(e) => setInternetFee(e.target.value)}
                placeholder="Default internet fee"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Due day"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              >
                <option value="Occupied">Occupied</option>
                <option value="Vacant">Vacant</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                onClick={addUnit}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400"
              >
                Save Apartment Unit
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <h2 className="mb-4 text-xl font-bold">Apartment Units</h2>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3 text-right">Rent</th>
                    <th className="px-4 py-3 text-right">Internet</th>
                    <th className="px-4 py-3 text-center">Due Day</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {unit.unit_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {unit.tenant_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(unit.monthly_rent)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(unit.internet_fee)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        Every {unit.due_day}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {units.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No apartment units added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}