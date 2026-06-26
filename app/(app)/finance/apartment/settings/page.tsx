"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    `Ã¢â€šÂ±${Number(value || 0).toLocaleString("en-PH", {
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

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const totalMonthlyRent = useMemo(() => {
    return units
      .filter((unit) =>
        ["active", "occupied"].includes(String(unit.status || "").toLowerCase())
      )
      .reduce((sum, unit) => sum + Number(unit.monthly_rent || 0), 0);
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchesSearch = `${unit.unit_name || ""} ${unit.tenant_name || ""} ${unit.status || ""} ${unit.notes || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || String(unit.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [units, searchTerm, statusFilter]);

  /// EFFECTS
  useEffect(() => {
    getUnits();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1800px] space-y-5">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 lg:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Apartment Module
                </p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                  Apartment Unit Workbench
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  Maintain apartment units, tenants, rent setup, and unit operating status.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/finance/apartment"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Back to Operations Center
                </Link>
                <Link
                  href="/finance/apartment/billing"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500"
                >
                  Billing Workbench
                </Link>
                <Link
                  href="/finance/apartment/payments"
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200 hover:bg-blue-500/20"
                >
                  Payments Workbench
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard title="Total Units" value={totalUnits} />
            <MetricCard title="Occupancy" value={`${occupancyRate}%`} subtitle={`${occupiedUnits} occupied`} />
            <MetricCard title="Maintenance" value={maintenanceUnits} warning={maintenanceUnits > 0} />
            <MetricCard title="Rent Target" value={formatMoney(totalMonthlyRent)} />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900 p-4 lg:p-5">
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black">Unit Masterlist</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Search, review, edit, or remove apartment unit records.
                  </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search unit or tenant..."
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/30">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
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
                    {filteredUnits.map((unit) => (
                      <tr key={unit.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <p className="font-black text-white">{unit.unit_name || "-"}</p>
                          <p className="mt-0.5 text-xs text-slate-500">ID: {unit.id}</p>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {unit.tenant_name || "No tenant"}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-blue-300">
                          {formatMoney(unit.monthly_rent)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                              unit.status
                            )}`}
                          >
                            {String(unit.status || "-").toUpperCase()}
                          </span>
                        </td>

                        <td className="max-w-[260px] px-4 py-3 text-slate-300">
                          <span className="line-clamp-2">{unit.notes || "-"}</span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editUnit(unit)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
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

                    {filteredUnits.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                          No apartment units found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-4 lg:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                    Unit Panel
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {editingId ? "Edit Unit" : "Create Unit"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {editingId
                      ? "Update tenant, rent, or unit status."
                      : "Add a new apartment unit to the masterlist."}
                  </p>
                </div>

                {editingId && (
                  <button
                    onClick={resetForm}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <Input
                  label="Apartment / Unit Name"
                  value={unitName}
                  setValue={setUnitName}
                  placeholder="APT 01"
                />

                <Input
                  label="Tenant Name"
                  value={tenantName}
                  setValue={setTenantName}
                  placeholder="Tenant name"
                />

                <Input
                  label="Monthly Rent"
                  type="number"
                  value={monthlyRent}
                  setValue={setMonthlyRent}
                  placeholder="0.00"
                />

                <div>
                  <label className="text-sm font-semibold text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Repair notes / remarks"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={saveUnit}
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Unit" : "Save Unit"}
              </button>

              <button
                onClick={resetForm}
                className="mt-3 w-full rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                Clear Form
              </button>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Setup Guide
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Use occupied for active tenants, vacant for available units, maintenance for repair, and inactive for removed or non-operating units.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  warning,
}: {
  title: string;
  value: any;
  subtitle?: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className={warning ? "mt-2 text-2xl font-black text-amber-300" : "mt-2 text-2xl font-black text-white"}>
        {value}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function Input({
  label,
  value,
  setValue,
  type = "text",
  placeholder = "",
}: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}






