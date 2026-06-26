"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import { createAuditLog } from "@/lib/audit";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Database,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

type RuleGroup = {
  id: number;
  min: number;
  max: number;
  rules: Record<string, number>;
};

type PeakRule = {
  id: number;
  day: string;
  rules: Record<string, number>;
};

type ModulePermission = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_release: boolean;
};

const MODULE_KEY = "hc_rules";

const emptyPermission: ModulePermission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_approve: false,
  can_release: false,
};

const defaultOccupancyRules: RuleGroup[] = [
  {
    id: 1,
    min: 0,
    max: 10,
    rules: {
      "Front Desk": 1,
      Housekeeping: 1,
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 0,
      Waitress: 1,
    },
  },
  {
    id: 2,
    min: 11,
    max: 20,
    rules: {
      "Front Desk": 2,
      Housekeeping: 2,
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
  {
    id: 3,
    min: 21,
    max: 30,
    rules: {
      "Front Desk": 2,
      Housekeeping: 3,
      Cashier: 1,
      Kitchen: 2,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
];

const defaultPeakRules: PeakRule[] = [
  {
    id: 1,
    day: "Friday",
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
  {
    id: 2,
    day: "Saturday",
    rules: {
      Cashier: 2,
      Kitchen: 2,
      "Kitchen Assistant": 2,
      Waitress: 2,
    },
  },
  {
    id: 3,
    day: "Sunday",
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 1,
    },
  },
];

const defaultEventRules: RuleGroup[] = [
  {
    id: 1,
    min: 1,
    max: 30,
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
  {
    id: 2,
    min: 31,
    max: 60,
    rules: {
      Cashier: 1,
      Kitchen: 1,
      "Kitchen Assistant": 1,
      Waitress: 2,
    },
  },
  {
    id: 3,
    min: 61,
    max: 100,
    rules: {
      Cashier: 1,
      Kitchen: 2,
      "Kitchen Assistant": 2,
      Waitress: 3,
    },
  },
];

export default function HCRulesPage() {
  /// DATA
  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "Holiday",
    "Long Weekend",
    "Custom",
  ];

  /// STATES
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [occupancyRules, setOccupancyRules] = useState<RuleGroup[]>(defaultOccupancyRules);
  const [peakRules, setPeakRules] = useState<PeakRule[]>(defaultPeakRules);
  const [eventRules, setEventRules] = useState<RuleGroup[]>(defaultEventRules);
  const [permissions, setPermissions] = useState<ModulePermission>(emptyPermission);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /// PERMISSION HELPERS
  const getCurrentEmployeeId = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_employee_id")
      : null;

  const loadPermissions = async () => {
    const employeeId = getCurrentEmployeeId();

    if (!employeeId) {
      setPermissions(emptyPermission);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, system_role_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError || !employee?.system_role_id) {
      setPermissions(emptyPermission);
      return;
    }

    const { data, error } = await supabase
      .from("role_permissions")
      .select("can_view, can_create, can_edit, can_delete, can_approve, can_release")
      .eq("role_id", employee.system_role_id)
      .eq("module_key", MODULE_KEY)
      .maybeSingle();

    if (error || !data) {
      setPermissions(emptyPermission);
      return;
    }

    setPermissions({ ...emptyPermission, ...data });
  };

  const denyIfCannotEdit = () => {
    if (!permissions.can_edit) {
      alert("Access denied. You do not have permission to edit HC rules.");
      return true;
    }

    return false;
  };

  const denyIfCannotCreate = () => {
    if (!permissions.can_create) {
      alert("Access denied. You do not have permission to add HC rules.");
      return true;
    }

    return false;
  };

  const denyIfCannotDelete = () => {
    if (!permissions.can_delete) {
      alert("Access denied. You do not have permission to delete or reset HC rules.");
      return true;
    }

    return false;
  };

  /// HELPERS
  const getCurrentUserName = async () => {
    const localEmployee =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee")
        : null;

    if (localEmployee) {
      try {
        const parsed = JSON.parse(localEmployee);
        const name = `${parsed?.first_name || ""} ${parsed?.last_name || ""}`.trim();
        return name || parsed?.username || "System User";
      } catch {
        // fallback below
      }
    }

    const { data } = await supabase.auth.getUser();
    return data.user?.email || "System User";
  };

  const getTotalRules = (groups: RuleGroup[]) =>
    groups.reduce((sum, group) => sum + Object.keys(group.rules || {}).length, 0);

  const getTotalPeakRules = (groups: PeakRule[]) =>
    groups.reduce((sum, group) => sum + Object.keys(group.rules || {}).length, 0);

  /// LOADERS
  const getDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.log("GET DEPARTMENTS ERROR:", error);

      const fallbackDepartments = [
        "Front Desk",
        "Housekeeping",
        "Cashier",
        "Kitchen",
        "Kitchen Assistant",
        "Waitress",
      ];

      setDepartmentOptions(fallbackDepartments);
      setSelectedDepartment(fallbackDepartments[0]);
      return;
    }

    const names = (data || [])
      .map((dept: any) => dept.name || dept.department_name || dept.title)
      .filter(Boolean);

    const finalDepartments =
      names.length > 0
        ? names
        : [
            "Front Desk",
            "Housekeeping",
            "Cashier",
            "Kitchen",
            "Kitchen Assistant",
            "Waitress",
          ];

    setDepartmentOptions(finalDepartments);
    setSelectedDepartment(finalDepartments[0] || "");
  };

  const loadHCRules = async () => {
    const { data, error } = await supabase
      .from("hc_rule_settings")
      .select("setting_data")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    if (error) {
      console.log("LOAD HC RULES ERROR:", error);
      return;
    }

    if (data?.setting_data) {
      setOccupancyRules(data.setting_data.occupancyRules || defaultOccupancyRules);
      setPeakRules(data.setting_data.peakRules || defaultPeakRules);
      setEventRules(data.setting_data.eventRules || defaultEventRules);
    }
  };

  const refreshPage = async () => {
    setLoading(true);
    await Promise.all([loadPermissions(), getDepartments(), loadHCRules()]);
    setLoading(false);
  };

  /// ACTIONS
  const saveHCRules = async () => {
    if (denyIfCannotEdit()) return;

    setSaving(true);

    const { data: oldRule } = await supabase
      .from("hc_rule_settings")
      .select("*")
      .eq("setting_name", "hc_rules")
      .maybeSingle();

    const payload = {
      occupancyRules,
      peakRules,
      eventRules,
    };

    const { error } = await supabase.from("hc_rule_settings").upsert(
      {
        setting_name: "hc_rules",
        setting_data: payload,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "setting_name",
      },
    );

    setSaving(false);

    if (error) {
      console.log("SAVE HC RULES ERROR:", error);
      alert("Failed to save HC rules. Check console.");
      return;
    }

    const userName = await getCurrentUserName();

    await createAuditLog({
      userName,
      module: "Settings / HC Rules",
      action: "UPDATE_HC_RULE",
      description: "Updated HC Rules configuration",
      severity: "warning",
      recordId: "hc_rules",
      oldValue: oldRule?.setting_data || null,
      newValue: payload,
    });

    alert("HC rules saved successfully.");
  };

  const resetToDefault = async () => {
    if (denyIfCannotDelete()) return;

    const confirmReset = confirm(
      "Reset HC rules to default values? This will be recorded in Audit Trail.",
    );

    if (!confirmReset) return;

    const oldValue = {
      occupancyRules,
      peakRules,
      eventRules,
    };

    const newValue = {
      occupancyRules: defaultOccupancyRules,
      peakRules: defaultPeakRules,
      eventRules: defaultEventRules,
    };

    setOccupancyRules(defaultOccupancyRules);
    setPeakRules(defaultPeakRules);
    setEventRules(defaultEventRules);

    const userName = await getCurrentUserName();

    await createAuditLog({
      userName,
      module: "Settings / HC Rules",
      action: "RESET_HC_RULE",
      description: "Reset HC Rules to default values",
      severity: "critical",
      recordId: "hc_rules",
      oldValue,
      newValue,
    });

    alert("HC rules reset to default. Click Save Changes to persist the reset.");
  };

  const updateGroupRange = (
    section: "occupancy" | "event",
    id: number,
    field: "min" | "max",
    value: number,
  ) => {
    if (denyIfCannotEdit()) return;

    const safeValue = Math.max(0, value || 0);
    const updater = (prev: RuleGroup[]) =>
      prev.map((group) => (group.id === id ? { ...group, [field]: safeValue } : group));

    if (section === "occupancy") setOccupancyRules(updater);
    if (section === "event") setEventRules(updater);
  };

  const updateHC = (
    section: "occupancy" | "event",
    groupId: number,
    department: string,
    value: number,
  ) => {
    if (denyIfCannotEdit()) return;

    const safeValue = Math.max(0, value || 0);
    const updater = (prev: RuleGroup[]) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              rules: {
                ...group.rules,
                [department]: safeValue,
              },
            }
          : group,
      );

    if (section === "occupancy") setOccupancyRules(updater);
    if (section === "event") setEventRules(updater);
  };

  const updatePeakDay = (id: number, day: string) => {
    if (denyIfCannotEdit()) return;

    setPeakRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, day } : rule)));
  };

  const updatePeakHC = (ruleId: number, department: string, value: number) => {
    if (denyIfCannotEdit()) return;

    const safeValue = Math.max(0, value || 0);

    setPeakRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              rules: {
                ...rule.rules,
                [department]: safeValue,
              },
            }
          : rule,
      ),
    );
  };

  const addOccupancyRule = () => {
    if (denyIfCannotCreate()) return;

    setOccupancyRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        min: 0,
        max: 0,
        rules: {},
      },
    ]);
  };

  const addPeakRule = () => {
    if (denyIfCannotCreate()) return;

    setPeakRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        day: "Custom",
        rules: {},
      },
    ]);
  };

  const addEventRule = () => {
    if (denyIfCannotCreate()) return;

    setEventRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        min: 0,
        max: 0,
        rules: {},
      },
    ]);
  };

  const deleteOccupancyRule = (id: number) => {
    if (denyIfCannotDelete()) return;
    setOccupancyRules((prev) => prev.filter((group) => group.id !== id));
  };

  const deletePeakRule = (id: number) => {
    if (denyIfCannotDelete()) return;
    setPeakRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const deleteEventRule = (id: number) => {
    if (denyIfCannotDelete()) return;
    setEventRules((prev) => prev.filter((group) => group.id !== id));
  };

  const addDepartmentToOccupancyRule = (id: number) => {
    if (denyIfCannotCreate()) return;
    if (!selectedDepartment) return;

    setOccupancyRules((prev) =>
      prev.map((group) =>
        group.id === id
          ? {
              ...group,
              rules: {
                ...group.rules,
                [selectedDepartment]: group.rules[selectedDepartment] || 0,
              },
            }
          : group,
      ),
    );
  };

  const addDepartmentToPeakRule = (id: number) => {
    if (denyIfCannotCreate()) return;
    if (!selectedDepartment) return;

    setPeakRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              rules: {
                ...rule.rules,
                [selectedDepartment]: rule.rules[selectedDepartment] || 0,
              },
            }
          : rule,
      ),
    );
  };

  const addDepartmentToEventRule = (id: number) => {
    if (denyIfCannotCreate()) return;
    if (!selectedDepartment) return;

    setEventRules((prev) =>
      prev.map((group) =>
        group.id === id
          ? {
              ...group,
              rules: {
                ...group.rules,
                [selectedDepartment]: group.rules[selectedDepartment] || 0,
              },
            }
          : group,
      ),
    );
  };

  /// EFFECTS
  useEffect(() => {
    refreshPage();
  }, []);

  /// CALCULATIONS
  const totalDepartmentOptions = departmentOptions.length;
  const totalRuleCards = occupancyRules.length + peakRules.length + eventRules.length;
  const totalDepartmentRules =
    getTotalRules(occupancyRules) + getTotalPeakRules(peakRules) + getTotalRules(eventRules);
  const readOnlyMode = !permissions.can_edit;

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Workforce Settings
            </p>
            <h1 className="mt-2 text-4xl font-black">HC Rules Management</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
              Configure staffing requirements for occupancy, peak business days, and event pax.
              These rules support forecasting, scheduling, and manpower planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshPage}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900 disabled:opacity-50"
            >
              <RefreshCcw size={17} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            {permissions.can_delete && (
              <button
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 hover:bg-red-500/20"
              >
                <RotateCcw size={17} />
                Reset Default
              </button>
            )}

            {permissions.can_edit && (
              <button
                onClick={saveHCRules}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<BarChart3 size={22} />}
            title="Rule Groups"
            value={totalRuleCards}
            helper="occupancy, peak day, event"
          />
          <SummaryCard
            icon={<Users size={22} />}
            title="Department Rules"
            value={totalDepartmentRules}
            helper="active department entries"
          />
          <SummaryCard
            icon={<Database size={22} />}
            title="Departments"
            value={totalDepartmentOptions}
            helper="from master data"
          />
          <SummaryCard
            icon={readOnlyMode ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
            title="Access Mode"
            value={readOnlyMode ? "View Only" : "Editable"}
            helper={readOnlyMode ? "no rule changes allowed" : "changes allowed"}
            warning={readOnlyMode}
            success={!readOnlyMode}
          />
        </section>

        {readOnlyMode && (
          <section className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
            <p className="font-black text-yellow-300">View-only access</p>
            <p className="mt-1">
              You can review HC rules, but editing, deleting, adding departments, saving, and reset actions are blocked by role permissions.
            </p>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-xl font-black">Department Picker</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select a department, then add it to any occupancy, peak day, or event rule card.
              </p>
            </div>

            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none lg:w-80"
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
            >
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="space-y-6">
          <RuleSection
            icon={<BarChart3 size={22} />}
            title="Occupancy Rules"
            description="Required headcount based on rooms sold. Used by forecasting and scheduling."
            actionLabel="Add Room Range"
            canCreate={permissions.can_create}
            onAdd={addOccupancyRule}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {occupancyRules.map((group) => (
                <RangeRuleCard
                  key={group.id}
                  title={`${group.min} - ${group.max} Rooms`}
                  minLabel="Min Rooms"
                  maxLabel="Max Rooms"
                  min={group.min}
                  max={group.max}
                  rules={group.rules}
                  selectedDepartment={selectedDepartment}
                  canCreate={permissions.can_create}
                  canEdit={permissions.can_edit}
                  canDelete={permissions.can_delete}
                  onAddDepartment={() => addDepartmentToOccupancyRule(group.id)}
                  onDelete={() => deleteOccupancyRule(group.id)}
                  onChangeMin={(value) => updateGroupRange("occupancy", group.id, "min", value)}
                  onChangeMax={(value) => updateGroupRange("occupancy", group.id, "max", value)}
                  onChangeHC={(department, value) => updateHC("occupancy", group.id, department, value)}
                />
              ))}
            </div>
          </RuleSection>

          <RuleSection
            icon={<CalendarDays size={22} />}
            title="Peak Day Rules"
            description="Restaurant and service add-on HC for Friday, Saturday, Sunday, holidays, and custom peak days."
            actionLabel="Add Peak Rule"
            canCreate={permissions.can_create}
            onAdd={addPeakRule}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {peakRules.map((rule) => (
                <PeakRuleCard
                  key={rule.id}
                  day={rule.day}
                  dayOptions={dayOptions}
                  rules={rule.rules}
                  selectedDepartment={selectedDepartment}
                  canCreate={permissions.can_create}
                  canEdit={permissions.can_edit}
                  canDelete={permissions.can_delete}
                  onAddDepartment={() => addDepartmentToPeakRule(rule.id)}
                  onDelete={() => deletePeakRule(rule.id)}
                  onChangeDay={(value) => updatePeakDay(rule.id, value)}
                  onChangeHC={(department, value) => updatePeakHC(rule.id, department, value)}
                />
              ))}
            </div>
          </RuleSection>

          <RuleSection
            icon={<Users size={22} />}
            title="Event Add-on Rules"
            description="Additional headcount based on expected event pax. Helps prevent under-staffing during functions."
            actionLabel="Add Pax Range"
            canCreate={permissions.can_create}
            onAdd={addEventRule}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {eventRules.map((group) => (
                <RangeRuleCard
                  key={group.id}
                  title={`${group.min} - ${group.max} Pax`}
                  minLabel="Min Pax"
                  maxLabel="Max Pax"
                  min={group.min}
                  max={group.max}
                  rules={group.rules}
                  selectedDepartment={selectedDepartment}
                  canCreate={permissions.can_create}
                  canEdit={permissions.can_edit}
                  canDelete={permissions.can_delete}
                  onAddDepartment={() => addDepartmentToEventRule(group.id)}
                  onDelete={() => deleteEventRule(group.id)}
                  onChangeMin={(value) => updateGroupRange("event", group.id, "min", value)}
                  onChangeMax={(value) => updateGroupRange("event", group.id, "max", value)}
                  onChangeHC={(department, value) => updateHC("event", group.id, department, value)}
                />
              ))}
            </div>
          </RuleSection>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  helper,
  success,
  warning,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  helper: string;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        success
          ? "border-emerald-500/20 bg-emerald-500/10"
          : warning
            ? "border-yellow-500/20 bg-yellow-500/10"
            : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl bg-slate-950 p-3 text-amber-400">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{title}</p>
      <h3
        className={`mt-1 text-3xl font-black ${
          success ? "text-emerald-400" : warning ? "text-yellow-300" : "text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function RuleSection({
  icon,
  title,
  description,
  actionLabel,
  canCreate,
  onAdd,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  canCreate: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-950 p-3 text-amber-400">{icon}</div>
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white hover:bg-slate-700"
          >
            <Plus size={17} />
            {actionLabel}
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function RangeRuleCard({
  title,
  minLabel,
  maxLabel,
  min,
  max,
  rules,
  selectedDepartment,
  canCreate,
  canEdit,
  canDelete,
  onAddDepartment,
  onDelete,
  onChangeMin,
  onChangeMax,
  onChangeHC,
}: {
  title: string;
  minLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  rules: Record<string, number>;
  selectedDepartment: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddDepartment: () => void;
  onDelete: () => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
  onChangeHC: (department: string, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-400">Rule Group</p>
          <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{Object.keys(rules).length} department rule(s)</p>
        </div>

        {canDelete && (
          <button
            onClick={onDelete}
            className="rounded-xl bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
            title="Delete rule group"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <NumberField label={minLabel} value={min} disabled={!canEdit} onChange={onChangeMin} />
        <NumberField label={maxLabel} value={max} disabled={!canEdit} onChange={onChangeMax} />
      </div>

      {canCreate && (
        <button
          onClick={onAddDepartment}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-slate-200 hover:bg-slate-800"
        >
          <Plus size={15} />
          Add {selectedDepartment || "Department"}
        </button>
      )}

      <DepartmentRuleList rules={rules} canEdit={canEdit} onChangeHC={onChangeHC} />
    </div>
  );
}

function PeakRuleCard({
  day,
  dayOptions,
  rules,
  selectedDepartment,
  canCreate,
  canEdit,
  canDelete,
  onAddDepartment,
  onDelete,
  onChangeDay,
  onChangeHC,
}: {
  day: string;
  dayOptions: string[];
  rules: Record<string, number>;
  selectedDepartment: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddDepartment: () => void;
  onDelete: () => void;
  onChangeDay: (value: string) => void;
  onChangeHC: (department: string, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-400">Peak Rule</p>
          <h3 className="mt-1 text-lg font-black text-white">{day}</h3>
          <p className="mt-1 text-xs text-slate-500">{Object.keys(rules).length} department rule(s)</p>
        </div>

        {canDelete && (
          <button
            onClick={onDelete}
            className="rounded-xl bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
            title="Delete peak rule"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Peak Day</label>
        <select
          value={day}
          onChange={(event) => onChangeDay(event.target.value)}
          disabled={!canEdit}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dayOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {canCreate && (
        <button
          onClick={onAddDepartment}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-slate-200 hover:bg-slate-800"
        >
          <Plus size={15} />
          Add {selectedDepartment || "Department"}
        </button>
      )}

      <DepartmentRuleList rules={rules} canEdit={canEdit} onChangeHC={onChangeHC} />
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function DepartmentRuleList({
  rules,
  canEdit,
  onChangeHC,
}: {
  rules: Record<string, number>;
  canEdit: boolean;
  onChangeHC: (department: string, value: number) => void;
}) {
  const departments = Object.keys(rules || {});

  if (departments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
        No department added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {departments.map((department) => (
        <div
          key={department}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{department}</p>
            <p className="text-xs text-slate-500">Required HC</p>
          </div>

          <Counter value={rules[department] || 0} disabled={!canEdit} onChange={(value) => onChangeHC(department, value)} />
        </div>
      ))}
    </div>
  );
}

function Counter({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="h-9 w-9 rounded-lg bg-slate-800 text-sm font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        -
      </button>

      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value || 0)))}
        className="h-9 w-16 rounded-lg border border-slate-700 bg-slate-950 text-center text-sm font-black text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
      />

      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="h-9 w-9 rounded-lg bg-slate-800 text-sm font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}






