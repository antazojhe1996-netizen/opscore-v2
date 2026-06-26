"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { createAuditLog } from "@/lib/audit";
import {
  CheckCircle,
  PlusCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react";

type ApprovalWorkflow = {
  id: string;
  workflow_key: string;
  workflow_name: string | null;
  module: string | null;
  approval_required: boolean | null;
  approver_role: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type StandardWorkflow = {
  workflow_key: string;
  workflow_name: string;
  module: string;
  approval_required: boolean;
  approver_role: string;
};

const approverRoles = [
  "MANAGER",
  "SUPERVISOR",
  "OPERATIONS_MANAGER",
  "OWNER",
  "PAYROLL",
  "FINANCE",
  "ADMIN",
];

const standardWorkflows: StandardWorkflow[] = [
  {
    workflow_key: "CASH_DRAWER_OUT",
    workflow_name: "Cash Out / Drawer Release",
    module: "Cash Management",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "CASH_EXPENSE_RELEASE",
    workflow_name: "Expense Release",
    module: "Cash Management",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "CASH_ADVANCE_RELEASE",
    workflow_name: "Cash Advance Release",
    module: "Cash Management",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "CASH_IN",
    workflow_name: "Cash In / Sales Collection",
    module: "Cash Management",
    approval_required: false,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "LIQUIDATION_RETURN",
    workflow_name: "Liquidation / Returned Cash",
    module: "Cash Management",
    approval_required: false,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "DRAWER_REMITTANCE",
    workflow_name: "Drawer Remittance",
    module: "Cash Management",
    approval_required: false,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "DRAWER_TURNOVER",
    workflow_name: "Drawer Turnover",
    module: "Cash Management",
    approval_required: false,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "EXPENSE_REQUEST",
    workflow_name: "Expense Request",
    module: "Finance",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "LEAVE_REQUEST",
    workflow_name: "Leave Request",
    module: "HR",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "OVERTIME_APPROVAL",
    workflow_name: "Overtime Approval",
    module: "Workforce",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "PAYROLL_ADJUSTMENT",
    workflow_name: "Payroll Adjustment",
    module: "Payroll",
    approval_required: true,
    approver_role: "PAYROLL",
  },
  {
    workflow_key: "PAYROLL_REOPEN",
    workflow_name: "Payroll Reopen",
    module: "Payroll",
    approval_required: true,
    approver_role: "PAYROLL",
  },
  {
    workflow_key: "POS_VOID",
    workflow_name: "POS Void",
    module: "POS",
    approval_required: true,
    approver_role: "MANAGER",
  },
  {
    workflow_key: "POS_REFUND",
    workflow_name: "POS Refund",
    module: "POS",
    approval_required: true,
    approver_role: "MANAGER",
  },
];

const moduleOrder = [
  "Cash Management",
  "Finance",
  "POS",
  "Payroll",
  "HR",
  "Workforce",
  "System",
];

const getWorkflowSortKey = (workflow: ApprovalWorkflow) => {
  const moduleIndex = moduleOrder.indexOf(String(workflow.module || ""));
  return `${moduleIndex === -1 ? 99 : moduleIndex}-${workflow.workflow_name || workflow.workflow_key}`;
};

export default function ApprovalControlsPage() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");

  const currentUserName =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_employee_name") ||
        localStorage.getItem("opscore_current_role_name") ||
        "OPSCORE USER"
      : "OPSCORE USER";

  useEffect(() => {
    void getApprovalWorkflows();
  }, []);

  const getApprovalWorkflows = async () => {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("approval_workflows")
      .select("*")
      .order("module", { ascending: true })
      .order("workflow_name", { ascending: true });

    setIsLoading(false);

    if (error) {
      console.log("GET APPROVAL WORKFLOWS ERROR:", error.message);
      setMessage(`Failed to load approval workflows. ${error.message}`);
      return;
    }

    setWorkflows(((data || []) as ApprovalWorkflow[]).sort((a, b) => getWorkflowSortKey(a).localeCompare(getWorkflowSortKey(b))));
  };

  const seedStandardWorkflows = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    const existingKeys = workflows.map((workflow) => workflow.workflow_key);
    const missing = standardWorkflows.filter(
      (workflow) => !existingKeys.includes(workflow.workflow_key),
    );

    if (missing.length === 0) {
      setIsSaving(false);
      setMessage("All standard approval controls already exist.");
      return;
    }

    const { error } = await supabase.from("approval_workflows").insert(
      missing.map((workflow) => ({
        ...workflow,
        is_active: true,
      })),
    );

    setIsSaving(false);

    if (error) {
      console.log("SEED APPROVAL WORKFLOWS ERROR:", error.message);
      setMessage(`Failed to add missing approval controls. ${error.message}`);
      return;
    }

    await createAuditLog({
      userName: currentUserName,
      module: "Approval Controls",
      action: "Seed Approval Workflows",
      description: `${missing.length} standard approval control(s) added.`,
      severity: "warning",
      recordId: "approval_workflows",
      newValue: missing,
    });

    setMessage(`${missing.length} missing approval control(s) added.`);
    await getApprovalWorkflows();
  };

  const updateWorkflow = async (workflow: ApprovalWorkflow, payload: Partial<ApprovalWorkflow>) => {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("approval_workflows")
      .update(payload)
      .eq("id", workflow.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.log("UPDATE APPROVAL WORKFLOW ERROR:", error.message);
      setMessage(`Failed to update approval workflow. ${error.message}`);
      return;
    }

    setWorkflows((current) =>
      current
        .map((item) => (item.id === workflow.id ? (data as ApprovalWorkflow) : item))
        .sort((a, b) => getWorkflowSortKey(a).localeCompare(getWorkflowSortKey(b))),
    );

    await createAuditLog({
      userName: currentUserName,
      module: "Approval Controls",
      action: "Update Approval Workflow",
      description: `${workflow.workflow_name || workflow.workflow_key} approval control updated.`,
      severity: "warning",
      recordId: workflow.id,
      oldValue: workflow,
      newValue: data,
    });
  };

  const toggleApprovalRequired = async (workflow: ApprovalWorkflow) => {
    await updateWorkflow(workflow, {
      approval_required: !workflow.approval_required,
    });
  };

  const updateApproverRole = async (workflow: ApprovalWorkflow, role: string) => {
    await updateWorkflow(workflow, {
      approver_role: role,
    });
  };

  const toggleActive = async (workflow: ApprovalWorkflow) => {
    await updateWorkflow(workflow, {
      is_active: workflow.is_active === false,
    });
  };

  const getStatusBadge = (workflow: ApprovalWorkflow) => {
    if (workflow.is_active === false) {
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

  const activeWorkflows = workflows.filter((item) => item.is_active !== false);
  const approvalRequiredCount = workflows.filter(
    (item) => item.is_active !== false && item.approval_required,
  ).length;
  const autoApprovedCount = workflows.filter(
    (item) => item.is_active !== false && !item.approval_required,
  ).length;

  const moduleOptions = useMemo(() => {
    const modules = workflows
      .map((workflow) => String(workflow.module || "Other"))
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(modules))];
  }, [workflows]);

  const filteredWorkflows = workflows.filter((workflow) => {
    if (moduleFilter === "ALL") return true;
    return String(workflow.module || "Other") === moduleFilter;
  });

  const missingStandardCount = standardWorkflows.filter(
    (standard) => !workflows.some((workflow) => workflow.workflow_key === standard.workflow_key),
  ).length;

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
                    Configure which workflows require manager approval before posting live records. This is the central control used by Finance, Cash Management, POS, Payroll, HR, and Workforce modules.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={seedStandardWorkflows}
                    disabled={isSaving || isLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusCircle size={16} />
                    {missingStandardCount > 0 ? `Add Missing (${missingStandardCount})` : "Standard Ready"}
                  </button>

                  <button
                    onClick={getApprovalWorkflows}
                    disabled={isLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={16} />
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </section>

            {message && (
              <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 shadow-sm">
                {message}
              </section>
            )}

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
              <SummaryCard
                title="Missing Standard"
                value={missingStandardCount}
                icon={<PlusCircle className="h-5 w-5 text-blue-600" />}
              />
            </section>

            <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Vincent Recommended Cash Rules
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                    Cash In OFF. Expense Release ON. Cash Advance Release ON. Liquidation Return OFF. Remittance OFF. Turnover OFF. Existing live entries remain approved and untouched.
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Workflow Table
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Workflow Rules
                  </h2>
                  <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                    Turning approval OFF means the module may auto-approve and continue its workflow. Turning approval ON means the request must enter Approval Center first.
                  </p>
                </div>

                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {moduleOptions.map((module) => (
                    <option key={module} value={module}>
                      {module === "ALL" ? "All Modules" : module}
                    </option>
                  ))}
                </select>
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
                    ) : filteredWorkflows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <p className="text-sm font-black text-slate-950">
                            No approval workflows found
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Click Add Missing to seed standard approval controls.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredWorkflows.map((workflow) => (
                        <tr
                          key={workflow.id}
                          className="transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-950">
                              {workflow.workflow_name || "-"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              Created: {workflow.created_at ? String(workflow.created_at).slice(0, 10) : "-"}
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
                              onChange={(event) => updateApproverRole(workflow, event.target.value)}
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
                              {workflow.is_active === false ? "Activate" : "Deactivate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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





