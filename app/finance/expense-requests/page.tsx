"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";

export default function ExpenseRequestsPage() {
  /// STATES
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [workflowSettings, setWorkflowSettings] = useState<any>(null);

  const today = new Date().toISOString().split("T")[0];

  const [requestDate, setRequestDate] = useState(today);
  const [department, setDepartment] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [category, setCategory] = useState("");
  const [expenseArea, setExpenseArea] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState("Normal");

  /// FUNCTIONS
  const formatMoney = (value: any) => {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusStyle = (status: string) => {
    if (status === "PENDING") return "bg-amber-500/10 text-amber-400";
    if (status === "APPROVED") return "bg-blue-500/10 text-blue-400";
    if (status === "REJECTED") return "bg-red-500/10 text-red-400";
    if (status === "RELEASED") return "bg-purple-500/10 text-purple-400";
    if (status === "LIQUIDATED") return "bg-emerald-500/10 text-emerald-400";
    return "bg-slate-700 text-slate-300";
  };

  const getFinanceSettings = async () => {
    const { data: categoriesData } = await supabase
      .from("finance_expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: areasData } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: workflowData } = await supabase
      .from("finance_workflow_settings")
      .select("*")
      .limit(1)
      .single();

    setCategories(categoriesData || []);
    setAreas(areasData || []);
    setWorkflowSettings(workflowData || null);
  };

  const getRequests = async () => {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EXPENSE REQUESTS ERROR:", error);
      return;
    }

    setRequests(data || []);
  };

  const submitRequest = async () => {
    if (
      !requestDate ||
      !department.trim() ||
      !requestedBy.trim() ||
      !category ||
      !expenseArea ||
      !amount ||
      !reason.trim()
    ) {
      alert("Please complete required fields.");
      return;
    }

    const amountValue = Number(amount);

    if (amountValue <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    const requireApproval =
      workflowSettings?.require_expense_approval ?? true;

    const defaultStatus = requireApproval ? "PENDING" : "APPROVED";

    const { error } = await supabase.from("expense_requests").insert({
      request_date: requestDate,
      department: department.trim(),
      requested_by: requestedBy.trim(),
      category,
      expense_area: expenseArea,
      amount: amountValue,
      reason: reason.trim(),
      urgency,
      status: defaultStatus,
      remarks: "",
    });

    if (error) {
      console.log("SUBMIT EXPENSE REQUEST ERROR:", error);
      alert("Failed to submit expense request.");
      return;
    }

    setRequestDate(today);
    setDepartment("");
    setRequestedBy("");
    setCategory("");
    setExpenseArea("");
    setAmount("");
    setReason("");
    setUrgency("Normal");

    getRequests();
  };

  const approveRequest = async (id: string) => {
    const approvedBy = prompt("Approved by:");
    if (!approvedBy) return;

    const approvalRole = prompt("Approval role: e.g. Supervisor, Operations Manager, Owner, CEO");
    if (!approvalRole) return;

    const { error } = await supabase
      .from("expense_requests")
      .update({
        status: "APPROVED",
        approved_by: approvedBy,
        approval_role: approvalRole,
        approved_date: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.log("APPROVE REQUEST ERROR:", error);
      alert("Failed to approve request.");
      return;
    }

    getRequests();
  };

  const rejectRequest = async (id: string) => {
    const remarks = prompt("Reason for rejection:");
    if (!remarks) return;

    const { error } = await supabase
      .from("expense_requests")
      .update({
        status: "REJECTED",
        remarks,
      })
      .eq("id", id);

    if (error) {
      console.log("REJECT REQUEST ERROR:", error);
      alert("Failed to reject request.");
      return;
    }

    getRequests();
  };

  const releaseCash = async (id: string) => {
    const releasedBy = prompt("Released by:");
    if (!releasedBy) return;

    const { error } = await supabase
      .from("expense_requests")
      .update({
        status: "RELEASED",
        released_by: releasedBy,
        released_date: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.log("RELEASE CASH ERROR:", error);
      alert("Failed to release cash.");
      return;
    }

    getRequests();
  };

  const liquidateRequest = async (id: string) => {
    const liquidatedBy = prompt("Liquidated by:");
    if (!liquidatedBy) return;

    const remarks = prompt("Liquidation remarks / receipt details:");
    if (!remarks) return;

    const { error } = await supabase
      .from("expense_requests")
      .update({
        status: "LIQUIDATED",
        liquidated_by: liquidatedBy,
        liquidated_date: new Date().toISOString(),
        remarks,
      })
      .eq("id", id);

    if (error) {
      console.log("LIQUIDATE REQUEST ERROR:", error);
      alert("Failed to liquidate request.");
      return;
    }

    getRequests();
  };

  /// CALCULATIONS
  const pendingCount = requests.filter((item) => item.status === "PENDING").length;
  const approvedCount = requests.filter((item) => item.status === "APPROVED").length;
  const releasedAmount = requests
    .filter((item) => item.status === "RELEASED" || item.status === "LIQUIDATED")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const forLiquidationCount = requests.filter((item) => item.status === "RELEASED").length;

  /// EFFECTS
  useEffect(() => {
    getFinanceSettings();
    getRequests();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Finance Control
          </p>
          <h1 className="mt-2 text-3xl font-bold">Expense Requests</h1>
          <p className="mt-1 text-sm text-slate-400">
            Request, approve, release, and liquidate operational expenses.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Pending Requests" value={pendingCount} />
          <SummaryCard title="Approved Requests" value={approvedCount} />
          <SummaryCard title="Released Cash" value={formatMoney(releasedAmount)} />
          <SummaryCard title="For Liquidation" value={forLiquidationCount} />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">New Expense Request</h2>

            <div className="mt-5 space-y-4">
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <input
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Requested by"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={expenseArea}
                onChange={(e) => setExpenseArea(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select expense area</option>
                {areas.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Requested amount"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Reason / purpose of request"
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />

              <button
                onClick={submitRequest}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Submit Request
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Request Workflow</h2>

            <div className="max-h-[650px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="sticky top-0 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Approver</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">{request.request_date}</td>
                      <td className="px-4 py-3">{request.department}</td>
                      <td className="px-4 py-3">{request.requested_by}</td>
                      <td className="px-4 py-3">{request.category}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatMoney(request.amount)}
                      </td>
                      <td className="px-4 py-3">{request.urgency}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {request.approved_by ? (
                          <div>
                            <p>{request.approved_by}</p>
                            <p className="text-xs text-slate-500">
                              {request.approval_role}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {request.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => approveRequest(request.id)}
                                className="rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/20"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() => rejectRequest(request.id)}
                                className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {request.status === "APPROVED" && (
                            <button
                              onClick={() => releaseCash(request.id)}
                              className="rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/20"
                            >
                              Release
                            </button>
                          )}

                          {request.status === "RELEASED" && (
                            <button
                              onClick={() => liquidateRequest(request.id)}
                              className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                            >
                              Liquidate
                            </button>
                          )}

                          {request.status === "REJECTED" && (
                            <span className="text-xs text-slate-500">
                              Closed
                            </span>
                          )}

                          {request.status === "LIQUIDATED" && (
                            <span className="text-xs text-slate-500">
                              Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {requests.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No expense requests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ title, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 break-words text-2xl font-bold">{value}</h2>
    </div>
  );
}