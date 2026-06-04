"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
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
  { key: "workforce", label: "Workforce" },
  { key: "employees", label: "Employees / 201" },
  { key: "scheduling", label: "Scheduling" },
  { key: "leave_management", label: "Leave Management" },
  { key: "forecasting", label: "Forecasting" },

  { key: "hotel_room_sales", label: "Hotel Room Sales" },
  { key: "apartment_sales", label: "Apartment Sales" },
  { key: "restaurant_sales", label: "Restaurant / Sports Bar Sales" },

  { key: "finance_dashboard", label: "Finance Dashboard" },
  { key: "expenses", label: "Expenses" },
  { key: "bills_monitoring", label: "Bills Monitoring" },
  { key: "cash_management", label: "Cash Management" },

  { key: "attendance", label: "Attendance Audit" },
  { key: "payroll_register", label: "Payroll Register" },
  { key: "payroll_manager", label: "Payroll Manager" },
  { key: "payslips", label: "Payslips" },
  { key: "payroll_snapshots", label: "Payroll Snapshots" },
  { key: "release_history", label: "Release History" },

  { key: "settings", label: "Settings" },
  { key: "user_roles", label: "User Roles" },
  { key: "backup_restore", label: "Backup & Restore" },
  { key: "activity_logs", label: "Activity Logs" },
];

