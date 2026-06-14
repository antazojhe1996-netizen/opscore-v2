"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { CheckCircle, Settings, ShieldCheck } from "lucide-react";

const approverRoles = [
  "MANAGER",
  "SUPERVISOR",
  "OPERATIONS_MANAGER",
  "OWNER",
  "PAYROLL",
  "FINANCE",
  "ADMIN",
];

export default function ApprovalControlsPage() {
  /// STATES
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  /// FUNCTIONS
  const getApprovalWorkflows = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("approval_workflows")
      .select("*")
      .order("module", { ascending: true })
      .order("workflow_name", { ascending: true });

    setIsLoading(false);

    if (error) {
      console.log("GET APPROVAL WORKFLOWS ERROR:", error.message);
      alert("Failed to load approval workflows.");
      return;
    }

    setWorkflows(data || []);
  };

  const updateWorkflow = async (workflow: any, payload: any) => {
    if (isSaving) return;

    setIsSaving(true);

    const { data, error } = await supabase
      .from("approval_workflows")
      .update(payload)
      .eq("id", workflow.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("UPDATE APPROVAL WORKFLOW ERROR:", error.message);
      alert("Failed to update approval workflow.");
      return;
    }

    setWorkflows((current) =>
      current.map((item) => (item.id === workflow.id ? data : item))
    );

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Approval Controls",
      action: "Update Approval Workflow",
      description: `${
        workflow.workflow_name || workflow.workflow_key
      } approval control updated.`,
      severity: "warning",
      recordId: workflow.id,
      oldValue: workflow,
      newValue: data,
    });
  };

  const toggleApprovalRequired = async (workflow: any) => {
    await updateWorkflow(workflow, {
      approval_required: !workflow.approval_required,
    });
  };

  const updateApproverRole = async (workflow: any, role: string) => {
    await updateWorkflow(workflow, {
      approver_role: role,
    });
  };

  const toggleActive = async (workflow: any) => {
    await updateWorkflow(workflow, {
      is_active: !workflow.is_active,
    });
  };

  const getStatusBadge = (workflow: any) => {
    if (!workflow.is_active) {
      return (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          Inactive
        </span>
      );
    }

    if (workflow.approval_required) {
      return (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          Approval Required
        </span>
      );
    }

    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        Auto Approved
      </span>
    );
  };

  /// EFFECTS
  useEffect(() => {
    getApprovalWorkflows();
  }, []);

  /// CALCULATIONS
  const activeWorkflows = workflows.filter((item) => item.is_active !== false);
  const approvalRequiredCount = workflows.filter(
    (item) => item.is_active !== false && item.approval_required
  ).length;
  const autoApprovedCount = workflows.filter(
    (item) => item.is_active !== false && !item.approval_required
  ).length;

  /// UI
  return (
    <PageGuard moduleKey="approval_controls">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar breadcrumb="SYSTEM / APPROVAL CONTROLS" />

          <div className="px-4 pb-8 pt-20 sm:px-6 lg:px-7">
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    SYSTEM
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Approval Controls
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Configure which workflows require manager approval and which
                    workflows can auto-approve before continuing.
                  </p>
                </div>

                <button
                  onClick={getApprovalWorkflows}
                  disabled={isLoading}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                title="Active Workflows"
                value={activeWorkflows.length}
                icon={<Settings className="h-5 w-5 text-slate-500" />}
              />
              <SummaryCard
                title="Approval Required"
                value={approvalRequiredCount}
                icon={<ShieldCheck className="h-5 w-5 text-amber-600" />}
              />
              <SummaryCard
                title="Auto Approved"
                value={autoApprovedCount}
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
              />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Workflow Table
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Workflow Rules
                </h2>
                <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                  Turning approval OFF means new requests under that workflow can
                  continue without entering the Approval Center.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Workflow</th>
                      <th className="px-6 py-4">Key</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Approval</th>
                      <th className="px-6 py-4">Approver Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Active</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            Loading approval controls...
                          </p>
                        </td>
                      </tr>
                    ) : workflows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            No approval workflows found
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Please seed approval_workflows in Supabase.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      workflows.map((workflow) => (
                        <tr
                          key={workflow.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-950">
                              {workflow.workflow_name || "-"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              Created:{" "}
                              {workflow.created_at
                                ? String(workflow.created_at).slice(0, 10)
                                : "-"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {workflow.workflow_key}
                            </span>
                          </td>

                          <td className="px-6 py-4">{workflow.module || "-"}</td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleApprovalRequired(workflow)}
                              disabled={isSaving || workflow.is_active === false}
                              className={
                                workflow.approval_required
                                  ? "h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                  : "h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                              }
                            >
                              {workflow.approval_required ? "ON" : "OFF"}
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <select
                              value={workflow.approver_role || "MANAGER"}
                              disabled={isSaving || workflow.is_active === false}
                              onChange={(event) =>
                                updateApproverRole(workflow, event.target.value)
                              }
                              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {approverRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-6 py-4">{getStatusBadge(workflow)}</td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleActive(workflow)}
                              disabled={isSaving}
                              className={
                                workflow.is_active === false
                                  ? "h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                  : "h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                              }
                            >
                              {workflow.is_active === false
                                ? "Activate"
                                : "Deactivate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Approval Engine Rule
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Central Workflow Control
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-blue-700">
                    Future modules should check this page first. If approval is ON,
                    the request goes to Manager Approval Center. If approval is OFF,
                    the module may auto-approve and continue its workflow.
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