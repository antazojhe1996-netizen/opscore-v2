"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import PageGuard from "@/components/PageGuard";
import { createAuditLog } from "@/lib/audit";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

const approvalRoles = [
  "MANAGER",
  "OWNER",
  "PAYROLL",
  "FINANCE",
  "SUPERVISOR",
  "OPERATIONS_MANAGER",
  "ADMIN",
];

const normalizeText = (value: any) =>
  String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const normalizeScope = (value: any) =>
  String(value || "").trim().replace(/\s+/g, " ");

const normalizeWorkflowKey = (value: any) =>
  String(value || "").trim().toUpperCase().replace(/\s+/g, "_");

const formatWorkflowName = (value: any) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isLegacyProtectedAssignment = (assignment: any) =>
  assignment?.workflow_keys === null ||
  assignment?.workflow_keys === undefined ||
  assignment?.workflow_keys === "";

const safeParseDepartmentScopes = (assignment: any): string[] => {
  const rawJson = assignment?.department_scopes;

  if (Array.isArray(rawJson)) return rawJson.map(normalizeScope).filter(Boolean);

  if (typeof rawJson === "string" && rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) return parsed.map(normalizeScope).filter(Boolean);
    } catch {
      return rawJson.split(/[,|\n]/g).map(normalizeScope).filter(Boolean);
    }
  }

  const legacyScope = normalizeScope(assignment?.department_scope);
  return legacyScope ? [legacyScope] : [];
};

const safeParseWorkflowKeys = (assignment: any): string[] => {
  const rawKeys = assignment?.workflow_keys;

  if (rawKeys === null || rawKeys === undefined || rawKeys === "") return [];

  if (Array.isArray(rawKeys)) return rawKeys.map(normalizeWorkflowKey).filter(Boolean);

  if (typeof rawKeys === "string") {
    const cleanText = rawKeys.trim();
    if (!cleanText) return [];

    if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) return parsed.map(normalizeWorkflowKey).filter(Boolean);
      } catch {}
    }

    return cleanText.split(/[,|\n]/g).map(normalizeWorkflowKey).filter(Boolean);
  }

  return [];
};

