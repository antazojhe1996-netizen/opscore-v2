"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

type ApartmentUnit = {
  id: string;
  unit_name: string;
  tenant_name?: string | null;
  monthly_rent?: number | null;
  internet_fee?: number | null;
  due_day?: number | null;
  status?: string | null;
};

export default function PropertySettingsPage() {
  /// STATES
  const [units, setUnits] = useState<ApartmentUnit[]>([]);

  const [unitName, setUnitName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [internetFee, setInternetFee] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [status, setStatus] = useState("Occupied");
  const [isSaving, setIsSaving] = useState(false);

  /// HELPERS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    oldValue?: any;
    newValue?: any;
  }) => {
    try {
      await supabase.from("audit_logs").insert({
        module: "System Settings",
        action,
        description,
        severity,
        old_value: oldValue,
        new_value: newValue,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.log("PROPERTY SETTINGS AUDIT ERROR:", error);
    }
  };

  const resetForm = () => {
    setUnitName("");
    setTenantName("");
    setMonthlyRent("");
    setInternetFee("");
    setDueDay("5");
    setStatus("Occupied");
  };

  /// FUNCTIONS
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

    const newUnit = {
      unit_name: unitName.trim(),
      tenant_name: tenantName.trim() || null,
      monthly_rent: Number(monthlyRent || 0),
      internet_fee: Number(internetFee || 0),
      due_day: Number(dueDay || 5),
      status,
    };

    setIsSaving(true);

    const { data, error } = await supabase
      .from("apartment_units")
      .insert(newUnit)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("ADD APARTMENT UNIT ERROR:", error);
      await createAuditLog({
        action: "ADD_PROPERTY_UNIT_FAILED",
        description: `Failed to add apartment unit: ${newUnit.unit_name}`,
        severity: "warning",
        newValue: newUnit,
      });
      alert("Failed to add apartment unit.");
      return;
    }

    await createAuditLog({
      action: "ADD_PROPERTY_UNIT",
      description: `Added apartment unit: ${data?.unit_name || newUnit.unit_name}`,
      severity: "warning",
      oldValue: null,
      newValue: data || newUnit,
    });

    resetForm();
    await getUnits();
  };

  const deleteUnit = async (unit: ApartmentUnit) => {
    const confirmDelete = confirm(
      `Delete apartment unit "${unit.unit_name}"? This may affect apartment billing history if already used.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("apartment_units")
      .delete()
      .eq("id", unit.id);

    if (error) {
      console.log("DELETE APARTMENT UNIT ERROR:", error);
      await createAuditLog({
        action: "DELETE_PROPERTY_UNIT_FAILED",
        description: `Failed to delete apartment unit: ${unit.unit_name}`,
        severity: "critical",
        oldValue: unit,
        newValue: null,
      });
      alert("Failed to delete apartment unit. It may already be linked to bills or payments.");
      return;
    }

    await createAuditLog({
      action: "DELETE_PROPERTY_UNIT",
      description: `Deleted apartment unit: ${unit.unit_name}`,
      severity: "critical",
      oldValue: unit,
      newValue: null,
    });

    await getUnits();
  };

  /// EFFECTS
  useEffect(() => {
    getUnits();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 space-y-6 overflow-x-hidden p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold">Property Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage apartment units, tenants, rent defaults, due dates, and billing setup.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <SummaryCard title="Total Units" value={units.length} />
          <SummaryCard
            title="Occupied"
            value={units.filter((unit) => unit.status === "Occupied").length}
          />
          <SummaryCard
            title="Vacant"
            value={units.filter((unit) => unit.status === "Vacant").length}
          />
          <SummaryCard
            title="Monthly Rent Base"
            value={formatMoney(
              units.reduce((sum, unit) => sum + Number(unit.monthly_rent || 0), 0)
            )}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Add Apartment Unit</h2>

            <div className="mt-5 space-y-4">
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Unit name / room number"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Tenant name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Monthly rent"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                type="number"
                value={internetFee}
                onChange={(e) => setInternetFee(e.target.value)}
                placeholder="Default internet fee"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Due day"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="Occupied">Occupied</option>
                <option value="Vacant">Vacant</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                onClick={addUnit}
                disabled={isSaving}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Apartment Unit"}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-bold text-amber-300">Audit Protected</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                Added and deleted apartment units are recorded in Audit Center.
              </p>
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
                          onClick={() => deleteUnit(unit)}
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

function SummaryCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 text-2xl font-black text-white">{value}</h2>
    </div>
  );
}
