"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { CheckCircle, Settings, ShieldCheck, XCircle } from "lucide-react";

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
      description: `${workflow.workflow_name || workflow.workflow_key} approval control updated.`,
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
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
          Inactive
        </span>
      );
    }

    if (workflow.approval_required) {
      return (
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
          Approval Required
        </span>
      );
    }

    return (
      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              System Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold">Approval Controls</h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure which workflows require manager approval and which workflows can auto-approve.
            </p>
          </div>

          <button
            onClick={getApprovalWorkflows}
            disabled={isLoading}
            className="w-fit rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard
            title="Active Workflows"
            value={activeWorkflows.length}
            icon={<Settings className="h-5 w-5 text-blue-400" />}
          />
          <SummaryCard
            title="Approval Required"
            value={approvalRequiredCount}
            icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
          />
          <SummaryCard
            title="Auto Approved"
            value={autoApprovedCount}
            icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Workflow Rules</h2>
            <p className="mt-1 text-sm text-slate-400">
              Turning approval OFF means new requests under that workflow can continue without entering the Approval Center.
            </p>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Approver Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Loading approval controls...
                    </td>
                  </tr>
                ) : workflows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No approval workflows found. Please seed approval_workflows in Supabase.
                    </td>
                  </tr>
                ) : (
                  workflows.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold">{workflow.workflow_name || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Created:{" "}
                          {workflow.created_at
                            ? String(workflow.created_at).slice(0, 10)
                            : "-"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                          {workflow.workflow_key}
                        </span>
                      </td>

                      <td className="px-4 py-3">{workflow.module || "-"}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleApprovalRequired(workflow)}
                          disabled={isSaving || workflow.is_active === false}
                          className={`rounded-xl px-4 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                            workflow.approval_required
                              ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {workflow.approval_required ? "ON" : "OFF"}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={workflow.approver_role || "MANAGER"}
                          disabled={isSaving || workflow.is_active === false}
                          onChange={(event) =>
                            updateApproverRole(workflow, event.target.value)
                          }
                          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {approverRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">{getStatusBadge(workflow)}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(workflow)}
                          disabled={isSaving}
                          className={`rounded-xl px-4 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                            workflow.is_active === false
                              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {workflow.is_active === false ? "Inactive" : "Active"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
            <div>
              <h3 className="font-black text-blue-200">Approval Engine Rule</h3>
              <p className="mt-1 text-sm leading-6 text-blue-100">
                Future modules should check this page first. If approval is ON, the request goes to Manager Approval Center. If approval is OFF, the module may auto-approve and continue its workflow.
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
