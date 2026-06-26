"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";
import {
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

const modules = [
  { key: "dashboard", label: "Dashboard" },

  { key: "audit_center", label: "Audit Center" },
  { key: "activity_logs", label: "Activity Logs" },
  { key: "database_health", label: "Database Health" },

  { key: "workforce", label: "Workforce" },
  { key: "employees", label: "Employees / 201" },
  { key: "scheduling", label: "Scheduling" },
  { key: "leave_management", label: "Leave Management" },
  { key: "forecasting", label: "Forecasting" },
  { key: "performance", label: "Performance Monitoring" },

  { key: "hotel_room_sales", label: "Hotel Room Sales" },
  { key: "apartment_sales", label: "Apartment Sales" },
  { key: "restaurant_sales", label: "Restaurant / Sports Bar Sales" },

  { key: "finance_dashboard", label: "Finance Dashboard" },
  { key: "expenses", label: "Expenses" },
  { key: "expense_requests", label: "Expense Requests" },
  { key: "bills_monitoring", label: "Bills Monitoring" },
  { key: "cash_management", label: "Cash Management" },
  { key: "expense_allocation", label: "Expense Allocation" },
  { key: "finance_settings", label: "Finance Settings" },

  { key: "approval_center", label: "Approval Center" },

  { key: "attendance", label: "Attendance Audit" },
  { key: "payroll_register", label: "Payroll Register" },
  { key: "payroll_manager", label: "Payroll Manager" },
  { key: "payslips", label: "Payslips" },
  { key: "employee_balances", label: "Employee Balances" },
  { key: "payroll_snapshots", label: "Payroll Snapshots" },
  { key: "release_history", label: "Release History" },
  { key: "payroll_settings", label: "Payroll Settings" },

  { key: "settings", label: "General Settings" },
  { key: "approval_controls", label: "Approval Controls" },
  { key: "approval_assignments", label: "Approval Assignments" },
  { key: "user_credentials", label: "User Credentials" },
  { key: "user_roles", label: "User Roles" },
  { key: "backup_restore", label: "Backup & Restore" },
  { key: "departments_settings", label: "Departments" },
  { key: "positions_settings", label: "Positions" },
  { key: "employment_settings", label: "Employment Settings" },
  { key: "shift_settings", label: "Shift Settings" },
  { key: "hc_rules", label: "HC Rules" },
  { key: "forecasting_rules", label: "Forecasting Rules" },
  { key: "performance_kpi", label: "Performance KPI" },
  { key: "leave_settings", label: "Leave Settings" },
  { key: "property_settings", label: "Property Settings" },
];

const emptyPermission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_approve: false,
  can_release: false,
};

type AuditSeverity = "info" | "warning" | "critical";

