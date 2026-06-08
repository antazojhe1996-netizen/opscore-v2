"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import PageGuard from "@/components/PageGuard";

type KpiSetting = {
  id?: string;
  metric_key: string;
  metric_label: string;
  category: string;
  deduction_points: number;
  weight_percent: number;
  applies_to_department: string;
  is_enabled: boolean;
};

export default function PerformanceKpiSettingsPage() {
  /// STATES
  const [settingsRows, setSettingsRows] = useState<KpiSetting[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [isSaving, setIsSaving] = useState(false);

  const [metricKey, setMetricKey] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [category, setCategory] = useState("Attendance");
  const [deductionPoints, setDeductionPoints] = useState("1");
  const [weightPercent, setWeightPercent] = useState("0");
  const [appliesToDepartment, setAppliesToDepartment] = useState("ALL");

  /// DATA
  const categoryOptions = [
    "Attendance",
    "Schedule Compliance",
    "Leave Discipline",
    "Compliance",
    "Department KPI",
    "Custom",
  ];

  const applyToOptions = [
    { label: "ALL DEPARTMENTS", value: "ALL" },
    ...departments.map((dept) => ({ label: dept.name, value: dept.name })),
  ];

  const defaultKpis: KpiSetting[] = [
    {
      metric_key: "late",
      metric_label: "Late Occurrence",
      category: "Attendance",
      deduction_points: 2,
      weight_percent: 25,
      applies_to_department: "ALL",
      is_enabled: true,
    },
    {
      metric_key: "undertime",
      metric_label: "Undertime Occurrence",
      category: "Attendance",
      deduction_points: 3,
      weight_percent: 20,
      applies_to_department: "ALL",
      is_enabled: true,
    },
    {
      metric_key: "absent",
      metric_label: "Absent Occurrence",
      category: "Attendance",
      deduction_points: 8,
      weight_percent: 25,
      applies_to_department: "ALL",
      is_enabled: true,
    },
    {
      metric_key: "missing_timeout",
      metric_label: "Missing Timeout",
      category: "Attendance",
      deduction_points: 5,
      weight_percent: 15,
      applies_to_department: "ALL",
      is_enabled: true,
    },
    {
      metric_key: "no_schedule",
      metric_label: "No Schedule / OFF",
      category: "Schedule Compliance",
      deduction_points: 2,
      weight_percent: 10,
      applies_to_department: "ALL",
      is_enabled: true,
    },
    {
      metric_key: "review_flag",
      metric_label: "Payroll / Attendance Review Flag",
      category: "Compliance",
      deduction_points: 3,
      weight_percent: 5,
      applies_to_department: "ALL",
      is_enabled: true,
    },
  ];

  /// FUNCTIONS
  const normalizeMetricKey = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const getKpiSettings = async () => {
    const { data, error } = await supabase
      .from("performance_kpi_settings")
      .select("*")
      .order("applies_to_department", { ascending: true })
      .order("category", { ascending: true })
      .order("metric_label", { ascending: true });

    if (error) {
      console.log("GET PERFORMANCE KPI SETTINGS ERROR:", error.message);
      alert(`Failed to load KPI settings: ${error.message}`);
      return;
    }

    setSettingsRows(data || []);
  };

  const getDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET DEPARTMENTS ERROR:", error.message);
      alert(`Failed to load departments: ${error.message}`);
      return;
    }

    setDepartments(data || []);
  };

  const seedDefaultKpis = async () => {
    const confirmed = confirm("Create default Performance KPI settings?");
    if (!confirmed) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("performance_kpi_settings")
      .upsert(defaultKpis, {
        onConflict: "metric_key,applies_to_department",
      });

    setIsSaving(false);

    if (error) {
      console.log("SEED KPI SETTINGS ERROR:", error.message);
      alert(`Failed to create default KPI settings: ${error.message}`);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Performance KPI Settings",
      action: "Seed Default KPI",
      description: "Created default performance KPI settings",
      severity: "info",
      newValue: defaultKpis,
    });

    getKpiSettings();
  };

  const updateRow = async (row: KpiSetting) => {
    const cleanKey = normalizeMetricKey(row.metric_key);
    const cleanLabel = String(row.metric_label || "").trim();
    const cleanApplyTo = row.applies_to_department || "ALL";

    if (!cleanKey || !cleanLabel) {
      alert("Metric key and label are required.");
      return;
    }

    if (Number(row.deduction_points || 0) < 0 || Number(row.weight_percent || 0) < 0) {
      alert("Deduction and weight cannot be negative.");
      return;
    }

    setIsSaving(true);

    const payload = {
      metric_key: cleanKey,
      metric_label: cleanLabel,
      category: row.category || "Custom",
      deduction_points: Number(row.deduction_points || 0),
      weight_percent: Number(row.weight_percent || 0),
      applies_to_department: cleanApplyTo,
      is_enabled: row.is_enabled === true,
    };

    const query = row.id
      ? supabase.from("performance_kpi_settings").update(payload).eq("id", row.id)
      : supabase.from("performance_kpi_settings").insert(payload);

    const { error } = await query;

    setIsSaving(false);

    if (error) {
      console.log("SAVE KPI SETTING ERROR:", error.message);
      alert(`Failed to save KPI setting: ${error.message}`);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Performance KPI Settings",
      action: row.id ? "Update KPI Setting" : "Create KPI Setting",
      description: `${row.id ? "Updated" : "Created"} KPI setting: ${payload.metric_label}`,
      severity: "info",
      recordId: row.id || payload.metric_key,
      newValue: payload,
    });

    await getKpiSettings();
  };

  const addNewMetric = async () => {
    const cleanKey = normalizeMetricKey(metricKey || metricLabel);
    const cleanLabel = metricLabel.trim();
    const cleanDeduction = Number(deductionPoints || 0);
    const cleanWeight = Number(weightPercent || 0);
    const cleanApplyTo = appliesToDepartment || "ALL";

    if (!cleanKey || !cleanLabel) {
      alert("Please enter metric key and label.");
      return;
    }

    if (cleanDeduction < 0 || cleanWeight < 0) {
      alert("Deduction and weight cannot be negative.");
      return;
    }

    await updateRow({
      metric_key: cleanKey,
      metric_label: cleanLabel,
      category,
      deduction_points: cleanDeduction,
      weight_percent: cleanWeight,
      applies_to_department: cleanApplyTo,
      is_enabled: true,
    });

    setSelectedDepartment(cleanApplyTo);
    setMetricKey("");
    setMetricLabel("");
    setCategory("Attendance");
    setDeductionPoints("1");
    setWeightPercent("0");
    setAppliesToDepartment("ALL");
  };

  const deleteRow = async (row: KpiSetting) => {
    if (!row.id) return;

    const confirmed = confirm(`Delete KPI setting: ${row.metric_label}?`);
    if (!confirmed) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("performance_kpi_settings")
      .delete()
      .eq("id", row.id);

    setIsSaving(false);

    if (error) {
      console.log("DELETE KPI SETTING ERROR:", error.message);
      alert(`Failed to delete KPI setting: ${error.message}`);
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Performance KPI Settings",
      action: "Delete KPI Setting",
      description: `Deleted KPI setting: ${row.metric_label}`,
      severity: "warning",
      recordId: row.id,
      oldValue: row,
    });

    getKpiSettings();
  };

  /// EFFECTS
  useEffect(() => {
    getKpiSettings();
    getDepartments();
  }, []);

  /// CALCULATIONS
  const filteredRows = useMemo(() => {
    return settingsRows.filter((row) => {
      if (selectedDepartment === "ALL") {
        return row.applies_to_department === "ALL";
      }

      return (
        row.applies_to_department === "ALL" ||
        row.applies_to_department === selectedDepartment
      );
    });
  }, [settingsRows, selectedDepartment]);

  const enabledRows = filteredRows.filter((row) => row.is_enabled);
  const totalWeight = enabledRows.reduce(
    (sum, row) => sum + Number(row.weight_percent || 0),
    0
  );

  const allDepartmentRules = settingsRows.filter(
    (row) => row.applies_to_department === "ALL"
  ).length;

  const specificDepartmentRules = settingsRows.filter(
    (row) => row.applies_to_department !== "ALL"
  ).length;

  const disabledRows = settingsRows.filter((row) => !row.is_enabled).length;

  /// UI
  return (
  <PageGuard moduleKey="performance_kpi">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Settings
            </p>

            <h1 className="mt-2 text-4xl font-black">Performance KPI Settings</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Configure attendance and performance metrics. Use ALL DEPARTMENTS for current shared rules, then add department-only KPIs later when QA standards are ready.
            </p>
          </div>

          <button
            onClick={seedDefaultKpis}
            disabled={isSaving}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {settingsRows.length === 0 ? "Create Default KPIs" : "Reset / Add Defaults"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<Settings size={22} />} title="Total KPI Rules" value={settingsRows.length} />
          <KpiCard icon={<CheckCircle2 size={22} />} title="Enabled In View" value={enabledRows.length} success />
          <KpiCard icon={<BarChart3 size={22} />} title="View Weight" value={`${totalWeight}%`} danger={totalWeight !== 100} />
          <KpiCard icon={<AlertTriangle size={22} />} title="Dept Rules" value={specificDepartmentRules} danger={specificDepartmentRules > 0} />
        </section>

        {totalWeight !== 100 && enabledRows.length > 0 && (
          <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
            <p className="font-black">Current view weight total is {totalWeight}%.</p>
            <p className="mt-1 text-sm text-yellow-100/80">
              Recommended total is 100%. For now, keep shared KPIs under ALL DEPARTMENTS unless a department has a separate QA metric.
            </p>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Plus size={20} /> Add KPI Metric
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Input label="Metric Key" value={metricKey} setValue={setMetricKey} placeholder="auto_from_label" />
            <Input label="Metric Label" value={metricLabel} setValue={setMetricLabel} placeholder="Example: Late Occurrence" />
            <Select label="Category" value={category} setValue={setCategory} options={categoryOptions} />
            <Input label="Deduction Points" type="number" value={deductionPoints} setValue={setDeductionPoints} />
            <Input label="Weight %" type="number" value={weightPercent} setValue={setWeightPercent} />
            <SelectWithLabel
              label="Apply To"
              value={appliesToDepartment}
              setValue={setAppliesToDepartment}
              options={applyToOptions}
            />
          </div>

          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            <p className="font-black">Recommended V1 setup</p>
            <p className="mt-1 text-blue-100/80">
              Use ALL DEPARTMENTS for Late, Undertime, Absent, Missing Timeout, No Schedule, and Review Flag. Use a specific department only for future QA metrics like Room Cleaning Score or Cash Variance.
            </p>
          </div>

          <button
            onClick={addNewMetric}
            disabled={isSaving}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Add Metric"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black">KPI Rules</h2>
              <p className="mt-1 text-sm text-slate-400">
                All Departments view shows shared KPI rules only. A department view shows shared rules plus rules assigned to that department.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                  Shared: {allDepartmentRules}
                </span>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-300">
                  Department-only: {specificDepartmentRules}
                </span>
              </div>
            </div>

            <SelectNative
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={applyToOptions}
            />
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Metric Key</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Deduction</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Apply To</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, index) => (
                  <EditableKpiRow
                    key={row.id || `${row.metric_key}-${index}`}
                    row={row}
                    departments={departments}
                    categoryOptions={categoryOptions}
                    saveRow={updateRow}
                    deleteRow={deleteRow}
                    isSaving={isSaving}
                  />
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No KPI settings found. Click Create Default KPIs or add a new metric.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {disabledRows > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              {disabledRows} disabled rule(s) are currently not included in active scoring.
            </p>
          )}
        </section>
      </main>
        </div>
  </PageGuard>
  );
}

