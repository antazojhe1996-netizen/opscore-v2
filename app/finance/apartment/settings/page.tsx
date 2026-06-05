"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ApartmentSettingsPage() {
  /// STATES
  const [units, setUnits] = useState<any[]>([]);
  const [unitName, setUnitName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [status, setStatus] = useState("vacant");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /// DATA
  const statusOptions = [
    "vacant",
    "occupied",
    "active",
    "maintenance",
    "inactive",
  ];

  /// FUNCTIONS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getUnits = async () => {
    const { data, error } = await supabase
      .from("apartment_units")
      .select("*")
      .order("unit_name", { ascending: true });

    if (error) {
      console.log("GET APARTMENT UNITS ERROR:", error);
      alert(error.message);
      return;
    }

    setUnits(data || []);
  };

  const resetForm = () => {
    setUnitName("");
    setTenantName("");
    setMonthlyRent("");
    setStatus("vacant");
    setNotes("");
    setEditingId(null);
  };

  const saveUnit = async () => {
    if (!unitName.trim()) {
      alert("Please enter apartment/unit name.");
      return;
    }

    setSaving(true);

    const payload = {
      unit_name: unitName.trim(),
      tenant_name: tenantName.trim() || null,
      monthly_rent: Number(monthlyRent || 0),
      status,
      notes: notes.trim() || null,
    };

    const result = editingId
      ? await supabase.from("apartment_units").update(payload).eq("id", editingId)
      : await supabase.from("apartment_units").insert(payload);

    setSaving(false);

    if (result.error) {
      console.log("SAVE APARTMENT UNIT ERROR:", result.error);
      alert(result.error.message);
      return;
    }

    resetForm();
    getUnits();
  };

  const editUnit = (unit: any) => {
    setEditingId(unit.id);
    setUnitName(unit.unit_name || "");
    setTenantName(unit.tenant_name || "");
    setMonthlyRent(String(unit.monthly_rent || ""));
    setStatus(unit.status || "vacant");
    setNotes(unit.notes || "");
  };

  const deleteUnit = async (unit: any) => {
    const confirmDelete = confirm(
      `Delete ${unit.unit_name}? This is only recommended if the unit has no billing history.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("apartment_units")
      .delete()
      .eq("id", unit.id);

    if (error) {
      console.log("DELETE APARTMENT UNIT ERROR:", error);
      alert(error.message);
      return;
    }

    getUnits();
  };

  const getStatusStyle = (value: string) => {
    const statusValue = String(value || "").toLowerCase();

    if (statusValue === "occupied") return "bg-emerald-500/10 text-emerald-400";
    if (statusValue === "active") return "bg-blue-500/10 text-blue-400";
    if (statusValue === "vacant") return "bg-slate-700 text-slate-300";
    if (statusValue === "maintenance") return "bg-amber-500/10 text-amber-400";
    if (statusValue === "inactive") return "bg-red-500/10 text-red-400";

    return "bg-slate-700 text-slate-300";
  };

  /// CALCULATIONS
  const totalUnits = units.length;
  const occupiedUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied"
  ).length;
  const vacantUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "vacant"
  ).length;
  const maintenanceUnits = units.filter(
    (unit) => String(unit.status || "").toLowerCase() === "maintenance"
  ).length;

  const totalMonthlyRent = useMemo(() => {
    return units
      .filter((unit) =>
        ["active", "occupied"].includes(String(unit.status || "").toLowerCase())
      )
      .reduce((sum, unit) => sum + Number(unit.monthly_rent || 0), 0);
  }, [units]);

  /// EFFECTS
  useEffect(() => {
    getUnits();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Apartment Module
            </p>
            <h1 className="mt-2 text-3xl font-bold">Apartment Settings</h1>
            <p className="mt-1 text-sm text-slate-400">
              Create and monitor apartment units, tenant names, monthly rent, and current unit status.
            </p>
          </div>

          <Link
            href="/finance/apartment"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Total Units" value={totalUnits} />
          <SummaryCard title="Occupied" value={occupiedUnits} color="text-emerald-400" />
          <SummaryCard title="Vacant" value={vacantUnits} color="text-slate-300" />
          <SummaryCard title="Maintenance" value={maintenanceUnits} color="text-amber-400" />
          <SummaryCard title="Monthly Rent Target" value={formatMoney(totalMonthlyRent)} color="text-blue-400" />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editingId ? "Edit Apartment Unit" : "Create Apartment Unit"}
            </h2>

            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm text-slate-400">Apartment / Unit Name</label>
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="APT 01"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Tenant Name</label>
              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Tenant name"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Monthly Rent</label>
              <input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Repair notes / remarks"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={saveUnit}
              disabled={saving}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update Unit" : "Save Unit"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Apartment Unit Masterlist</h2>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3 text-right">Monthly Rent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-white">
                      {unit.unit_name || "-"}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {unit.tenant_name || "No tenant"}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-blue-400">
                      {formatMoney(unit.monthly_rent)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                          unit.status
                        )}`}
                      >
                        {String(unit.status || "-").toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {unit.notes || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editUnit(unit)}
                          className="rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/10"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteUnit(unit)}
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {units.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No apartment units yet. Create your first apartment unit above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-3 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}
