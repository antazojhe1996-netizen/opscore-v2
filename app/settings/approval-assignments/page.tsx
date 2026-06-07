"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { ShieldCheck, UserCheck, Users } from "lucide-react";

export default function ApprovalAssignmentsPage() {
  /// STATES
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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
      .order("approval_role", { ascending: true });

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, department, position, employment_status, payroll_active")
      .order("first_name", { ascending: true });

    setIsLoading(false);

    if (assignmentError) {
      console.log("GET APPROVAL ASSIGNMENTS ERROR:", assignmentError.message);
      alert("Failed to load approval assignments.");
      return;
    }

    if (employeeError) {
      console.log("GET EMPLOYEES FOR APPROVAL ASSIGNMENTS ERROR:", employeeError.message);
      alert("Failed to load employees.");
      return;
    }

    setAssignments(assignmentData || []);
    setEmployees(employeeData || []);
  };

  const updateAssignmentEmployee = async (assignment: any, employeeId: string) => {
    if (isSaving) return;

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
      description: `${assignment.approval_role} assigned to ${
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

  const filteredAssignments = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return assignments.filter((assignment) => {
      const assignedEmployee = getAssignedEmployee(assignment.employee_id);
      const employeeName = assignedEmployee ? getEmployeeName(assignedEmployee) : "";

      return (
        String(assignment.approval_role || "").toLowerCase().includes(search) ||
        employeeName.toLowerCase().includes(search) ||
        String(assignedEmployee?.department || "").toLowerCase().includes(search) ||
        String(assignedEmployee?.position || "").toLowerCase().includes(search)
      );
    });
  }, [assignments, employees, searchTerm]);

  const assignedCount = assignments.filter((item) => item.employee_id).length;
  const activeAssignmentCount = assignments.filter((item) => item.is_active !== false).length;

  /// UI
  return (
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
              Assign approval roles to active employees. Workflows use roles, roles use assigned employees.
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
            value={assignments.length}
            icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
          />

          <SummaryCard
            title="Assigned Roles"
            value={assignedCount}
            icon={<UserCheck className="h-5 w-5 text-emerald-400" />}
          />

          <SummaryCard
            title="Active Assignments"
            value={activeAssignmentCount}
            icon={<Users className="h-5 w-5 text-blue-400" />}
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Role Assignments</h2>
              <p className="mt-1 text-sm text-slate-400">
                Employee dropdown options are pulled from Employee 201. No hardcoded employee names.
              </p>
            </div>

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search role or employee..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none lg:w-80"
            />
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Approval Role</th>
                  <th className="px-4 py-3">Assigned Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Loading approval assignments...
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No approval assignments found.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => {
                    const assignedEmployee = getAssignedEmployee(assignment.employee_id);

                    return (
                      <tr
                        key={assignment.id}
                        className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-black text-amber-300">
                            {assignment.approval_role}
                          </span>
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
            <div>
              <h3 className="font-black text-blue-200">
                Approval Assignment Rule
              </h3>
              <p className="mt-1 text-sm leading-6 text-blue-100">
                Approval Controls decide which role approves a workflow. Approval Assignments decide which employee currently owns that role.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
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