function EditableKpiRow({
  row,
  departments,
  categoryOptions,
  saveRow,
  deleteRow,
  isSaving,
}: {
  row: KpiSetting;
  departments: any[];
  categoryOptions: string[];
  saveRow: (row: KpiSetting) => void;
  deleteRow: (row: KpiSetting) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<KpiSetting>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  const updateDraft = (field: keyof KpiSetting, value: any) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/40">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={draft.is_enabled}
          onChange={(event) => updateDraft("is_enabled", event.target.checked)}
          className="h-4 w-4 accent-amber-400"
        />
      </td>

      <td className="px-4 py-3">
        <input
          value={draft.metric_key}
          onChange={(event) => updateDraft("metric_key", event.target.value)}
          className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        />
      </td>

      <td className="px-4 py-3">
        <input
          value={draft.metric_label}
          onChange={(event) => updateDraft("metric_label", event.target.value)}
          className="w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        />
      </td>

      <td className="px-4 py-3">
        <select
          value={draft.category}
          onChange={(event) => updateDraft("category", event.target.value)}
          className="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <input
          type="number"
          value={draft.deduction_points}
          onChange={(event) => updateDraft("deduction_points", Number(event.target.value || 0))}
          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        />
      </td>

      <td className="px-4 py-3">
        <input
          type="number"
          value={draft.weight_percent}
          onChange={(event) => updateDraft("weight_percent", Number(event.target.value || 0))}
          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        />
      </td>

      <td className="px-4 py-3">
        <select
          value={draft.applies_to_department || "ALL"}
          onChange={(event) => updateDraft("applies_to_department", event.target.value)}
          className="w-52 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none"
        >
          <option value="ALL">ALL DEPARTMENTS</option>
          {departments.map((dept) => (
            <option key={dept.id || dept.name} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => saveRow(draft)}
            disabled={isSaving}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black hover:bg-emerald-500 disabled:opacity-50"
            title="Save KPI rule"
          >
            <Save size={13} />
          </button>

          <button
            onClick={() => deleteRow(draft)}
            disabled={isSaving || !draft.id}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black hover:bg-red-500 disabled:opacity-50"
            title="Delete KPI rule"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function KpiCard({
  icon,
  title,
  value,
  success,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  value: any;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-yellow-500/20 bg-yellow-500/10"
          : success
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-3xl font-black">{value}</h2>
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
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function Select({ label, value, setValue, options }: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      >
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectWithLabel({ label, value, setValue, options }: any) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
      >
        {options.map((option: { label: string; value: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectNative({ value, onChange, options }: any) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none xl:w-72"
    >
      {options.map((option: { label: string; value: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
