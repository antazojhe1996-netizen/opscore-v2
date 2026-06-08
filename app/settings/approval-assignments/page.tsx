"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { Plus, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import PageGuard from "@/components/PageGuard";

const approvalRoles = [
  "MANAGER",
  "OWNER",
  "PAYROLL",
  "FINANCE",
  "SUPERVISOR",
];

const assignmentTypes = ["PRIMARY", "BACKUP"];

export default function ApprovalAssignmentsPage() {
  /// STATES
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /// FUNCTIONS
  const getEmployeeName = (employee: any) => {
    return `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();
  };

  const getAssignedEmployee = (employeeId: string) => {
    return employees.find((employee) => String(employee.id) === String(employeeId));
  };

  const getApprovalAssignments = async () => {
    setIsLoading(true);

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("approval_assignments")
      .select("*")
      .order("approval_role", { ascending: true })
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
      alert("Failed to load approval assignments. Check approval_assignments table columns.");
      return;
    }

    if (employeeError) {
      console.log("GET EMPLOYEES FOR APPROVAL ASSIGNMENTS ERROR:", employeeError.message);
      alert("Failed to load employees.");
      return;
    }

    if (workflowError) {
      console.log("GET APPROVAL WORKFLOWS FOR ASSIGNMENTS ERROR:", workflowError.message);
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
        assignment.is_active !== false
    );

    const assignmentType = existingActiveForRole.length === 0 ? "PRIMARY" : "BACKUP";

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_assignments")
      .insert({
        approval_role: approvalRole,
        employee_id: null,
        assignment_type: assignmentType,
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

    const duplicate = assignments.find(
      (item) =>
        item.id !== assignment.id &&
        item.is_active !== false &&
        item.approval_role === assignment.approval_role &&
        String(item.employee_id || "") === String(employeeId || "") &&
        employeeId
    );

    if (duplicate) {
      alert("This employee is already assigned to this approval role.");
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
      current.map((item) => (item.id === assignment.id ? data : item))
    );

    const selectedEmployee = employees.find(
      (employee) => String(employee.id) === String(employeeId)
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Assignments",
      action: "Update Approval Assignment",
      description: `${assignment.approval_role} ${assignment.assignment_type || "APPROVER"} assigned to ${
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
      current.map((item) => (item.id === assignment.id ? data : item))
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
      current.map((item) => (item.id === assignment.id ? data : item))
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
      `Remove this ${assignment.approval_role} approver assignment?`
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

    setAssignments((current) => current.filter((item) => item.id !== assignment.id));

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

  const getWorkflowsForRole = (approvalRole: string) => {
    return approvalWorkflows.filter(
      (workflow) =>
        String(workflow.approver_role || "") === String(approvalRole) &&
        workflow.is_active !== false
    );
  };

  const getWorkflowNamesForRole = (approvalRole: string) => {
    return getWorkflowsForRole(approvalRole).map(
      (workflow) => workflow.workflow_name || workflow.workflow_key
    );
  };

  /// EFFECTS
  useEffect(() => {
    getApprovalAssignments();
  }, []);

  /// CALCULATIONS
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

  const groupedAssignments = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return approvalRoles
      .map((role) => {
        const roleAssignments = assignments.filter((assignment) => {
          const assignedEmployee = getAssignedEmployee(assignment.employee_id);
          const employeeName = assignedEmployee ? getEmployeeName(assignedEmployee) : "";

          const matchesRole = String(assignment.approval_role || "") === role;
          const matchesSearch =
            !search ||
            role.toLowerCase().includes(search) ||
            employeeName.toLowerCase().includes(search) ||
            String(assignedEmployee?.department || "").toLowerCase().includes(search) ||
            String(assignedEmployee?.position || "").toLowerCase().includes(search);

          return matchesRole && matchesSearch;
        });

        return {
          role,
          assignments: roleAssignments,
        };
      })
      .filter((group) => !search || group.assignments.length > 0 || group.role.toLowerCase().includes(search));
  }, [assignments, employees, searchTerm]);

  const assignedCount = assignments.filter((item) => item.employee_id).length;
  const activeAssignmentCount = assignments.filter((item) => item.is_active !== false).length;
  const activeApproverCount = assignments.filter(
    (item) => item.is_active !== false && item.employee_id
  ).length;

  /// UI
 return (
  <PageGuard moduleKey="approval_assignments">
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold">Approval Assignments</h1>
            <p className="mt-1 text-sm text-slate-400">
              Assign multiple active approvers per role. Any active assigned approver can approve.
            </p>
          </div>

          <button
            onClick={getApprovalAssignments}
            disabled={isLoading}
            className="w-fit rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard
            title="Approval Roles"
            value={approvalRoles.length}
            icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
          />

          <SummaryCard
            title="Assigned Slots"
            value={assignedCount}
            icon={<UserCheck className="h-5 w-5 text-emerald-400" />}
          />

          <SummaryCard
            title="Active Approvers"
            value={activeApproverCount}
            icon={<Users className="h-5 w-5 text-blue-400" />}
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Role Approvers</h2>
              <p className="mt-1 text-sm text-slate-400">
                Primary / Backup is a label only. Approval rule is ANY ONE active approver.
              </p>
            </div>

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search role or employee..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none lg:w-80"
            />
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-slate-800 p-10 text-center text-slate-500">
              Loading approval assignments...
            </div>
          ) : (
            <div className="space-y-5">
              {groupedAssignments.map((group) => {
                const activeRoleApprovers = group.assignments.filter(
                  (assignment) => assignment.is_active !== false && assignment.employee_id
                );

                const workflowsForRole = getWorkflowsForRole(group.role);

                return (
                  <div
                    key={group.role}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-black text-amber-300">
                            {group.role}
                          </span>

                          {activeRoleApprovers.length > 0 ? (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                              {activeRoleApprovers.length} active approver
                              {activeRoleApprovers.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                              No active approver
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-slate-500">
                            Requests needing {group.role} approval can be approved by any active person listed below.
                          </p>

                          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">
                                Approves
                              </p>

                              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">
                                {workflowsForRole.length} workflow
                                {workflowsForRole.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {workflowsForRole.length === 0 ? (
                              <p className="text-[11px] text-slate-500">
                                No active workflows assigned to this role.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {workflowsForRole.map((workflow) => (
                                  <span
                                    key={workflow.id}
                                    title={workflow.workflow_key}
                                    className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200"
                                  >
                                    {workflow.workflow_name || workflow.workflow_key}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => addApprover(group.role)}
                        disabled={isSaving}
                        className="flex w-fit items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Add Approver
                      </button>
                    </div>

                    <div className="overflow-auto rounded-xl border border-slate-800">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-slate-900 text-left text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Approver Type</th>
                            <th className="px-4 py-3">Assigned Employee</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Position</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Active</th>
                            <th className="px-4 py-3">Remove</th>
                          </tr>
                        </thead>

                        <tbody>
                          {group.assignments.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                No approvers yet. Click Add Approver.
                              </td>
                            </tr>
                          ) : (
                            group.assignments.map((assignment) => {
                              const assignedEmployee = getAssignedEmployee(assignment.employee_id);

                              return (
                                <tr
                                  key={assignment.id}
                                  className="border-t border-slate-800 text-slate-200 hover:bg-slate-900/70"
                                >
                                  <td className="px-4 py-3">
                                    <select
                                      value={assignment.assignment_type || "BACKUP"}
                                      disabled={isSaving || assignment.is_active === false}
                                      onChange={(event) =>
                                        updateAssignmentType(assignment, event.target.value)
                                      }
                                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {assignmentTypes.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  <td className="px-4 py-3">
                                    <select
                                      value={assignment.employee_id || ""}
                                      disabled={isSaving || assignment.is_active === false}
                                      onChange={(event) =>
                                        updateAssignmentEmployee(assignment, event.target.value)
                                      }
                                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <option value="">Unassigned</option>
                                      {activeEmployees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                          {getEmployeeName(employee)} — {employee.department || "No Department"}
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  <td className="px-4 py-3">
                                    {assignedEmployee?.department || "-"}
                                  </td>

                                  <td className="px-4 py-3">
                                    {assignedEmployee?.position || "-"}
                                  </td>

                                  <td className="px-4 py-3">
                                    {assignment.employee_id ? (
                                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                                        Assigned
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                                        Needs Assignment
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => toggleAssignmentStatus(assignment)}
                                      disabled={isSaving}
                                      className={`rounded-xl px-4 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                                        assignment.is_active === false
                                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                      }`}
                                    >
                                      {assignment.is_active === false ? "Inactive" : "Active"}
                                    </button>
                                  </td>

                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => removeAssignment(assignment)}
                                      disabled={isSaving}
                                      className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
            <div>
              <h3 className="font-black text-blue-200">
                Multiple Approver Rule
              </h3>
              <p className="mt-1 text-sm leading-6 text-blue-100">
                Approval Controls decide which role approves a workflow. This page shows what each role approves and who belongs to that role. Any active assigned approver can approve or reject.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  </PageGuard>
  );
}

function SummaryCard({ title, value, icon }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        {icon}
      </div>
      <h2 className="mt-3 text-2xl font-bold text-white">{value}</h2>
    </div>
  );
}