const uniqueScopes = (values: string[]) =>
  Array.from(new Set(values.map(normalizeScope).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

const uniqueWorkflowKeys = (values: string[]) =>
  Array.from(new Set(values.map(normalizeWorkflowKey).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

export default function ApprovalAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedApproverKey, setExpandedApproverKey] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<"types" | "departments" | null>(null);
  const [newAssignmentRole, setNewAssignmentRole] = useState("MANAGER");
  const [newAssignmentEmployeeId, setNewAssignmentEmployeeId] = useState("");

  const getEmployeeName = (employee: any) =>
    `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();

  const getAssignedEmployee = (employeeId: string) =>
    employees.find((employee) => String(employee.id) === String(employeeId));

  const getWorkflowDisplayName = (workflowKey: string) => {
    const normalizedKey = normalizeWorkflowKey(workflowKey);
    const workflow = approvalWorkflows.find(
      (item) => normalizeWorkflowKey(item.workflow_key) === normalizedKey,
    );

    return workflow?.workflow_name || formatWorkflowName(normalizedKey);
  };

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
      .select("id, first_name, last_name, department, position, employment_status, payroll_active")
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
      alert("Failed to load approval assignments.");
      return;
    }

    if (employeeError) {
      console.log("GET EMPLOYEES ERROR:", employeeError.message);
      alert("Failed to load employees.");
      return;
    }

    setAssignments(assignmentData || []);
    setEmployees(employeeData || []);
    setApprovalWorkflows(workflowError ? [] : workflowData || []);
  };

  useEffect(() => {
    getApprovalAssignments();
  }, []);

  const activeEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const employmentStatus = String(employee.employment_status || "").toLowerCase();
      return employee.payroll_active === true || employmentStatus === "active" || employmentStatus === "";
    });
  }, [employees]);

  const departmentOptions = useMemo(() => {
    const departments = employees.map((employee) => normalizeScope(employee.department)).filter(Boolean);
    return Array.from(new Set(departments)).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const activeWorkflowOptions = useMemo(() => {
    return approvalWorkflows
      .filter((workflow) => workflow.is_active !== false && workflow.workflow_key)
      .map((workflow) => ({
        ...workflow,
        normalizedKey: normalizeWorkflowKey(workflow.workflow_key),
        displayName: workflow.workflow_name || formatWorkflowName(workflow.workflow_key),
      }))
      .sort((a, b) => {
        const moduleCompare = String(a.module || "").localeCompare(String(b.module || ""));
        if (moduleCompare !== 0) return moduleCompare;
        return String(a.displayName || "").localeCompare(String(b.displayName || ""));
      });
  }, [approvalWorkflows]);

  const addAssignment = async () => {
    if (isSaving) return;

    if (!newAssignmentEmployeeId) {
      alert("Please select an approver.");
      return;
    }

    setIsSaving(true);

    const existingActiveForRole = assignments.filter(
      (assignment) => assignment.approval_role === newAssignmentRole && assignment.is_active !== false,
    );

    const assignmentType = existingActiveForRole.length === 0 ? "PRIMARY" : "BACKUP";

    const { data, error } = await supabase
      .from("approval_assignments")
      .insert({
        approval_role: newAssignmentRole,
        employee_id: newAssignmentEmployeeId,
        assignment_type: assignmentType,
        department_scope: "",
        department_scopes: [],
        workflow_keys: ["__EMPTY_SCOPED_ROW__"],
        is_default: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      setIsSaving(false);
      console.log("ADD APPROVER ERROR:", error.message);
      alert("Failed to add approver assignment.");
      return;
    }

    const { data: cleanedData, error: cleanError } = await supabase
      .from("approval_assignments")
      .update({ workflow_keys: [] })
      .eq("id", data.id)
      .select()
      .single();

    setIsSaving(false);

    if (cleanError) {
      console.log("CLEAN NEW ASSIGNMENT ERROR:", cleanError.message);
      alert("Approver created but failed to initialize scoped row.");
      await getApprovalAssignments();
      return;
    }

    setAssignments((current) => [...current, cleanedData]);
    setExpandedApproverKey(`employee:${newAssignmentEmployeeId}`);
    setEditMode("types");

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Add Approver Assignment",
      description: `${newAssignmentRole} ${assignmentType} scoped assignment added.`,
      severity: "warning",
      recordId: cleanedData.id,
      newValue: cleanedData,
    });
  };

  const updateAssignment = async (assignment: any, patch: Record<string, any>, action: string) => {
    if (isSaving) return null;

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .update(patch)
      .eq("id", assignment.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log(`${action.toUpperCase()} ERROR:`, error.message);
      alert(`Failed to update ${action.toLowerCase()}.`);
      return null;
    }

    setAssignments((current) => current.map((item) => (item.id === assignment.id ? data : item)));

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action,
      description: `${assignment.approval_role} assignment updated.`,
      severity: "warning",
      recordId: assignment.id,
      oldValue: assignment,
      newValue: data,
    });

    return data;
  };

  const createScopedAssignment = async (group: any) => {
    const sourceRow = group.assignments.find((item: any) => item.is_active !== false) || group.assignments[0];

    if (!sourceRow?.employee_id) {
      alert("Approver must be assigned to an employee first.");
      return null;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .insert({
        approval_role: sourceRow.approval_role || "MANAGER",
        employee_id: sourceRow.employee_id,
        assignment_type: "BACKUP",
        department_scope: "",
        department_scopes: [],
        workflow_keys: ["__EMPTY_SCOPED_ROW__"],
        is_default: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      setIsSaving(false);
      console.log("CREATE SCOPED ASSIGNMENT ERROR:", error.message);
      alert("Failed to create scoped approval row.");
      return null;
    }

    const { data: cleanedData, error: cleanError } = await supabase
      .from("approval_assignments")
      .update({ workflow_keys: [] })
      .eq("id", data.id)
      .select()
      .single();

    setIsSaving(false);

    if (cleanError) {
      console.log("CLEAN SCOPED ASSIGNMENT ERROR:", cleanError.message);
      alert("Scoped row created but failed to initialize.");
      await getApprovalAssignments();
      return null;
    }

    setAssignments((current) => [...current, cleanedData]);

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Create Scoped Approval Assignment",
      description: `Scoped workflow row created for ${group.employeeName}.`,
      severity: "warning",
      recordId: cleanedData.id,
      newValue: cleanedData,
    });

    return cleanedData;
  };

  const getEditableScopedAssignment = async (group: any) => {
    const existingScoped = group.assignments.find(
      (assignment: any) => !isLegacyProtectedAssignment(assignment),
    );

    if (existingScoped) return existingScoped;

    return await createScopedAssignment(group);
  };

  const removeScopedAssignment = async (assignment: any) => {
    if (isSaving) return;

    if (isLegacyProtectedAssignment(assignment)) {
      alert("Legacy protected row cannot be deleted here.");
      return;
    }

    const confirmed = confirm("Remove this scoped approval row?");
    if (!confirmed) return;

    setIsSaving(true);

    const { error } = await supabase.from("approval_assignments").delete().eq("id", assignment.id);

    setIsSaving(false);

    if (error) {
      console.log("REMOVE SCOPED ASSIGNMENT ERROR:", error.message);
      alert("Failed to remove scoped assignment.");
      return;
    }

    setAssignments((current) => current.filter((item) => item.id !== assignment.id));

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Remove Scoped Approval Assignment",
      description: `${assignment.approval_role} scoped assignment removed.`,
      severity: "critical",
      recordId: assignment.id,
      oldValue: assignment,
    });
  };

  const updateGroupWorkflowKeys = async (group: any, nextWorkflowKeys: string[]) => {
    const cleanWorkflowKeys = uniqueWorkflowKeys(nextWorkflowKeys);

    const scopedRows = group.assignments.filter(
      (assignment: any) => !isLegacyProtectedAssignment(assignment),
    );

    if (cleanWorkflowKeys.length === 0) {
      for (const row of scopedRows) {
        await removeScopedAssignment(row);
      }
      return;
    }

    const editableAssignment = await getEditableScopedAssignment(group);
    if (!editableAssignment) return;

    await updateAssignment(
      editableAssignment,
      { workflow_keys: cleanWorkflowKeys },
      "Update Approval Types",
    );
  };

  const toggleGroupWorkflowKey = async (group: any, workflowKey: string) => {
    const scopedRows = group.assignments.filter(
      (assignment: any) => !isLegacyProtectedAssignment(assignment),
    );

    const currentKeys = uniqueWorkflowKeys(
      scopedRows.flatMap((assignment: any) => safeParseWorkflowKeys(assignment)),
    );

    const normalizedKey = normalizeWorkflowKey(workflowKey);

    const nextKeys = currentKeys.includes(normalizedKey)
      ? currentKeys.filter((key) => key !== normalizedKey)
      : [...currentKeys, normalizedKey];

    await updateGroupWorkflowKeys(group, nextKeys);
  };

  const updateGroupDepartmentScopes = async (group: any, nextScopes: string[]) => {
    const targetAssignment =
      group.assignments.find((assignment: any) => !isLegacyProtectedAssignment(assignment)) ||
      group.assignments[0];

    if (!targetAssignment) return;

    const cleanScopes = uniqueScopes(nextScopes);
    const legacyScope = cleanScopes.length === 1 ? cleanScopes[0] : "";

    await updateAssignment(
      targetAssignment,
      {
        department_scopes: cleanScopes,
        department_scope: legacyScope,
        is_default: cleanScopes.length > 0 ? false : Boolean(targetAssignment.is_default),
      },
      "Update Leave OT Department Routing",
    );
  };

  const toggleGroupDepartmentScope = async (group: any, department: string) => {
    const allScopes = uniqueScopes(
      group.assignments.flatMap((assignment: any) => safeParseDepartmentScopes(assignment)),
    );

    const normalizedDepartment = normalizeScope(department);

    const nextScopes = allScopes.some(
      (scope) => normalizeText(scope) === normalizeText(normalizedDepartment),
    )
      ? allScopes.filter((scope) => normalizeText(scope) !== normalizeText(normalizedDepartment))
      : [...allScopes, normalizedDepartment];

    await updateGroupDepartmentScopes(group, nextScopes);
  };

  const deactivateGroup = async (group: any) => {
    if (isSaving) return;

    const confirmed = confirm(`Deactivate approval assignments for ${group.employeeName}?`);
    if (!confirmed) return;

    for (const assignment of group.assignments) {
      if (assignment.is_active !== false) {
        await updateAssignment(assignment, { is_active: false }, "Deactivate Approver Assignments");
      }
    }
  };

  const approverGroups = useMemo(() => {
    const search = normalizeText(searchTerm);
    const map = new Map<string, any>();

    assignments.forEach((assignment) => {
      const employee = assignment.employee_id ? getAssignedEmployee(assignment.employee_id) : null;
      const employeeName = employee ? getEmployeeName(employee) : "Unassigned";
      const key = assignment.employee_id ? `employee:${assignment.employee_id}` : `unassigned:${assignment.id}`;

      const workflowKeys = safeParseWorkflowKeys(assignment);
      const scopes = safeParseDepartmentScopes(assignment);

      const searchable = normalizeText(
        [
          employeeName,
          employee?.department,
          employee?.position,
          assignment.approval_role,
          assignment.assignment_type,
          workflowKeys.join(" "),
          workflowKeys.map(getWorkflowDisplayName).join(" "),
          scopes.join(" "),
          isLegacyProtectedAssignment(assignment) ? "legacy protected" : "",
        ].join(" "),
      );

      if (search && !searchable.includes(search)) return;

      if (!map.has(key)) {
        map.set(key, { key, employee, employeeName, assignments: [] });
      }

      map.get(key).assignments.push(assignment);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.employeeName === "Unassigned" && b.employeeName !== "Unassigned") return 1;
      if (a.employeeName !== "Unassigned" && b.employeeName === "Unassigned") return -1;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [assignments, employees, searchTerm, approvalWorkflows]);

  const assignedCount = assignments.filter((item) => item.employee_id).length;
  const activeApproverCount = assignments.filter(
    (item) => item.is_active !== false && item.employee_id,
  ).length;
  const scopedCount = assignments.filter(
    (item) => item.is_active !== false && item.employee_id && !isLegacyProtectedAssignment(item),
  ).length;
  const legacyCount = assignments.filter(
    (item) => item.is_active !== false && item.employee_id && isLegacyProtectedAssignment(item),
  ).length;

  return (
    <PageGuard moduleKey="approval_assignments">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
<main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
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
                  <p className="mt-2 max-w-5xl text-sm font-medium leading-6 text-slate-500">
                    Simple approver-first setup. Approval chips are configurable from database workflows.
                    Legacy Cash Management rows stay protected.
                  </p>
                </div>

                <button
                  onClick={getApprovalAssignments}
                  disabled={isLoading}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Assignments" value={assignedCount} icon={<ShieldCheck className="h-5 w-5 text-slate-500" />} />
              <SummaryCard title="Active Approvers" value={activeApproverCount} icon={<Users className="h-5 w-5 text-blue-700" />} />
              <SummaryCard title="Scoped Rows" value={scopedCount} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
              <SummaryCard title="Legacy Protected" value={legacyCount} icon={<UserCheck className="h-5 w-5 text-amber-600" />} />
            </section>

            <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Safe Routing Rules
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Cash Management legacy rows are protected
                  </h3>
                  <p className="mt-2 max-w-5xl text-sm font-bold leading-6 text-blue-700">
                    workflow_keys = NULL stays legacy protected. POS Void/Refund and future approvals use scoped rows only.
                    Department scope only matters for Leave / OT.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_300px_160px] xl:items-end">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Search
                  </p>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search approver, approval type, department..."
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    New Role
                  </p>
                  <select
                    value={newAssignmentRole}
                    onChange={(event) => setNewAssignmentRole(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    {approvalRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    New Approver
                  </p>
                  <select
                    value={newAssignmentEmployeeId}
                    onChange={(event) => setNewAssignmentEmployeeId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">Select approver</option>
                    {activeEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {getEmployeeName(employee)} Ã¢â‚¬â€ {employee.department || "No Department"}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={addAssignment}
                  disabled={isSaving}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </section>

            <section className="space-y-5">
              {isLoading ? (
                <EmptyState title="Loading approval assignments..." />
              ) : approverGroups.length === 0 ? (
                <EmptyState title="No approval assignments found" />
              ) : (
                approverGroups.map((group) => {
                  const employee = group.employee;
                  const isExpanded = expandedApproverKey === group.key;

                  const activeRows = group.assignments.filter((item: any) => item.is_active !== false);
                  const legacyRows = group.assignments.filter((item: any) => isLegacyProtectedAssignment(item));
                  const scopedRows = group.assignments.filter((item: any) => !isLegacyProtectedAssignment(item));

                  const scopedWorkflowKeys = uniqueWorkflowKeys(
                    scopedRows.flatMap((item: any) => safeParseWorkflowKeys(item)),
                  );

                  const allScopes = uniqueScopes(
                    group.assignments.flatMap((item: any) => safeParseDepartmentScopes(item)),
                  );

                  return (
                    <div key={group.key} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Chip>Approver</Chip>
                              <Chip tone="emerald">{activeRows.length} active</Chip>
                              {legacyRows.length > 0 && <Chip tone="amber">legacy protected</Chip>}
                            </div>

                            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                              {group.employeeName}
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {employee?.department || "No Department"} Ã¢â‚¬Â¢ {employee?.position || "No Position"}
                            </p>

                            <div className="mt-5 space-y-4">
                              <SummaryBlock title="Approves">
                                {legacyRows.length > 0 && <Chip tone="amber">Legacy All Workflows</Chip>}

                                {scopedWorkflowKeys.length === 0 && legacyRows.length === 0 ? (
                                  <Chip>No approval types assigned</Chip>
                                ) : (
                                  scopedWorkflowKeys.map((key) => (
                                    <Chip key={key} tone="blue">{getWorkflowDisplayName(key)}</Chip>
                                  ))
                                )}
                              </SummaryBlock>

                              <SummaryBlock title="Leave / OT Department Routing">
                                {allScopes.length === 0 ? (
                                  <Chip>All Departments</Chip>
                                ) : (
                                  allScopes.map((scope) => (
                                    <Chip key={scope} tone="emerald">{scope}</Chip>
                                  ))
                                )}
                              </SummaryBlock>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            <button
                              onClick={() => {
                                setExpandedApproverKey(isExpanded ? null : group.key);
                                setEditMode("types");
                              }}
                              className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                            >
                              Edit Approval Types
                            </button>

                            <button
                              onClick={() => {
                                setExpandedApproverKey(isExpanded ? null : group.key);
                                setEditMode("departments");
                              }}
                              className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Edit Leave/OT Departments
                            </button>

                            <button
                              onClick={() => deactivateGroup(group)}
                              disabled={isSaving}
                              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Deactivate
                            </button>

                            <button
                              onClick={() => {
                                setExpandedApproverKey(isExpanded ? null : group.key);
                                setEditMode(isExpanded ? null : "types");
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                              aria-label="Toggle approver details"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-5">
                          <div className="mb-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => setEditMode("types")}
                              className={
                                editMode === "types"
                                  ? "h-10 rounded-xl bg-slate-950 px-4 text-xs font-black text-white"
                                  : "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50"
                              }
                            >
                              Approval Types
                            </button>

                            <button
                              onClick={() => setEditMode("departments")}
                              className={
                                editMode === "departments"
                                  ? "h-10 rounded-xl bg-slate-950 px-4 text-xs font-black text-white"
                                  : "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50"
                              }
                            >
                              Leave / OT Departments
                            </button>
                          </div>

                          {editMode === "types" && (
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    Edit Approval Types
                                  </p>
                                  <h3 className="mt-1 text-xl font-black text-slate-950">
                                    Add or remove approval chips
                                  </h3>
                                  <p className="mt-1 text-sm font-bold text-slate-500">
                                    Loaded from approval_workflows. No hardcoded approval types.
                                  </p>
                                </div>

                                {legacyRows.length > 0 && <Chip tone="amber">Legacy rows protected</Chip>}
                              </div>

                              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {activeWorkflowOptions.length === 0 ? (
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                                    No active approval workflows found.
                                  </div>
                                ) : (
                                  activeWorkflowOptions.map((workflow) => {
                                    const checked = scopedWorkflowKeys.includes(workflow.normalizedKey);

                                    return (
                                      <label
                                        key={workflow.id || workflow.normalizedKey}
                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm font-bold transition ${
                                          checked
                                            ? "border-blue-200 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                        } ${isSaving ? "cursor-not-allowed opacity-50" : ""}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isSaving}
                                          onChange={() => toggleGroupWorkflowKey(group, workflow.normalizedKey)}
                                          className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                        />

                                        <span className="min-w-0">
                                          <span className="block truncate">{workflow.displayName}</span>
                                          <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                            {workflow.module || "Workflow"} Ã¢â‚¬Â¢ {workflow.normalizedKey}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>

                              {scopedRows.length > 0 && (
                                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    Scoped Rows
                                  </p>

                                  <div className="mt-3 space-y-2">
                                    {scopedRows.map((assignment: any) => (
                                      <div
                                        key={assignment.id}
                                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                                      >
                                        <div>
                                          <p className="text-sm font-black text-slate-950">
                                            {assignment.approval_role} Ã¢â‚¬Â¢ {assignment.assignment_type || "BACKUP"}
                                          </p>
                                          <p className="mt-1 text-xs font-bold text-slate-500">
                                            {safeParseWorkflowKeys(assignment).length} workflow key(s)
                                          </p>
                                        </div>

                                        <button
                                          onClick={() => removeScopedAssignment(assignment)}
                                          disabled={isSaving}
                                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <Trash2 size={13} />
                                          Remove Scoped Row
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {editMode === "departments" && (
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    Edit Leave / OT Departments
                                  </p>
                                  <h3 className="mt-1 text-xl font-black text-slate-950">
                                    Department routing scope
                                  </h3>
                                  <p className="mt-1 text-sm font-bold text-slate-500">
                                    Department scope only matters for Leave and OT.
                                  </p>
                                </div>

                                <button
                                  onClick={() => updateGroupDepartmentScopes(group, [])}
                                  disabled={isSaving || allScopes.length === 0}
                                  className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Clear Departments
                                </button>
                              </div>

                              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {departmentOptions.length === 0 ? (
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                                    No departments found from employees.
                                  </div>
                                ) : (
                                  departmentOptions.map((department) => {
                                    const checked = allScopes.some(
                                      (scope) => normalizeText(scope) === normalizeText(department),
                                    );

                                    return (
                                      <label
                                        key={department}
                                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-bold transition ${
                                          checked
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                        } ${isSaving ? "cursor-not-allowed opacity-50" : ""}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isSaving}
                                          onChange={() => toggleGroupDepartmentScope(group, department)}
                                          className="h-4 w-4 rounded border-slate-300"
                                        />

                                        <span className="truncate">{department}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
        {icon}
      </div>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</h2>
    </div>
  );
}

function SummaryBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "blue" | "emerald" | "amber";
}) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${classes[tone]}`}>
      {children}
    </span>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <p className="text-sm font-black text-slate-950">{title}</p>
    </div>
  );
}






