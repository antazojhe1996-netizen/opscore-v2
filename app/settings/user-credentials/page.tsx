"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import {
  KeyRound,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

type Employee = {
  id: string;
  employee_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status?: string | null;
  system_role_id?: string | null;
};

type SystemRole = {
  id: string;
  role_name: string;
  description?: string | null;
};

type SystemUser = {
  id: string;
  employee_id: string;
  username: string;
  password: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
};

type AuditSeverity = "info" | "warning" | "critical";

export default function UserCredentialsPage() {
  /// STATES
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("Temp123!");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /// HELPERS
  const getEmployeeName = (employee?: Employee | null) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
    "Unnamed Employee";

  const normalize = (value: any) => String(value || "").trim().toLowerCase();

  const getCurrentUser = async () => {
    const localUser =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee")
        : null;

    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        return {
          id: parsed?.id || null,
          name:
            `${parsed?.first_name || ""} ${parsed?.last_name || ""}`.trim() ||
            parsed?.username ||
            "Unknown User",
        };
      } catch {
        // continue fallback
      }
    }

    return { id: null, name: "Unknown User" };
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
      module: "User Credentials",
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    });

    if (error) console.log("USER CREDENTIALS AUDIT ERROR:", error.message);
  };

  /// LOADERS
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
  };

  const getUsers = async () => {
    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET SYSTEM USERS ERROR:", error.message);
      return;
    }

    setUsers(data || []);
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([getEmployees(), getRoles(), getUsers()]);
    setLoading(false);
  };

  /// EFFECTS
  useEffect(() => {
    refreshData();
  }, []);

  /// CALCULATIONS
  const selectedEmployee = employees.find((item) => item.id === selectedEmployeeId);

  const employeesWithUsers = useMemo(() => {
    return employees.map((employee) => {
      const user = users.find((item) => item.employee_id === employee.id) || null;
      const role = roles.find((item) => item.id === employee.system_role_id) || null;

      return { employee, user, role };
    });
  }, [employees, users, roles]);

  const filteredEmployees = useMemo(() => {
    const term = normalize(searchTerm);

    return employeesWithUsers.filter(({ employee, user, role }) => {
      const searchable = normalize(
        `${employee.employee_no || ""} ${getEmployeeName(employee)} ${employee.department || ""} ${employee.position || ""} ${user?.username || ""} ${role?.role_name || ""}`,
      );

      return searchable.includes(term);
    });
  }, [employeesWithUsers, searchTerm]);

  const activeUserCount = users.filter((item) => item.is_active).length;
  const inactiveUserCount = users.filter((item) => !item.is_active).length;
  const noCredentialCount = employees.filter(
    (employee) => !users.some((user) => user.employee_id === employee.id),
  ).length;

  /// ACTIONS
  const resetForm = () => {
    setSelectedEmployeeId("");
    setUsername("");
    setPassword("Temp123!");
  };

  const createOrResetCredential = async () => {
    if (!selectedEmployeeId) {
      alert("Select employee first.");
      return;
    }

    if (!username.trim() || !password.trim()) {
      alert("Username and temporary password are required.");
      return;
    }

    const employee = employees.find((item) => item.id === selectedEmployeeId);
    const existingUser = users.find((item) => item.employee_id === selectedEmployeeId);
    const usernameExists = users.find(
      (item) =>
        normalize(item.username) === normalize(username) &&
        item.employee_id !== selectedEmployeeId,
    );

    if (usernameExists) {
      alert("Username already exists. Please use another username.");
      return;
    }

    const payload = {
      employee_id: selectedEmployeeId,
      username: username.trim(),
      password: password.trim(),
      is_active: true,
      must_change_password: true,
    };

    const confirmed = confirm(
      existingUser
        ? `Reset credentials for ${getEmployeeName(employee)}?`
        : `Create credentials for ${getEmployeeName(employee)}?`,
    );

    if (!confirmed) return;

    setSaving(true);

    const result = existingUser
      ? await supabase.from("system_users").update(payload).eq("id", existingUser.id).select().single()
      : await supabase.from("system_users").insert(payload).select().single();

    setSaving(false);

    if (result.error) {
      console.log("SAVE USER CREDENTIAL ERROR:", result.error.message);
      alert(result.error.message);
      return;
    }

    await createAuditLog({
      action: existingUser ? "RESET_USER_CREDENTIAL" : "CREATE_USER_CREDENTIAL",
      description: `${existingUser ? "Reset" : "Created"} login credential for ${getEmployeeName(employee)}.`,
      severity: "warning",
      recordId: result.data?.id || existingUser?.id || null,
      oldValue: existingUser,
      newValue: { ...result.data, password: "[hidden]" },
    });

    resetForm();
    await refreshData();
    alert(existingUser ? "Credential reset." : "Credential created.");
  };

  const toggleUserStatus = async (user: SystemUser) => {
    const employee = employees.find((item) => item.id === user.employee_id);
    const newStatus = !user.is_active;

    const { error } = await supabase
      .from("system_users")
      .update({ is_active: newStatus })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      action: newStatus ? "ACTIVATE_USER_CREDENTIAL" : "DEACTIVATE_USER_CREDENTIAL",
      description: `${newStatus ? "Activated" : "Deactivated"} login credential for ${getEmployeeName(employee)}.`,
      severity: "warning",
      recordId: user.id,
      oldValue: user,
      newValue: { ...user, is_active: newStatus, password: "[hidden]" },
    });

    await refreshData();
  };

  const quickFillFromEmployee = (employee: Employee, user?: SystemUser | null) => {
    const firstName = normalize(employee.first_name).replace(/[^a-z0-9]/g, "");
    const employeeNo = normalize(employee.employee_no).replace(/[^a-z0-9]/g, "");

    setSelectedEmployeeId(employee.id);
    setUsername(user?.username || firstName || employeeNo);
    setPassword("Temp123!");
  };

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Security
            </p>
            <h1 className="mt-2 text-4xl font-black">User Credentials</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-400">
              Create controlled beta accounts, reset temporary passwords, and activate or deactivate login access.
            </p>
          </div>

          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900 disabled:opacity-50"
          >
            <RefreshCcw size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
          <SummaryCard icon={<Users size={22} />} title="Employees" value={employees.length} />
          <SummaryCard icon={<UserCheck size={22} />} title="Active Users" value={activeUserCount} />
          <SummaryCard icon={<ShieldCheck size={22} />} title="Inactive Users" value={inactiveUserCount} />
          <SummaryCard icon={<KeyRound size={22} />} title="No Credentials" value={noCredentialCount} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Create / Reset Login</h2>
            <p className="mt-1 text-sm text-slate-400">
              Use temporary password for beta users. Recommended: Temp123!
            </p>

            <div className="mt-5 space-y-3">
              <select
                value={selectedEmployeeId}
                onChange={(event) => {
                  const employeeId = event.target.value;
                  const employee = employees.find((item) => item.id === employeeId);
                  const user = users.find((item) => item.employee_id === employeeId);

                  setSelectedEmployeeId(employeeId);
                  if (employee) quickFillFromEmployee(employee, user);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeName(employee)} • {employee.department || "No Dept"}
                  </option>
                ))}
              </select>

              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Temporary password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
              />

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-100">
                Selected: <span className="font-black">{selectedEmployee ? getEmployeeName(selectedEmployee) : "None"}</span>
                <br />
                Role is managed in <span className="font-black">User Roles</span>.
              </div>

              <button
                onClick={createOrResetCredential}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Credential"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Credential List</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Click an employee row to edit or reset their login.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                <Search size={17} className="text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employee, username, role..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600 xl:w-80"
                />
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map(({ employee, user, role }) => (
                    <tr key={employee.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => quickFillFromEmployee(employee, user)}
                          className="text-left"
                        >
                          <p className="font-black text-white">{getEmployeeName(employee)}</p>
                          <p className="text-xs text-slate-500">{employee.employee_no || "No employee no"}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {employee.department || "-"}
                        <p className="text-xs text-slate-500">{employee.position || "No position"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{role?.role_name || "No Access"}</td>
                      <td className="px-4 py-3 font-bold text-amber-300">
                        {user?.username || "No credential"}
                      </td>
                      <td className="px-4 py-3">
                        {user ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              user.is_active
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-400">
                            Not Created
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {user?.last_login_at
                          ? new Date(user.last_login_at).toLocaleString("en-PH")
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user ? (
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className={`rounded-xl px-4 py-2 text-xs font-black ${
                              user.is_active
                                ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>
                        ) : (
                          <button
                            onClick={() => quickFillFromEmployee(employee, user)}
                            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
                          >
                            Create
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        No employees found.
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

function SummaryCard({ icon, title, value }: { icon: any; title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-slate-800 p-3 text-amber-400">{icon}</div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-black">{value}</h2>
    </div>
  );
}
