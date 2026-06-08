"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { canAccessPage } from "@/app/lib/pageAccess";
import {
  AlertTriangle,
  KeyRound,
  Lock,
  RefreshCcw,
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
};

type SystemRole = {
  id: string;
  role_name: string;
  description?: string | null;
};

type SystemUser = {
  id: string;
  auth_user_id?: string | null;
  employee_id: string;
  username: string;
  company_id?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
};

type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string | null;
  is_active: boolean | null;
};

type AuditSeverity = "info" | "warning" | "critical";

export default function UserCredentialsPage() {
  /// STATES
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
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
        ? localStorage.getItem("opscore_current_user") ||
          localStorage.getItem("opscore_current_employee")
        : null;

    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        return {
          id: parsed?.system_user_id || parsed?.id || null,
          name:
            parsed?.name ||
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
      .select("id, employee_no, first_name, last_name, email, department, position, employment_status")
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
      .select("id, role_name, description")
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
      .select("id, auth_user_id, employee_id, username, company_id, is_active, must_change_password, last_login_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET SYSTEM USERS ERROR:", error.message);
      return;
    }

    setUsers(data || []);
  };

  const getCompanyUsers = async () => {
    const { data, error } = await supabase
      .from("company_users")
      .select("id, company_id, user_id, role_id, is_active");

    if (error) {
      console.log("GET COMPANY USERS ERROR:", error.message);
      return;
    }

    setCompanyUsers(data || []);
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([getEmployees(), getRoles(), getUsers(), getCompanyUsers()]);
    setLoading(false);
  };

  /// EFFECTS
  useEffect(() => {
    const checkAccessAndLoad = async () => {
      const access = await canAccessPage("user_credentials");

      if (!access.allowed) {
        setAccessMessage(access.reason || "Access denied.");
        setHasPageAccess(false);
        setCheckingAccess(false);
        return;
      }

      setHasPageAccess(true);
      setCheckingAccess(false);
      await refreshData();
    };

    checkAccessAndLoad();
  }, []);

  /// CALCULATIONS
  const selectedEmployee = employees.find((item) => item.id === selectedEmployeeId) || null;
  const selectedUser = selectedEmployee
    ? users.find((item) => item.employee_id === selectedEmployee.id) || null
    : null;
  const selectedCompanyUser = selectedUser
    ? companyUsers.find((item) => item.user_id === selectedUser.id) || null
    : null;
  const selectedRole = selectedCompanyUser?.role_id
    ? roles.find((item) => item.id === selectedCompanyUser.role_id) || null
    : null;

  const employeesWithUsers = useMemo(() => {
    return employees.map((employee) => {
      const user = users.find((item) => item.employee_id === employee.id) || null;
      const companyUser = user
        ? companyUsers.find((item) => item.user_id === user.id) || null
        : null;
      const role = companyUser?.role_id
        ? roles.find((item) => item.id === companyUser.role_id) || null
        : null;

      return { employee, user, companyUser, role };
    });
  }, [employees, users, companyUsers, roles]);

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
  const unlinkedAuthCount = users.filter((item) => !item.auth_user_id).length;
  const mustChangeCount = users.filter((item) => item.must_change_password).length;

  /// ACTIONS
  const toggleUserStatus = async (user: SystemUser) => {
    const employee = employees.find((item) => item.id === user.employee_id);
    const newStatus = !user.is_active;

    const confirmed = confirm(
      `${newStatus ? "Activate" : "Deactivate"} login access for ${getEmployeeName(employee)}?`,
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase
      .from("system_users")
      .update({ is_active: newStatus })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      action: newStatus ? "ACTIVATE_USER_ACCESS" : "DEACTIVATE_USER_ACCESS",
      description: `${newStatus ? "Activated" : "Deactivated"} login access for ${getEmployeeName(employee)}.`,
      severity: "warning",
      recordId: user.id,
      oldValue: user,
      newValue: { ...user, is_active: newStatus },
    });

    await refreshData();
  };

  const toggleMustChangePassword = async (user: SystemUser) => {
    const employee = employees.find((item) => item.id === user.employee_id);
    const nextValue = !user.must_change_password;

    const confirmed = confirm(
      nextValue
        ? `Require ${getEmployeeName(employee)} to change password on next login?`
        : `Clear password-change requirement for ${getEmployeeName(employee)}?`,
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase
      .from("system_users")
      .update({ must_change_password: nextValue })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      action: nextValue ? "REQUIRE_PASSWORD_CHANGE" : "CLEAR_PASSWORD_CHANGE_REQUIREMENT",
      description: `${nextValue ? "Required" : "Cleared"} password-change flag for ${getEmployeeName(employee)}.`,
      severity: "warning",
      recordId: user.id,
      oldValue: user,
      newValue: { ...user, must_change_password: nextValue },
    });

    await refreshData();
  };

  const quickSelectEmployee = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
  };

  /// UI GUARDS
  if (checkingAccess) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-300">
            Checking page access...
          </div>
        </main>
      </div>
    );
  }

  if (!hasPageAccess) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <Lock className="mx-auto text-red-300" size={36} />
            <h1 className="mt-4 text-2xl font-black text-red-200">Access Denied</h1>
            <p className="mt-2 text-sm text-red-100/80">{accessMessage}</p>
          </div>
        </main>
      </div>
    );
  }

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
              Manage OPSCORE account access. Passwords are handled securely by Supabase Auth; this page only controls OPSCORE access flags and user linkage.
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

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-5">
          <SummaryCard icon={<Users size={22} />} title="Employees" value={employees.length} />
          <SummaryCard icon={<UserCheck size={22} />} title="Active Users" value={activeUserCount} />
          <SummaryCard icon={<ShieldCheck size={22} />} title="Inactive Users" value={inactiveUserCount} />
          <SummaryCard icon={<KeyRound size={22} />} title="No OPSCORE User" value={noCredentialCount} />
          <SummaryCard icon={<AlertTriangle size={22} />} title="Unlinked Auth" value={unlinkedAuthCount} danger={unlinkedAuthCount > 0} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Selected Account</h2>
            <p className="mt-1 text-sm text-slate-400">
              Select an employee from the list to review their OPSCORE access.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Employee</p>
                <h3 className="mt-2 text-lg font-black text-white">
                  {selectedEmployee ? getEmployeeName(selectedEmployee) : "None selected"}
                </h3>
                {selectedEmployee && (
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedEmployee.department || "No Dept"} • {selectedEmployee.position || "No Position"}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
                <Row label="Username" value={selectedUser?.username || "No OPSCORE user"} />
                <Row label="Auth Link" value={selectedUser?.auth_user_id ? "Linked" : "Not linked"} danger={!selectedUser?.auth_user_id} />
                <Row label="Role" value={selectedRole?.role_name || "No role assigned"} danger={!selectedRole} />
                <Row label="Status" value={selectedUser ? (selectedUser.is_active ? "Active" : "Inactive") : "Not created"} danger={selectedUser ? !selectedUser.is_active : true} />
                <Row label="Must Change Password" value={selectedUser?.must_change_password ? "Yes" : "No"} danger={Boolean(selectedUser?.must_change_password)} />
                <Row label="Last Login" value={selectedUser?.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString("en-PH") : "Never"} />
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">
                <p className="font-black">Password reset note</p>
                <p className="mt-1">
                  Do not store or reset passwords in system_users. Use Supabase Authentication to create/reset Auth users, then link auth_user_id to system_users.
                </p>
              </div>

              <button
                onClick={() => selectedUser && toggleUserStatus(selectedUser)}
                disabled={!selectedUser || saving}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50 ${
                  selectedUser?.is_active
                    ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                {selectedUser?.is_active ? "Deactivate Access" : "Activate Access"}
              </button>

              <button
                onClick={() => selectedUser && toggleMustChangePassword(selectedUser)}
                disabled={!selectedUser || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {selectedUser?.must_change_password
                  ? "Clear Password Change Requirement"
                  : "Require Password Change"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Credential List</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Click an employee row to review or update their access flags.
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
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Auth</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Password Flag</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map(({ employee, user, role }) => (
                    <tr key={employee.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <button onClick={() => quickSelectEmployee(employee)} className="text-left">
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
                        {user?.username || "No OPSCORE user"}
                      </td>
                      <td className="px-4 py-3">
                        {user?.auth_user_id ? (
                          <Badge label="Linked" tone="success" />
                        ) : (
                          <Badge label="Not linked" tone="danger" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user ? (
                          <Badge label={user.is_active ? "Active" : "Inactive"} tone={user.is_active ? "success" : "danger"} />
                        ) : (
                          <Badge label="Not Created" tone="muted" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.must_change_password ? (
                          <Badge label="Required" tone="warning" />
                        ) : (
                          <Badge label="Clear" tone="muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {user?.last_login_at
                          ? new Date(user.last_login_at).toLocaleString("en-PH")
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => quickSelectEmployee(employee)}
                          className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {mustChangeCount > 0 && (
          <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
            <p className="font-black text-yellow-300">Password Change Required</p>
            <p className="mt-1">
              {mustChangeCount} account(s) will be forced to change their password on next login.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  danger = false,
}: {
  icon: any;
  title: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${danger ? "border-red-500/30 bg-red-500/10" : "border-slate-800 bg-slate-900"}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`rounded-full p-3 ${danger ? "bg-red-500/10 text-red-300" : "bg-slate-800 text-amber-400"}`}>{icon}</div>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
      <h2 className="text-2xl font-black">{value}</h2>
    </div>
  );
}

function Row({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-2 last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className={`max-w-[220px] truncate text-right font-bold ${danger ? "text-red-300" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "success" | "danger" | "warning" | "muted" }) {
  const className =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "danger"
      ? "bg-red-500/10 text-red-400"
      : tone === "warning"
      ? "bg-yellow-500/10 text-yellow-300"
      : "bg-slate-800 text-slate-400";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}