export default function UserRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const rolePermissions = useMemo(() => {
    const mapped: Record<string, any> = {};

    modules.forEach((module) => {
      const existing = permissions.find(
        (permission) =>
          permission.role_id === selectedRoleId &&
          permission.module_key === module.key,
      );

      mapped[module.key] = existing || {
        role_id: selectedRoleId,
        module_key: module.key,
        ...emptyPermission,
      };
    });

    return mapped;
  }, [permissions, selectedRoleId]);

  const assignedEmployees = employees.filter(
    (employee) => employee.system_role_id === selectedRoleId,
  );

  const getCurrentUser = async () => {
    const localUser =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_user")
        : null;

    if (localUser) {
      try {
        const parsedUser = JSON.parse(localUser);

        return {
          id: parsedUser?.id || null,
          name:
            parsedUser?.name ||
            parsedUser?.full_name ||
            parsedUser?.user_name ||
            parsedUser?.email ||
            "Unknown User",
          email: parsedUser?.email || null,
        };
      } catch {}
    }

    const { data } = await supabase.auth.getUser();

    return {
      id: data?.user?.id || null,
      name:
        data?.user?.user_metadata?.full_name ||
        data?.user?.email ||
        "Unknown User",
      email: data?.user?.email || null,
    };
  };

  const createAuditLog = async ({
    action,
    description,
    severity = "info",
    recordId = null,
    oldValue = null,
    newValue = null,
  }: {
    action: string;
    description: string;
    severity?: AuditSeverity;
    recordId?: string | null;
    oldValue?: any;
    newValue?: any;
  }) => {
    const currentUser = await getCurrentUser();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      module: "User Roles",
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    });

    if (error) console.log("USER ROLES AUDIT ERROR:", error.message);
  };

  const getRoles = async () => {
    const { data, error } = await supabase
      .from("system_roles")
      .select("*")
      .order("role_name", { ascending: true });

    if (error) {
      console.log("GET ROLES ERROR:", error.message);
      return;
    }

    setRoles(data || []);

    if (!selectedRoleId && data && data.length > 0) {
      setSelectedRoleId(data[0].id);
    }
  };

  const getPermissions = async () => {
    const { data, error } = await supabase.from("role_permissions").select("*");

    if (error) {
      console.log("GET PERMISSIONS ERROR:", error.message);
      return;
    }

    setPermissions(data || []);
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("employment_status", "Active")
      .eq("admin_access_enabled", true)
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET ADMIN ACCESS EMPLOYEES ERROR:", error.message);
      return;
    }

    setEmployees(data || []);
  };

  const refreshData = async () => {
    await getRoles();
    await getPermissions();
    await getEmployees();
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      alert("Enter role name.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("system_roles")
      .insert({
        role_name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        is_active: true,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewRoleName("");
    setNewRoleDescription("");
    setSelectedRoleId(data.id);

    await refreshData();

    await createAuditLog({
      action: "CREATE_ROLE",
      description: `Created system role: ${data.role_name}`,
      severity: "warning",
      recordId: data.id,
      oldValue: null,
      newValue: data,
    });

    alert("Role created.");
  };

  const deleteRole = async () => {
    if (!selectedRoleId || !selectedRole) return;

    if (assignedEmployees.length > 0) {
      await createAuditLog({
        action: "DELETE_ROLE_BLOCKED",
        description: `Blocked delete for role ${selectedRole.role_name} because employees are still assigned.`,
        severity: "warning",
        recordId: selectedRoleId,
        oldValue: {
          role_id: selectedRoleId,
          role_name: selectedRole.role_name,
          assigned_employees: assignedEmployees.length,
        },
        newValue: null,
      });

      alert("Cannot delete role. Remove assigned admin access employees first.");
      return;
    }

    const roleSnapshot = selectedRole;
    const confirmed = confirm(`Delete role "${roleSnapshot.role_name}"?`);

    if (!confirmed) return;

    const { error } = await supabase
      .from("system_roles")
      .delete()
      .eq("id", selectedRoleId);

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedRoleId("");
    await refreshData();

    await createAuditLog({
      action: "DELETE_ROLE",
      description: `Deleted system role: ${roleSnapshot.role_name}`,
      severity: "critical",
      recordId: roleSnapshot.id,
      oldValue: roleSnapshot,
      newValue: null,
    });

    alert("Role deleted.");
  };

  const updatePermissionLocal = (
    moduleKey: string,
    field: string,
    value: boolean,
  ) => {
    if (!selectedRoleId) return;

    const existing = permissions.find(
      (permission) =>
        permission.role_id === selectedRoleId &&
        permission.module_key === moduleKey,
    );

    if (existing) {
      setPermissions((prev) =>
        prev.map((permission) =>
          permission.role_id === selectedRoleId &&
          permission.module_key === moduleKey
            ? { ...permission, [field]: value }
            : permission,
        ),
      );
      return;
    }

    setPermissions((prev) => [
      ...prev,
      {
        role_id: selectedRoleId,
        module_key: moduleKey,
        ...emptyPermission,
        [field]: value,
      },
    ]);
  };

  const setRolePermissionsFromPreset = async (
    presetName: string,
    builder: (moduleKey: string) => any,
  ) => {
    if (!selectedRoleId) {
      alert("Select role first.");
      return;
    }

    const oldPermissions = permissions.filter(
      (permission) => permission.role_id === selectedRoleId,
    );

    const otherRolePermissions = permissions.filter(
      (permission) => permission.role_id !== selectedRoleId,
    );

    const newRolePermissions = modules.map((module) => ({
      role_id: selectedRoleId,
      module_key: module.key,
      ...builder(module.key),
    }));

    setPermissions([...otherRolePermissions, ...newRolePermissions]);

    await createAuditLog({
      action: "APPLY_PERMISSION_PRESET",
      description: `Applied ${presetName} preset to ${
        selectedRole?.role_name || "selected role"
      }. Save is still required to persist changes.`,
      severity: presetName === "Clear All" ? "warning" : "info",
      recordId: selectedRoleId,
      oldValue: {
        role_id: selectedRoleId,
        role_name: selectedRole?.role_name,
        permissions: oldPermissions,
      },
      newValue: {
        preset: presetName,
        permissions: newRolePermissions,
      },
    });
  };

  const grantFullAccess = async () => {
    await setRolePermissionsFromPreset("Full Access", () => ({
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_approve: true,
      can_release: true,
    }));
  };

  const grantViewOnly = async () => {
    await setRolePermissionsFromPreset("View Only", () => ({
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      can_release: false,
    }));
  };

  const clearAllPermissions = async () => {
    await setRolePermissionsFromPreset("Clear All", () => ({
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      can_release: false,
    }));
  };

  const applyPayrollPreset = async () => {
    const allowedView = [
      "dashboard",
      "attendance",
      "payroll_register",
      "payroll_manager",
      "payslips",
      "employee_balances",
      "payroll_snapshots",
      "release_history",
    ];

    await setRolePermissionsFromPreset("Payroll", (moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: moduleKey === "attendance",
      can_edit: ["attendance", "payroll_register"].includes(moduleKey),
      can_delete: false,
      can_approve: moduleKey === "payroll_manager",
      can_release: false,
    }));
  };

  const applyHRPreset = async () => {
    const allowedView = [
      "dashboard",
      "audit_center",
      "workforce",
      "employees",
      "scheduling",
      "leave_management",
      "forecasting",
    ];

    const allowedCreateEdit = ["employees", "scheduling", "leave_management"];

    await setRolePermissionsFromPreset("HR", (moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedCreateEdit.includes(moduleKey),
      can_edit: allowedCreateEdit.includes(moduleKey),
      can_delete: false,
      can_approve: moduleKey === "leave_management",
      can_release: false,
    }));
  };

  const applyCashierPreset = async () => {
    const allowedView = [
      "dashboard",
      "hotel_room_sales",
      "apartment_sales",
      "restaurant_sales",
      "finance_dashboard",
      "expenses",
      "expense_requests",
      "bills_monitoring",
      "cash_management",
    ];

    const allowedCreateEdit = [
      "hotel_room_sales",
      "apartment_sales",
      "restaurant_sales",
      "expenses",
      "expense_requests",
      "cash_management",
    ];

    await setRolePermissionsFromPreset("Front Office / Cashier", (moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedCreateEdit.includes(moduleKey),
      can_edit: allowedCreateEdit.includes(moduleKey),
      can_delete: false,
      can_approve: false,
      can_release: moduleKey === "cash_management",
    }));
  };

  const applyManagerPreset = async () => {
    const allowedView = [
      "dashboard",
      "audit_center",
      "activity_logs",
      "database_health",
      "workforce",
      "employees",
      "scheduling",
      "leave_management",
      "forecasting",
      "performance",
      "hotel_room_sales",
      "apartment_sales",
      "restaurant_sales",
      "finance_dashboard",
      "expenses",
      "expense_requests",
      "bills_monitoring",
      "cash_management",
      "approval_center",
    ];

    const allowedCreateEdit = [
      "workforce",
      "employees",
      "scheduling",
      "leave_management",
      "forecasting",
      "performance",
      "expenses",
      "expense_requests",
      "cash_management",
    ];

    const allowedApprove = [
      "approval_center",
      "expenses",
      "expense_requests",
      "cash_management",
      "leave_management",
    ];

    await setRolePermissionsFromPreset("Manager / Supervisor / Audit", (moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedCreateEdit.includes(moduleKey),
      can_edit: allowedCreateEdit.includes(moduleKey),
      can_delete: false,
      can_approve: allowedApprove.includes(moduleKey),
      can_release: moduleKey === "cash_management",
    }));
  };

  const applyOperationsManagerPreset = async () => {
    const allowedView = modules.map((module) => module.key);
    const noDelete = ["user_credentials", "user_roles", "backup_restore"];

    await setRolePermissionsFromPreset("Operations Manager", (moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedView.includes(moduleKey),
      can_edit: allowedView.includes(moduleKey),
      can_delete: allowedView.includes(moduleKey) && !noDelete.includes(moduleKey),
      can_approve: allowedView.includes(moduleKey),
      can_release: [
        "cash_management",
        "payroll_manager",
        "approval_center",
      ].includes(moduleKey),
    }));
  };

  const savePermissions = async () => {
    if (!selectedRoleId) {
      alert("Select role first.");
      return;
    }

    const oldRows = permissions.filter(
      (permission) => permission.role_id === selectedRoleId,
    );

    const rows = modules.map((module) => ({
      role_id: selectedRoleId,
      module_key: module.key,
      can_view: Boolean(rolePermissions[module.key]?.can_view),
      can_create: Boolean(rolePermissions[module.key]?.can_create),
      can_edit: Boolean(rolePermissions[module.key]?.can_edit),
      can_delete: Boolean(rolePermissions[module.key]?.can_delete),
      can_approve: Boolean(rolePermissions[module.key]?.can_approve),
      can_release: Boolean(rolePermissions[module.key]?.can_release),
    }));

    setIsSaving(true);

    const { error } = await supabase.from("role_permissions").upsert(rows, {
      onConflict: "role_id,module_key",
    });

    setIsSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await getPermissions();

    await createAuditLog({
      action: "SAVE_PERMISSIONS",
      description: `Saved permissions for ${
        selectedRole?.role_name || "selected role"
      }`,
      severity: "warning",
      recordId: selectedRoleId,
      oldValue: {
        role_id: selectedRoleId,
        role_name: selectedRole?.role_name,
        permissions: oldRows,
      },
      newValue: {
        role_id: selectedRoleId,
        role_name: selectedRole?.role_name,
        permissions: rows,
      },
    });

    alert("Permissions saved.");
  };

  const assignEmployeeRole = async (employeeId: string, roleId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    const oldRole = roles.find((role) => role.id === employee?.system_role_id);
    const role = roles.find((role) => role.id === roleId);

    const { error } = await supabase
      .from("employees")
      .update({
        system_role_id: roleId || null,
      })
      .eq("id", employeeId)
      .eq("admin_access_enabled", true);

    if (error) {
      alert(error.message);
      return;
    }

    await getEmployees();

    await createAuditLog({
      action: "ASSIGN_EMPLOYEE_ROLE",
      description: `${employee?.first_name || ""} ${
        employee?.last_name || ""
      } assigned to ${role?.role_name || "No Access"}`,
      severity: "warning",
      recordId: employeeId,
      oldValue: {
        employee_id: employeeId,
        employee_name: `${employee?.first_name || ""} ${
          employee?.last_name || ""
        }`.trim(),
        role_id: employee?.system_role_id || null,
        role_name: oldRole?.role_name || "No Access",
      },
      newValue: {
        employee_id: employeeId,
        employee_name: `${employee?.first_name || ""} ${
          employee?.last_name || ""
        }`.trim(),
        role_id: roleId || null,
        role_name: role?.role_name || "No Access",
      },
    });
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <PageGuard moduleKey="user_roles">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB] px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                System Settings
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                User Roles
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Create roles, apply permission presets, assign admin access
                employees, and control OPSCORE module permissions.
              </p>
            </div>

            <button
              onClick={refreshData}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <SummaryCard
              icon={<ShieldCheck size={22} />}
              title="Roles"
              value={roles.length}
            />
            <SummaryCard
              icon={<Users size={22} />}
              title="Admin Access Employees"
              value={employees.length}
            />
            <SummaryCard
              icon={<ShieldCheck size={22} />}
              title="Selected Role"
              value={selectedRole?.role_name || "-"}
            />
          </section>

          <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-bold text-blue-700 shadow-sm">
            Only employees with Admin/System User Access enabled in Employee 201
            appear here. Normal employees do not need roles for portal,
            attendance, leave, or payslips.
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Create Role</h2>

              <div className="mt-5 space-y-3">
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Role name"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <input
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Description"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  onClick={createRole}
                  disabled={isSaving}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                >
                  <Plus size={16} />
                  Create Role
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <h2 className="text-xl font-black text-slate-950">Select Role</h2>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedRoleId === role.id
                        ? "border-slate-950 bg-slate-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <p className="font-black">{role.role_name}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {role.description || "No description"}
                    </p>
                  </button>
                ))}
              </div>

              {selectedRole && (
                <button
                  onClick={deleteRole}
                  className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
                >
                  <Trash2 size={16} />
                  Delete Selected Role
                </button>
              )}
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Module Permissions
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Use presets for faster setup, then fine-tune access per module.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    ["Full Access", grantFullAccess],
                    ["View Only", grantViewOnly],
                    ["Manager / Supervisor / Audit", applyManagerPreset],
                    ["Operations Manager", applyOperationsManagerPreset],
                    ["Payroll Preset", applyPayrollPreset],
                    ["HR Preset", applyHRPreset],
                    ["Front Office / Cashier", applyCashierPreset],
                  ].map(([label, handler]: any) => (
                    <button
                      key={label}
                      onClick={handler}
                      disabled={!selectedRoleId}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}

                  <button
                    onClick={clearAllPermissions}
                    disabled={!selectedRoleId}
                    className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <button
                onClick={savePermissions}
                disabled={isSaving || !selectedRoleId}
                className="flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={16} />
                Save Permissions
              </button>
            </div>

            <div className="overflow-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-slate-700">Module</th>
                    <th className="px-4 py-3 text-center">View</th>
                    <th className="px-4 py-3 text-center">Create</th>
                    <th className="px-4 py-3 text-center">Edit</th>
                    <th className="px-4 py-3 text-center">Delete</th>
                    <th className="px-4 py-3 text-center">Approve</th>
                    <th className="px-4 py-3 text-center">Release</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {modules.map((module) => (
                    <tr
                      key={module.key}
                      className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-black text-slate-950">
                        {module.label}
                      </td>

                      {[
                        "can_view",
                        "can_create",
                        "can_edit",
                        "can_delete",
                        "can_approve",
                        "can_release",
                      ].map((field) => (
                        <td key={field} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(rolePermissions[module.key]?.[field])}
                            onChange={(e) =>
                              updatePermissionLocal(
                                module.key,
                                field,
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-slate-950"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Assign Admin Employee Role
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Only employees enabled for Admin/System User Access in Employee
              201 are listed here.
            </p>

            <div className="mt-5 overflow-auto rounded-3xl border border-slate-200">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-slate-700">Department</th>
                    <th className="px-4 py-3 text-slate-700">Position</th>
                    <th className="px-4 py-3 text-slate-700">System Role</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-t border-slate-100 transition-all duration-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-black text-slate-950">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {employee.department || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {employee.position || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <select
                          value={employee.system_role_id || ""}
                          onChange={(e) =>
                            assignEmployeeRole(employee.id, e.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          <option value="">No Access</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.role_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}

                  {employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No admin access employees found. Enable Admin/System
                        User Access from Employee 201 first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-100 p-3 text-slate-700">
          {icon}
        </div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
      <h2 className="text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}






