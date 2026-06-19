"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { Plus, ShieldCheck, Star, Trash2, UserCheck, Users } from "lucide-react";

const approvalRoles = [
  "MANAGER",
  "OWNER",
  "PAYROLL",
  "FINANCE",
  "SUPERVISOR",
  "OPERATIONS_MANAGER",
  "ADMIN",
];

const assignmentTypes = ["PRIMARY", "BACKUP"];

const normalizeText = (value: any) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeScope = (value: any) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const safeParseDepartmentScopes = (assignment: any): string[] => {
  const rawJson = assignment?.department_scopes;

  if (Array.isArray(rawJson)) {
    return rawJson.map(normalizeScope).filter(Boolean);
  }

  if (typeof rawJson === "string" && rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson);

      if (Array.isArray(parsed)) {
        return parsed.map(normalizeScope).filter(Boolean);
      }
    } catch (error) {
      return rawJson
        .split(",")
        .map(normalizeScope)
        .filter(Boolean);
    }
  }

  const legacyScope = normalizeScope(assignment?.department_scope);

  return legacyScope ? [legacyScope] : [];
};

const uniqueScopes = (values: string[]) =>
  Array.from(new Set(values.map(normalizeScope).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

export default function ApprovalAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const getEmployeeName = (employee: any) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();

  const getAssignedEmployee = (employeeId: string) =>
    employees.find((employee) => String(employee.id) === String(employeeId));

  const getApprovalAssignments = async () => {
    setIsLoading(true);

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("approval_assignments")
      .select("*")
      .order("approval_role", { ascending: true })
      .order("is_default", { ascending: false })
      .order("assignment_type", { ascending: true })
      .order("created_at", { ascending: true });

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, department, position, employment_status, payroll_active",
      )
      .order("first_name", { ascending: true });

    const { data: workflowData, error: workflowError } = await supabase
      .from("approval_workflows")
      .select("*")
      .eq("is_active", true)
      .order("module", { ascending: true })
      .order("workflow_name", { ascending: true });

    setIsLoading(false);

    if (assignmentError) {
      console.log("GET APPROVAL ASSIGNMENTS ERROR:", assignmentError.message);
      alert(
        "Failed to load approval assignments. Check approval_assignments table columns.",
      );
      return;
    }

    if (employeeError) {
      console.log(
        "GET EMPLOYEES FOR APPROVAL ASSIGNMENTS ERROR:",
        employeeError.message,
      );
      alert("Failed to load employees.");
      return;
    }

    if (workflowError) {
      console.log(
        "GET APPROVAL WORKFLOWS FOR ASSIGNMENTS ERROR:",
        workflowError.message,
      );
      setApprovalWorkflows([]);
    } else {
      setApprovalWorkflows(workflowData || []);
    }

    setAssignments(assignmentData || []);
    setEmployees(employeeData || []);
  };

  const addApprover = async (approvalRole: string) => {
    if (isSaving) return;

    const existingActiveForRole = assignments.filter(
      (assignment) =>
        assignment.approval_role === approvalRole &&
        assignment.is_active !== false,
    );

    const assignmentType =
      existingActiveForRole.length === 0 ? "PRIMARY" : "BACKUP";

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .insert({
        approval_role: approvalRole,
        employee_id: null,
        assignment_type: assignmentType,
        department_scope: "",
        department_scopes: [],
        is_default: existingActiveForRole.length === 0,
        is_active: true,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("ADD APPROVER ERROR:", error.message);
      alert("Failed to add approver.");
      return;
    }

    setAssignments((current) => [...current, data]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Add Approver Slot",
      description: `${approvalRole} ${assignmentType} approver slot added.`,
      severity: "warning",
      recordId: data.id,
      newValue: data,
    });
  };

  const updateAssignmentEmployee = async (assignment: any, employeeId: string) => {
    if (isSaving) return;

    const currentScopes = safeParseDepartmentScopes(assignment);

    const duplicate = assignments.find((item) => {
      if (item.id === assignment.id) return false;
      if (item.is_active === false) return false;
      if (item.approval_role !== assignment.approval_role) return false;
      if (String(item.employee_id || "") !== String(employeeId || "")) return false;
      if (!employeeId) return false;

      const itemScopes = safeParseDepartmentScopes(item);
      const sameScopes =
        JSON.stringify(uniqueScopes(itemScopes)) ===
        JSON.stringify(uniqueScopes(currentScopes));

      const sameDefault =
        Boolean(item.is_default) === Boolean(assignment.is_default);

      return sameScopes && sameDefault;
    });

    if (duplicate) {
      alert("This employee is already assigned to this role and same department/default scope.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update({
        employee_id: employeeId || null,
      })
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("UPDATE APPROVAL ASSIGNMENT ERROR:", error.message);
      alert("Failed to update approval assignment.");
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? data : item)),
    );

    const selectedEmployee = employees.find(
      (employee) => String(employee.id) === String(employeeId),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Update Approval Assignment",
      description: `${assignment.approval_role} ${
        assignment.assignment_type || "APPROVER"
      } assigned to ${
        selectedEmployee ? getEmployeeName(selectedEmployee) : "Unassigned"
      }`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: {
        ...data,
        assignedEmployee: selectedEmployee || null,
      },
    });
  };

  const updateAssignmentType = async (assignment: any, assignmentType: string) => {
    if (isSaving) return;

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update({
        assignment_type: assignmentType,
      })
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("UPDATE ASSIGNMENT TYPE ERROR:", error.message);
      alert("Failed to update approver type.");
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? data : item)),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Update Approver Type",
      description: `${assignment.approval_role} approver type changed to ${assignmentType}.`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: data,
    });
  };

  const updateDepartmentScopes = async (assignment: any, nextScopes: string[]) => {
    if (isSaving) return;

    const cleanScopes = uniqueScopes(nextScopes);
    const legacyScope = cleanScopes.length === 1 ? cleanScopes[0] : "";

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update({
        department_scopes: cleanScopes,
        department_scope: legacyScope,
        is_default: cleanScopes.length > 0 ? false : Boolean(assignment.is_default),
      })
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("UPDATE DEPARTMENT SCOPES ERROR:", error.message);
      alert("Failed to update department scopes.");
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? data : item)),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Update Department Scopes",
      description: `${assignment.approval_role} scopes changed to ${
        cleanScopes.length > 0 ? cleanScopes.join(", ") : "All / No scope"
      }.`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: data,
    });
  };

  const toggleDepartmentScope = async (assignment: any, department: string) => {
    const scopes = safeParseDepartmentScopes(assignment);
    const normalizedDepartment = normalizeScope(department);

    const nextScopes = scopes.some(
      (scope) => normalizeText(scope) === normalizeText(normalizedDepartment),
    )
      ? scopes.filter(
          (scope) => normalizeText(scope) !== normalizeText(normalizedDepartment),
        )
      : [...scopes, normalizedDepartment];

    await updateDepartmentScopes(assignment, nextScopes);
  };

  const clearDepartmentScopes = async (assignment: any) => {
    await updateDepartmentScopes(assignment, []);
  };

  const toggleDefaultApprover = async (assignment: any) => {
    if (isSaving) return;

    const nextDefault = !Boolean(assignment.is_default);

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update({
        is_default: nextDefault,
        department_scope: nextDefault ? "" : assignment.department_scope || "",
        department_scopes: nextDefault
          ? []
          : safeParseDepartmentScopes(assignment),
      })
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("TOGGLE DEFAULT APPROVER ERROR:", error.message);
      alert("Failed to update default approver.");
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? data : item)),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Toggle Default Approver",
      description: `${assignment.approval_role} default approver ${
        nextDefault ? "enabled" : "disabled"
      }.`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: data,
    });
  };

  const toggleAssignmentStatus = async (assignment: any) => {
    if (isSaving) return;

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update({
        is_active: !assignment.is_active,
      })
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("TOGGLE APPROVAL ASSIGNMENT STATUS ERROR:", error.message);
      alert("Failed to update assignment status.");
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? data : item)),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Toggle Approval Assignment",
      description: `${assignment.approval_role} assignment ${
        data.is_active ? "activated" : "deactivated"
      }`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: data,
    });
  };

  const removeAssignment = async (assignment: any) => {
    if (isSaving) return;

    const confirmed = confirm(
      `Remove this ${assignment.approval_role} approver assignment?`,
    );

    if (!confirmed) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("approval_assignments")
      .delete()
      .eq("id", assignment.id);

    setIsSaving(false);

    if (error) {
      console.log("REMOVE APPROVER ERROR:", error.message);
      alert("Failed to remove approver.");
      return;
    }

    setAssignments((current) =>
      current.filter((item) => item.id !== assignment.id),
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Remove Approver Assignment",
      description: `${assignment.approval_role} approver assignment removed.`,
      severity: "critical",
      recordId: assignment.id,
      oldValue: assignment,
    });
  };

  const getWorkflowsForRole = (approvalRole: string) =>
    approvalWorkflows.filter(
      (workflow) =>
        String(workflow.approver_role || "") === String(approvalRole) &&
        workflow.is_active !== false,
    );

  useEffect(() => {
    getApprovalAssignments();
  }, []);

  const activeEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const employmentStatus = String(employee.employment_status || "").toLowerCase();

      return (
        employee.payroll_active === true ||
        employmentStatus === "active" ||
        employmentStatus === ""
      );
    });
  }, [employees]);

  const departmentOptions = useMemo(() => {
    const departments = employees
      .map((employee) => normalizeScope(employee.department))
      .filter(Boolean);

    return Array.from(new Set(departments)).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [employees]);

  const groupedAssignments = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return approvalRoles
      .map((role) => {
        const roleAssignments = assignments.filter((assignment) => {
          const assignedEmployee = getAssignedEmployee(assignment.employee_id);
          const employeeName = assignedEmployee
            ? getEmployeeName(assignedEmployee)
            : "";
          const scopes = safeParseDepartmentScopes(assignment).join(" ");
          const defaultText = assignment.is_default ? "default approver fallback" : "";

          const matchesRole = String(assignment.approval_role || "") === role;
          const matchesSearch =
            !search ||
            role.toLowerCase().includes(search) ||
            employeeName.toLowerCase().includes(search) ||
            scopes.toLowerCase().includes(search) ||
            defaultText.includes(search) ||
            String(assignedEmployee?.department || "")
              .toLowerCase()
              .includes(search) ||
            String(assignedEmployee?.position || "")
              .toLowerCase()
              .includes(search);

          return matchesRole && matchesSearch;
        });

        return {
          role,
          assignments: roleAssignments,
        };
      })
      .filter(
        (group) =>
          !search ||
          group.assignments.length > 0 ||
          group.role.toLowerCase().includes(search),
      );
  }, [assignments, employees, searchTerm]);

  const assignedCount = assignments.filter((item) => item.employee_id).length;

  const activeApproverCount = assignments.filter(
    (item) => item.is_active !== false && item.employee_id,
  ).length;

  const departmentScopedCount = assignments.filter(
    (item) =>
      item.is_active !== false &&
      item.employee_id &&
      safeParseDepartmentScopes(item).length > 0,
  ).length;

  const defaultApproverCount = assignments.filter(
    (item) =>
      item.is_active !== false &&
      item.employee_id &&
      Boolean(item.is_default),
  ).length;

  return (
    <PageGuard moduleKey="approval_assignments">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="SYSTEM / APPROVAL ASSIGNMENTS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    SYSTEM
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Approval Assignments
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Assign role approvers with multiple department scopes. Leave
                    and OT can route to managers handling several departments,
                    then fall back to a default approver when no match exists.
                  </p>
                </div>

                <button
                  onClick={getApprovalAssignments}
                  disabled={isLoading}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Approval Roles"
                value={approvalRoles.length}
                icon={<ShieldCheck className="h-5 w-5 text-slate-500" />}
              />
              <SummaryCard
                title="Active Approvers"
                value={activeApproverCount}
                icon={<Users className="h-5 w-5 text-blue-700" />}
              />
              <SummaryCard
                title="Scoped Approvers"
                value={departmentScopedCount}
                icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
              />
              <SummaryCard
                title="Default Fallbacks"
                value={defaultApproverCount}
                icon={<Star className="h-5 w-5 text-amber-600" />}
              />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Assignment Matrix
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Role Approvers by Department
                    </h2>
                    <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                      Select multiple departments per approver. Default approvers
                      cannot have department scopes and are used only as fallback.
                    </p>
                  </div>

                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search role, department, or employee..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 lg:w-96"
                  />
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                    <p className="text-sm font-black text-slate-950">
                      Loading approval assignments...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {groupedAssignments.map((group) => {
                      const activeRoleApprovers = group.assignments.filter(
                        (assignment) =>
                          assignment.is_active !== false &&
                          assignment.employee_id,
                      );

                      const workflowsForRole = getWorkflowsForRole(group.role);

                      return (
                        <div
                          key={group.role}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="border-b border-slate-100 p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                    {group.role}
                                  </span>

                                  {activeRoleApprovers.length > 0 ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                      {activeRoleApprovers.length} active approver
                                      {activeRoleApprovers.length > 1 ? "s" : ""}
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                      No active approver
                                    </span>
                                  )}
                                </div>

                                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                                  Requests needing {group.role} approval can
                                  route by employee department or default
                                  fallback.
                                </p>

                                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                      Approves
                                    </p>

                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                      {workflowsForRole.length} workflow
                                      {workflowsForRole.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>

                                  {workflowsForRole.length === 0 ? (
                                    <p className="text-sm font-medium text-slate-500">
                                      No active workflows assigned to this role.
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {workflowsForRole.map((workflow) => (
                                        <span
                                          key={workflow.id}
                                          title={workflow.workflow_key}
                                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
                                        >
                                          {workflow.workflow_name ||
                                            workflow.workflow_key}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => addApprover(group.role)}
                                disabled={isSaving}
                                className="flex h-11 w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Plus size={16} />
                                Add Approver
                              </button>
                            </div>
                          </div>

                          <div className="overflow-auto">
                            <table className="w-full min-w-[1380px]">
                              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                <tr>
                                  <th className="px-6 py-4">Approver Type</th>
                                  <th className="px-6 py-4">Department Scopes</th>
                                  <th className="px-6 py-4">Default</th>
                                  <th className="px-6 py-4">Assigned Employee</th>
                                  <th className="px-6 py-4">Employee Dept.</th>
                                  <th className="px-6 py-4">Position</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4">Active</th>
                                  <th className="px-6 py-4 text-right">Remove</th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                                {group.assignments.length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="px-6 py-14 text-center">
                                      <p className="text-sm font-black text-slate-950">
                                        No approvers yet
                                      </p>
                                      <p className="mt-1 text-sm font-medium text-slate-500">
                                        Click Add Approver to create an assignment
                                        slot.
                                      </p>
                                    </td>
                                  </tr>
                                ) : (
                                  group.assignments.map((assignment) => {
                                    const assignedEmployee = getAssignedEmployee(
                                      assignment.employee_id,
                                    );
                                    const scopes = safeParseDepartmentScopes(assignment);

                                    return (
                                      <tr
                                        key={assignment.id}
                                        className="transition-all duration-200 hover:bg-slate-50"
                                      >
                                        <td className="px-6 py-4 align-top">
                                          <select
                                            value={assignment.assignment_type || "BACKUP"}
                                            disabled={
                                              isSaving ||
                                              assignment.is_active === false
                                            }
                                            onChange={(event) =>
                                              updateAssignmentType(
                                                assignment,
                                                event.target.value,
                                              )
                                            }
                                            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {assignmentTypes.map((type) => (
                                              <option key={type} value={type}>
                                                {type}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                {scopes.length} selected
                                              </p>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  clearDepartmentScopes(assignment)
                                                }
                                                disabled={
                                                  isSaving ||
                                                  assignment.is_active === false ||
                                                  Boolean(assignment.is_default) ||
                                                  scopes.length === 0
                                                }
                                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                              >
                                                Clear
                                              </button>
                                            </div>

                                            {assignment.is_default ? (
                                              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-700">
                                                Default fallback approver. Department scopes are disabled.
                                              </div>
                                            ) : departmentOptions.length === 0 ? (
                                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">
                                                No employee departments found.
                                              </div>
                                            ) : (
                                              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                                {departmentOptions.map((department) => {
                                                  const checked = scopes.some(
                                                    (scope) =>
                                                      normalizeText(scope) ===
                                                      normalizeText(department),
                                                  );

                                                  return (
                                                    <label
                                                      key={department}
                                                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                                        checked
                                                          ? "border-blue-200 bg-blue-50 text-blue-700"
                                                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                                      } ${
                                                        isSaving ||
                                                        assignment.is_active === false
                                                          ? "cursor-not-allowed opacity-50"
                                                          : ""
                                                      }`}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={
                                                          isSaving ||
                                                          assignment.is_active === false
                                                        }
                                                        onChange={() =>
                                                          toggleDepartmentScope(
                                                            assignment,
                                                            department,
                                                          )
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300"
                                                      />
                                                      <span className="truncate">
                                                        {department}
                                                      </span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {scopes.length > 0 && (
                                              <div className="mt-3 flex flex-wrap gap-2">
                                                {scopes.map((scope) => (
                                                  <span
                                                    key={scope}
                                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700"
                                                  >
                                                    {scope}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          <button
                                            onClick={() =>
                                              toggleDefaultApprover(assignment)
                                            }
                                            disabled={
                                              isSaving ||
                                              assignment.is_active === false
                                            }
                                            className={
                                              assignment.is_default
                                                ? "inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                : "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                            }
                                          >
                                            <Star size={13} />
                                            {assignment.is_default ? "Default" : "Set"}
                                          </button>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          <select
                                            value={assignment.employee_id || ""}
                                            disabled={
                                              isSaving ||
                                              assignment.is_active === false
                                            }
                                            onChange={(event) =>
                                              updateAssignmentEmployee(
                                                assignment,
                                                event.target.value,
                                              )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <option value="">Unassigned</option>
                                            {activeEmployees.map((employee) => (
                                              <option
                                                key={employee.id}
                                                value={employee.id}
                                              >
                                                {getEmployeeName(employee)} —{" "}
                                                {employee.department ||
                                                  "No Department"}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          {assignedEmployee?.department || "-"}
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          {assignedEmployee?.position || "-"}
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          {assignment.employee_id ? (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                              Assigned
                                            </span>
                                          ) : (
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                              Needs Assignment
                                            </span>
                                          )}
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                          <button
                                            onClick={() =>
                                              toggleAssignmentStatus(assignment)
                                            }
                                            disabled={isSaving}
                                            className={
                                              assignment.is_active === false
                                                ? "h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                : "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                            }
                                          >
                                            {assignment.is_active === false
                                              ? "Activate"
                                              : "Deactivate"}
                                          </button>
                                        </td>

                                        <td className="px-6 py-4 text-right align-top">
                                          <button
                                            onClick={() =>
                                              removeAssignment(assignment)
                                            }
                                            disabled={isSaving}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label="Remove assignment"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Department Routing Rule
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Multi Department Match First, Default Fallback Second
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-blue-700">
                    Leave and OT should route to an active approver where the
                    employee department is included in department_scopes. If no
                    department match exists, use the active default approver for
                    the same approval role.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PageGuard>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>
        {icon}
      </div>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}