const emptyPermission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_approve: false,
  can_release: false,
};

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
          permission.module_key === module.key
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
    (employee) => employee.system_role_id === selectedRoleId
  );

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
      .order("department", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.log("GET EMPLOYEES ERROR:", error.message);
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

    alert("Role created.");
  };

  const deleteRole = async () => {
    if (!selectedRoleId || !selectedRole) return;

    if (assignedEmployees.length > 0) {
      alert("Cannot delete role. Remove assigned employees first.");
      return;
    }

    const confirmed = confirm(`Delete role "${selectedRole.role_name}"?`);
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

    alert("Role deleted.");
  };

  const updatePermissionLocal = (
    moduleKey: string,
    field: string,
    value: boolean
  ) => {
    if (!selectedRoleId) return;

    const existing = permissions.find(
      (permission) =>
        permission.role_id === selectedRoleId &&
        permission.module_key === moduleKey
    );

    if (existing) {
      setPermissions((prev) =>
        prev.map((permission) =>
          permission.role_id === selectedRoleId &&
          permission.module_key === moduleKey
            ? { ...permission, [field]: value }
            : permission
        )
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

  const setRolePermissionsFromPreset = (
    builder: (moduleKey: string) => any
  ) => {
    if (!selectedRoleId) {
      alert("Select role first.");
      return;
    }

    const otherRolePermissions = permissions.filter(
      (permission) => permission.role_id !== selectedRoleId
    );

    const newRolePermissions = modules.map((module) => ({
      role_id: selectedRoleId,
      module_key: module.key,
      ...builder(module.key),
    }));

    setPermissions([...otherRolePermissions, ...newRolePermissions]);
  };

  const grantFullAccess = () => {
    setRolePermissionsFromPreset(() => ({
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_approve: true,
      can_release: true,
    }));
  };

  const grantViewOnly = () => {
    setRolePermissionsFromPreset(() => ({
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      can_release: false,
    }));
  };

  const clearAllPermissions = () => {
    setRolePermissionsFromPreset(() => ({
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      can_release: false,
    }));
  };

  const applyPayrollPreset = () => {
    const allowedView = [
      "dashboard",
      "attendance",
      "payroll_register",
      "payroll_manager",
      "payslips",
      "payroll_snapshots",
      "release_history",
    ];

    const allowedEdit = ["attendance", "payroll_register"];
    const allowedApprove = ["payroll_manager"];

    setRolePermissionsFromPreset((moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: moduleKey === "attendance",
      can_edit: allowedEdit.includes(moduleKey),
      can_delete: false,
      can_approve: allowedApprove.includes(moduleKey),
      can_release: false,
    }));
  };

  const applyHRPreset = () => {
    const allowedView = [
      "dashboard",
      "workforce",
      "employees",
      "scheduling",
      "leave_management",
      "forecasting",
    ];

    const allowedCreateEdit = ["employees", "scheduling", "leave_management"];

    setRolePermissionsFromPreset((moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedCreateEdit.includes(moduleKey),
      can_edit: allowedCreateEdit.includes(moduleKey),
      can_delete: false,
      can_approve: moduleKey === "leave_management",
      can_release: false,
    }));
  };

  const applyCashierPreset = () => {
    const allowedView = [
      "dashboard",
      "restaurant_sales",
      "expenses",
      "cash_management",
    ];

    const allowedCreateEdit = ["restaurant_sales", "expenses", "cash_management"];

    setRolePermissionsFromPreset((moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: allowedCreateEdit.includes(moduleKey),
      can_edit: allowedCreateEdit.includes(moduleKey),
      can_delete: false,
      can_approve: false,
      can_release: false,
    }));
  };

  const applyManagerPreset = () => {
    const allowedView = [
      "dashboard",
      "workforce",
      "employees",
      "scheduling",
      "leave_management",
      "finance_dashboard",
      "expenses",
      "attendance",
      "payroll_manager",
      "payslips",
      "payroll_snapshots",
      "release_history",
      "activity_logs",
    ];

    const allowedApprove = ["leave_management", "expenses", "payroll_manager"];

    setRolePermissionsFromPreset((moduleKey) => ({
      can_view: allowedView.includes(moduleKey),
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: allowedApprove.includes(moduleKey),
      can_release: moduleKey === "payroll_manager",
    }));
  };

  const savePermissions = async () => {
    if (!selectedRoleId) {
      alert("Select role first.");
      return;
    }

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

    alert("Permissions saved.");
  };

  const assignEmployeeRole = async (employeeId: string, roleId: string) => {
    const { error } = await supabase
      .from("employees")
      .update({
        system_role_id: roleId || null,
      })
      .eq("id", employeeId);

    if (error) {
      alert(error.message);
      return;
    }

    await getEmployees();
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Settings
            </p>

            <h1 className="mt-2 text-4xl font-black">User Roles</h1>

            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Create roles, apply permission presets, assign employees, and
              control access per module.
            </p>
          </div>

          <button
            onClick={refreshData}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
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
            title="Employees"
            value={employees.length}
          />

          <SummaryCard
            icon={<ShieldCheck size={22} />}
            title="Selected Role"
            value={selectedRole?.role_name || "-"}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Create Role</h2>

            <div className="mt-5 space-y-3">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <button
                onClick={createRole}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                <Plus size={16} />
                Create Role
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <h2 className="text-xl font-bold">Select Role</h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedRoleId === role.id
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-slate-800 bg-slate-950 hover:border-slate-600"
                  }`}
                >
                  <p className="font-black">{role.role_name}</p>

                  <p className="mt-1 text-sm text-slate-400">
                    {role.description || "No description"}
                  </p>
                </button>
              ))}
            </div>

            {selectedRole && (
              <button
                onClick={deleteRole}
                className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-500/20"
              >
                <Trash2 size={16} />
                Delete Selected Role
              </button>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-bold">Module Permissions</h2>

              <p className="mt-1 text-sm text-slate-400">
                Use presets for faster setup, then fine-tune access per module.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={grantFullAccess}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  Full Access
                </button>

                <button
                  onClick={grantViewOnly}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  View Only
                </button>

                <button
                  onClick={applyManagerPreset}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Manager Preset
                </button>

                <button
                  onClick={applyPayrollPreset}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  Payroll Preset
                </button>

                <button
                  onClick={applyHRPreset}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  HR Preset
                </button>

                <button
                  onClick={applyCashierPreset}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Cashier Preset
                </button>

                <button
                  onClick={clearAllPermissions}
                  disabled={!selectedRoleId}
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            <button
              onClick={savePermissions}
              disabled={isSaving || !selectedRoleId}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Save size={16} />
              Save Permissions
            </button>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3 text-center">View</th>
                  <th className="px-4 py-3 text-center">Create</th>
                  <th className="px-4 py-3 text-center">Edit</th>
                  <th className="px-4 py-3 text-center">Delete</th>
                  <th className="px-4 py-3 text-center">Approve</th>
                  <th className="px-4 py-3 text-center">Release</th>
                </tr>
              </thead>

              <tbody>
                {modules.map((module) => (
                  <tr key={module.key} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-bold">{module.label}</td>

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
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 accent-amber-400"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Assign Employee Role</h2>

          <p className="mt-1 text-sm text-slate-400">
            Select which role each employee should use when accessing OPSCORE.
          </p>

          <div className="mt-5 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">System Role</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-bold">
                      {employee.first_name} {employee.last_name}
                    </td>

                    <td className="px-4 py-3">{employee.department || "-"}</td>

                    <td className="px-4 py-3">{employee.position || "-"}</td>

                    <td className="px-4 py-3">
                      <select
                        value={employee.system_role_id || ""}
                        onChange={(e) =>
                          assignEmployeeRole(employee.id, e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
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
                      No employees found.
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">{title}</p>
      </div>

      <h2 className="text-2xl font-black">{value}</h2>
    </div>
  );
}