import { supabase } from '@/lib/supabase';
"use client";


"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";

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

  /// CALCULATIONS
  const occupiedUnits = useMemo(
    () => units.filter((unit) => unit.status === "Occupied").length,
    [units]
  );

  const vacantUnits = useMemo(
    () => units.filter((unit) => unit.status === "Vacant").length,
    [units]
  );

  const monthlyRentBase = useMemo(
    () => units.reduce((sum, unit) => sum + Number(unit.monthly_rent || 0), 0),
    [units]
  );

  /// HELPERS
  const formatMoney = (value: any) => {
    return `â‚±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadgeClass = (unitStatus?: string | null) => {
    if (unitStatus === "Occupied") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (unitStatus === "Vacant") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    if (unitStatus === "Maintenance") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
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
      description: `Added apartment unit: ${
        data?.unit_name || newUnit.unit_name
      }`,
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

      alert(
        "Failed to delete apartment unit. It may already be linked to bills or payments."
      );
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
    <PageGuard moduleKey="property_settings">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="SYSTEM / PROPERTY SETTINGS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                System
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Property Settings
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Manage apartment units, tenants, rent defaults, due dates, and
                billing configuration.
              </p>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SettingsSummaryCard title="Total Units" value={units.length} />
              <SettingsSummaryCard title="Occupied Units" value={occupiedUnits} />
              <SettingsSummaryCard title="Vacant Units" value={vacantUnits} />
              <SettingsSummaryCard
                title="Monthly Rent Base"
                value={formatMoney(monthlyRentBase)}
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Property Configuration
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Add Apartment Unit
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Create the master unit record used for rent billing,
                    collection tracking, and property reports.
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Unit Name
                      </label>
                      <input
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="Unit name / room number"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Tenant Name
                      </label>
                      <input
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Tenant name"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Monthly Rent
                      </label>
                      <input
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Internet Fee
                      </label>
                      <input
                        type="number"
                        value={internetFee}
                        onChange={(e) => setInternetFee(e.target.value)}
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Due Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        placeholder="5"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="Occupied">Occupied</option>
                        <option value="Vacant">Vacant</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                    <button
                      onClick={resetForm}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Reset
                    </button>

                    <button
                      onClick={addUnit}
                      disabled={isSaving}
                      className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save Apartment Unit"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Settings Summary
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Property Setup Status
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Current property configuration based on saved unit records.
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  <SummaryRow label="Total Units" value={units.length} />
                  <SummaryRow label="Occupied" value={occupiedUnits} />
                  <SummaryRow label="Vacant" value={vacantUnits} />
                  <SummaryRow
                    label="Monthly Rent Base"
                    value={formatMoney(monthlyRentBase)}
                  />

                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                      Audit Protected
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                      Added and deleted apartment units are recorded in the
                      audit trail.
                    </p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Apartment Units
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Unit Master List
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Master list of apartment units used for billing setup and
                  property tracking.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Unit</th>
                      <th className="px-6 py-4">Tenant</th>
                      <th className="px-6 py-4 text-right">Rent</th>
                      <th className="px-6 py-4 text-right">Internet</th>
                      <th className="px-6 py-4 text-center">Due Day</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {units.map((unit) => (
                      <tr
                        key={unit.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-black text-slate-950">
                          {unit.unit_name}
                        </td>

                        <td className="px-6 py-4">
                          {unit.tenant_name || "-"}
                        </td>

                        <td className="px-6 py-4 text-right font-black text-slate-950">
                          {formatMoney(unit.monthly_rent)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {formatMoney(unit.internet_fee)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          Every {unit.due_day || 5}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                              unit.status
                            )}`}
                          >
                            {unit.status || "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteUnit(unit)}
                            className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {units.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <h3 className="text-sm font-black text-slate-950">
                            No apartment units added yet.
                          </h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">
                            Add the first unit using the property configuration
                            form above.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function SettingsSummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}





