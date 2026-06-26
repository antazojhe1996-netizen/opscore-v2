"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import { canAccessPage } from "@/lib/pageAccess";
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
        // Continue fallback.
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

  const getBadgeClass = (
    tone: "success" | "danger" | "warning" | "info" | "muted"
  ) => {
    if (tone === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (tone === "danger") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (tone === "warning") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (tone === "info") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  /// LOADERS
  const getEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, employee_no, first_name, last_name, email, department, position, employment_status"
      )
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
      .select(
        "id, auth_user_id, employee_id, username, company_id, is_active, must_change_password, last_login_at, created_at"
      )
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
    await Promise.all([
      getEmployees(),
      getRoles(),
      getUsers(),
      getCompanyUsers(),
    ]);
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
  const selectedEmployee =
    employees.find((item) => item.id === selectedEmployeeId) || null;

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
        `${employee.employee_no || ""} ${getEmployeeName(employee)} ${
          employee.department || ""
        } ${employee.position || ""} ${user?.username || ""} ${
          role?.role_name || ""
        }`
      );

      return searchable.includes(term);
    });
  }, [employeesWithUsers, searchTerm]);

  const activeUserCount = users.filter((item) => item.is_active).length;
  const inactiveUserCount = users.filter((item) => !item.is_active).length;

  const noCredentialCount = employees.filter(
    (employee) => !users.some((user) => user.employee_id === employee.id)
  ).length;

  const unlinkedAuthCount = users.filter((item) => !item.auth_user_id).length;

  const mustChangeCount = users.filter(
    (item) => item.must_change_password
  ).length;

  /// ACTIONS
  const toggleUserStatus = async (user: SystemUser) => {
    const employee = employees.find((item) => item.id === user.employee_id);
    const newStatus = !user.is_active;

    const confirmed = confirm(
      `${newStatus ? "Activate" : "Deactivate"} login access for ${getEmployeeName(
        employee
      )}?`
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
      description: `${newStatus ? "Activated" : "Deactivated"} login access for ${getEmployeeName(
        employee
      )}.`,
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
        : `Clear password-change requirement for ${getEmployeeName(employee)}?`
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
      action: nextValue
        ? "REQUIRE_PASSWORD_CHANGE"
        : "CLEAR_PASSWORD_CHANGE_REQUIREMENT",
      description: `${nextValue ? "Required" : "Cleared"} password-change flag for ${getEmployeeName(
        employee
      )}.`,
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
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Security
              </p>
              <h1 className="mt-2 text-xl font-black text-slate-950">
                Checking page access...
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Please wait while OPSCORE validates your permission.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!hasPageAccess) {
    return (
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
                <Lock size={26} />
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-red-700">
                Access Denied
              </p>
              <h1 className="mt-2 text-xl font-black text-slate-950">
                You cannot access this page.
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {accessMessage}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /// UI
  return (
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
<div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
          <section className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                System Security
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                User Credentials
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-medium text-slate-500">
                Manage OPSCORE account access. Passwords are handled securely by
                Supabase Auth; this page controls OPSCORE access flags and user
                linkage.
              </p>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              icon={<Users size={20} />}
              title="Employees"
              value={employees.length}
            />
            <SummaryCard
              icon={<UserCheck size={20} />}
              title="Active Users"
              value={activeUserCount}
            />
            <SummaryCard
              icon={<ShieldCheck size={20} />}
              title="Inactive Users"
              value={inactiveUserCount}
            />
            <SummaryCard
              icon={<KeyRound size={20} />}
              title="No OPSCORE User"
              value={noCredentialCount}
            />
            <SummaryCard
              icon={<AlertTriangle size={20} />}
              title="Unlinked Auth"
              value={unlinkedAuthCount}
              tone={unlinkedAuthCount > 0 ? "danger" : "default"}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Account Review
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Selected Account
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Select an employee from the list to review their OPSCORE
                  access.
                </p>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {selectedEmployee
                      ? getEmployeeName(selectedEmployee)
                      : "None selected"}
                  </h3>

                  {selectedEmployee && (
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {selectedEmployee.department || "No Dept"} Ã¢â‚¬Â¢{" "}
                      {selectedEmployee.position || "No Position"}
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <Row
                    label="Username"
                    value={selectedUser?.username || "No OPSCORE user"}
                  />
                  <Row
                    label="Auth Link"
                    value={selectedUser?.auth_user_id ? "Linked" : "Not linked"}
                    danger={!selectedUser?.auth_user_id}
                  />
                  <Row
                    label="Role"
                    value={selectedRole?.role_name || "No role assigned"}
                    danger={!selectedRole}
                  />
                  <Row
                    label="Status"
                    value={
                      selectedUser
                        ? selectedUser.is_active
                          ? "Active"
                          : "Inactive"
                        : "Not created"
                    }
                    danger={selectedUser ? !selectedUser.is_active : true}
                  />
                  <Row
                    label="Must Change Password"
                    value={selectedUser?.must_change_password ? "Yes" : "No"}
                    danger={Boolean(selectedUser?.must_change_password)}
                  />
                  <Row
                    label="Last Login"
                    value={
                      selectedUser?.last_login_at
                        ? new Date(selectedUser.last_login_at).toLocaleString(
                            "en-PH"
                          )
                        : "Never"
                    }
                  />
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Password Reset Note
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                    Do not store or reset passwords in system_users. Use
                    Supabase Authentication to create/reset Auth users, then
                    link auth_user_id to system_users.
                  </p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => selectedUser && toggleUserStatus(selectedUser)}
                    disabled={!selectedUser || saving}
                    className={
                      selectedUser?.is_active
                        ? "h-11 w-full rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        : "h-11 w-full rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    }
                  >
                    {selectedUser?.is_active
                      ? "Deactivate Access"
                      : "Activate Access"}
                  </button>

                  <button
                    onClick={() =>
                      selectedUser && toggleMustChangePassword(selectedUser)
                    }
                    disabled={!selectedUser || saving}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectedUser?.must_change_password
                      ? "Clear Password Change Requirement"
                      : "Require Password Change"}
                  </button>
                </div>
              </div>
            </aside>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Credential Registry
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Credential List
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Click an employee row to review or update their access
                      flags.
                    </p>
                  </div>

                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-slate-500 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <Search size={17} />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search employee, username, role..."
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 xl:w-80"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Auth</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Password Flag</th>
                      <th className="px-6 py-4">Last Login</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {filteredEmployees.map(({ employee, user, role }) => (
                      <tr
                        key={employee.id}
                        className="transition-all duration-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => quickSelectEmployee(employee)}
                            className="text-left"
                          >
                            <p className="font-black text-slate-950">
                              {getEmployeeName(employee)}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {employee.employee_no || "No employee no"}
                            </p>
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          {employee.department || "-"}
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {employee.position || "No position"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {role?.role_name || "No Access"}
                        </td>

                        <td className="px-6 py-4 font-black text-slate-950">
                          {user?.username || "No OPSCORE user"}
                        </td>

                        <td className="px-6 py-4">
                          {user?.auth_user_id ? (
                            <Badge label="Linked" tone="success" />
                          ) : (
                            <Badge label="Not linked" tone="danger" />
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {user ? (
                            <Badge
                              label={user.is_active ? "Active" : "Inactive"}
                              tone={user.is_active ? "success" : "danger"}
                            />
                          ) : (
                            <Badge label="Not Created" tone="muted" />
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {user?.must_change_password ? (
                            <Badge label="Required" tone="warning" />
                          ) : (
                            <Badge label="Clear" tone="muted" />
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {user?.last_login_at
                            ? new Date(user.last_login_at).toLocaleString(
                                "en-PH"
                              )
                            : "Never"}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => quickSelectEmployee(employee)}
                            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-14 text-center">
                          <h3 className="text-sm font-black text-slate-950">
                            No employees found.
                          </h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">
                            Try adjusting the search keyword or refresh the
                            records.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          {mustChangeCount > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-700">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Password Change Required
              </p>
              <p className="mt-2">
                {mustChangeCount} account(s) will be forced to change their
                password on next login.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  tone = "default",
}: {
  icon: any;
  title: string;
  value: any;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            tone === "danger"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {icon}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>
      </div>
      <h2 className="text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
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
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span
        className={`max-w-[220px] truncate text-right text-sm font-black ${
          danger ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "warning" | "muted";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  );
}






