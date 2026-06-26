"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useEffect, useMemo, useState } from "react";
import { createAuditLog } from "@/lib/audit";

export default function ExpenseRequestsPage() {
  /// STATES - DATABASE DATA
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [workflowSettings, setWorkflowSettings] = useState<any>(null);

  /// STATES - REQUEST FORM
  const today = new Date().toISOString().split("T")[0];

  const [requestDate, setRequestDate] = useState(today);
  const [requestorType, setRequestorType] = useState("Employee");

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [manualRequestorName, setManualRequestorName] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");

  const [category, setCategory] = useState("");
  const [expenseArea, setExpenseArea] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState("Normal");

  /// STATES - FILTERS
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /// STATES - SYSTEM
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  /// STATES - ACTION MODAL
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState("");
  const [actorName, setActorName] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");

  /// CALCULATIONS - WORKFLOW
  const approvalRequired = workflowSettings?.require_expense_approval !== false;

  /// CALCULATIONS - SELECTED REQUESTOR
  const selectedEmployeeData = employees.find(
    (employee) => String(employee.id) === String(selectedEmployee)
  );

  const selectedDepartment =
    requestorType === "Employee"
      ? selectedEmployeeData?.department || ""
      : manualDepartment.trim();

  const finalRequestedBy =
    requestorType === "Employee"
      ? `${selectedEmployeeData?.first_name || ""} ${
          selectedEmployeeData?.last_name || ""
        }`.trim()
      : manualRequestorName.trim();

  /// CALCULATIONS - DASHBOARD CARDS
  const pendingCount = requests.filter((item) => item.status === "PENDING").length;
  const approvedCount = requests.filter((item) => item.status === "APPROVED").length;
  const releasedAmount = requests
    .filter((item) => item.status === "RELEASED" || item.status === "LIQUIDATED")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const forLiquidationCount = requests.filter((item) => item.status === "RELEASED").length;

  /// CALCULATIONS - FILTERED TABLE
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus = statusFilter === "ALL" ? true : item.status === statusFilter;
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.department || "").toLowerCase().includes(search) ||
        String(item.requested_by || "").toLowerCase().includes(search) ||
        String(item.category || "").toLowerCase().includes(search) ||
        String(item.reason || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [requests, searchTerm, statusFilter]);

  /// FUNCTIONS - FORMATTERS
  const formatMoney = (value: any) =>
    `Ã¢â€šÂ±${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getStatusStyle = (status: string) => {
    if (status === "PENDING") return "bg-amber-500/10 text-amber-400";
    if (status === "APPROVED") return "bg-blue-500/10 text-blue-400";
    if (status === "REJECTED") return "bg-red-500/10 text-red-400";
    if (status === "RELEASED") return "bg-purple-500/10 text-purple-400";
    if (status === "LIQUIDATED") return "bg-emerald-500/10 text-emerald-400";
    return "bg-slate-700 text-slate-300";
  };

  /// FUNCTIONS - GET DATA
  const getFinanceSettings = async () => {
    const { data: employeesData, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (employeesError) console.log("GET EMPLOYEES ERROR:", employeesError.message);

    // IMPORTANT: Use the same category table as the main Expenses page.
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError) console.log("GET CATEGORIES ERROR:", categoriesError.message);

    const { data: areasData, error: areasError } = await supabase
      .from("finance_expense_areas")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (areasError) console.log("GET AREAS ERROR:", areasError.message);

    const { data: workflowData, error: workflowError } = await supabase
      .from("finance_workflow_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (workflowError) console.log("GET WORKFLOW SETTINGS ERROR:", workflowError.message);

    if (!workflowData) {
      const { data: insertedWorkflow, error: insertWorkflowError } = await supabase
        .from("finance_workflow_settings")
        .insert({ require_expense_approval: false })
        .select("*")
        .single();

      if (insertWorkflowError) {
        console.log("CREATE WORKFLOW SETTINGS ERROR:", insertWorkflowError.message);
        setWorkflowSettings({ require_expense_approval: false });
      } else {
        setWorkflowSettings(insertedWorkflow);
      }
    } else {
      setWorkflowSettings(workflowData);
    }

    setEmployees(employeesData || []);
    setCategories(categoriesData || []);
    setAreas(areasData || []);
  };

  const getRequests = async () => {
    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("GET EXPENSE REQUESTS ERROR:", error.message);
      return;
    }

    setRequests(data || []);
  };

  /// FUNCTIONS - WORKFLOW SETTINGS
  const toggleApprovalWorkflow = async () => {
    if (isSavingSettings) return;

    const nextValue = !approvalRequired;
    const confirmed = confirm(
      nextValue
        ? "Turn ON expense approval workflow? New requests will start as Pending."
        : "Turn OFF expense approval workflow? New requests will be Approved automatically."
    );

    if (!confirmed) return;

    setIsSavingSettings(true);

    let error: any = null;
    let savedData: any = null;

    if (workflowSettings?.id) {
      const result = await supabase
        .from("finance_workflow_settings")
        .update({ require_expense_approval: nextValue })
        .eq("id", workflowSettings.id)
        .select("*")
        .single();

      error = result.error;
      savedData = result.data;
    } else {
      const result = await supabase
        .from("finance_workflow_settings")
        .insert({ require_expense_approval: nextValue })
        .select("*")
        .single();

      error = result.error;
      savedData = result.data;
    }

    setIsSavingSettings(false);

    if (error) {
      console.log("SAVE WORKFLOW SETTINGS ERROR:", error.message);
      alert("Failed to update workflow settings.");
      return;
    }

    setWorkflowSettings(savedData || { require_expense_approval: nextValue });

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: "Update Expense Approval Workflow",
      description: nextValue
        ? "Expense approval workflow turned ON."
        : "Expense approval workflow turned OFF. New requests auto-approve.",
      severity: "warning",
      oldValue: workflowSettings,
      newValue: savedData || { require_expense_approval: nextValue },
    });
  };

  /// FUNCTIONS - FORM RESET
  const resetRequestForm = () => {
    setRequestDate(today);
    setRequestorType("Employee");
    setSelectedEmployee("");
    setManualRequestorName("");
    setManualDepartment("");
    setCategory("");
    setExpenseArea("");
    setAmount("");
    setReason("");
    setUrgency("Normal");
  };

  /// FUNCTIONS - SUBMIT REQUEST
  const submitRequest = async () => {
    if (isSubmitting) return;

    if (
      !requestDate ||
      !finalRequestedBy ||
      !selectedDepartment ||
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

    setIsSubmitting(true);

    const defaultStatus = approvalRequired ? "PENDING" : "APPROVED";
    const nowIso = new Date().toISOString();

    const payload: any = {
      request_date: requestDate,
      requestor_type: requestorType,
      department: selectedDepartment,
      requested_by: finalRequestedBy,
      category,
      expense_area: expenseArea,
      amount: amountValue,
      reason: reason.trim(),
      urgency,
      status: defaultStatus,
      remarks: approvalRequired ? "" : "Auto-approved because expense approval workflow is OFF.",
    };

    if (!approvalRequired) {
      payload.approved_by = "System";
      payload.approval_role = "Direct Approval";
      payload.approved_date = nowIso;
    }

    const { error } = await supabase.from("expense_requests").insert(payload);

    setIsSubmitting(false);

    if (error) {
      console.log("SUBMIT EXPENSE REQUEST ERROR:", error.message);
      alert("Failed to submit expense request.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: approvalRequired ? "Submit Expense Request" : "Submit Direct Approved Request",
      description: `${finalRequestedBy} submitted ${category} request for ${formatMoney(amountValue)}. Status: ${defaultStatus}`,
      severity: approvalRequired ? "info" : "warning",
      newValue: payload,
    });

    resetRequestForm();
    await getRequests();
  };

  /// FUNCTIONS - ACTION MODAL
  const openAction = (request: any, action: string) => {
    setSelectedRequest(request);
    setActionType(action);
    setActorName("");
    setActorRole("");
    setActionRemarks("");
  };

  const closeAction = () => {
    setSelectedRequest(null);
    setActionType("");
    setActorName("");
    setActorRole("");
    setActionRemarks("");
  };

  const postReleasedRequestToExpenses = async (request: any, releasedBy: string, releasedDate: string, releaseRemarks: string) => {
    if (request.posted_to_expenses) {
      return {
        expenseData: null,
        error: "This request is already posted to expenses.",
      };
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        expense_date: String(releasedDate || request.request_date || today).slice(0, 10),
        category: request.category,
        subcategory: null,
        department: request.expense_area || request.department,
        description: request.reason,
        source: "Expense Request",
        amount: Number(request.amount || 0),
        payment_method: "Cash",
        remarks: [
          `Auto-posted from released expense request.`,
          `Requested by: ${request.requested_by || "-"}.`,
          `Released by: ${releasedBy || "-"}.`,
          `Request ID: ${request.id}.`,
          releaseRemarks ? `Release remarks: ${releaseRemarks}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      })
      .select()
      .single();

    if (expenseError) {
      console.log("AUTO POST RELEASED REQUEST ERROR:", expenseError.message);
      return {
        expenseData: null,
        error: expenseError.message,
      };
    }

    return {
      expenseData,
      error: null,
    };
  };

  const submitAction = async () => {
    if (!selectedRequest || !actionType) return;

    let payload: any = {};
    let autoPostedExpense: any = null;

    if (actionType === "APPROVE") {
      if (!actorName.trim() || !actorRole.trim()) {
        alert("Please enter approver name and role.");
        return;
      }

      payload = {
        status: "APPROVED",
        approved_by: actorName.trim(),
        approval_role: actorRole.trim(),
        approved_date: new Date().toISOString(),
        remarks: actionRemarks.trim() || selectedRequest.remarks || "",
      };
    }

    if (actionType === "REJECT") {
      if (!actionRemarks.trim()) {
        alert("Please enter rejection reason.");
        return;
      }

      payload = {
        status: "REJECTED",
        remarks: actionRemarks.trim(),
      };
    }

    if (actionType === "RELEASE") {
      if (!actorName.trim()) {
        alert("Please enter released by.");
        return;
      }

      if (selectedRequest.posted_to_expenses) {
        alert("This request is already posted to expenses.");
        return;
      }

      const releasedDate = new Date().toISOString();
      const releaseRemarks = actionRemarks.trim() || selectedRequest.remarks || "";

      const postResult = await postReleasedRequestToExpenses(
        selectedRequest,
        actorName.trim(),
        releasedDate,
        releaseRemarks
      );

      if (postResult.error) {
        alert(`Release cancelled. Failed to post to Expenses.\n\n${postResult.error}`);
        return;
      }

      autoPostedExpense = postResult.expenseData;

      payload = {
        status: "RELEASED",
        released_by: actorName.trim(),
        released_date: releasedDate,
        remarks: releaseRemarks,
        posted_to_expenses: true,
        posted_expense_id: autoPostedExpense?.id || null,
        posted_date: new Date().toISOString(),
      };
    }

    if (actionType === "LIQUIDATE") {
      if (!actorName.trim() || !actionRemarks.trim()) {
        alert("Please enter liquidated by and receipt/liquidation remarks.");
        return;
      }

      payload = {
        status: "LIQUIDATED",
        liquidated_by: actorName.trim(),
        liquidated_date: new Date().toISOString(),
        remarks: actionRemarks.trim(),
      };
    }

    const { error } = await supabase
      .from("expense_requests")
      .update(payload)
      .eq("id", selectedRequest.id);

    if (error) {
      console.log("UPDATE REQUEST ACTION ERROR:", error.message);
      alert(
        actionType === "RELEASE"
          ? "Expense was posted, but request status failed to update. Please review manually."
          : "Failed to update request."
      );
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: `${actionType} Expense Request`,
      description:
        actionType === "RELEASE"
          ? `Released and auto-posted ${selectedRequest.category} request to Expenses - ${formatMoney(selectedRequest.amount)}`
          : `${actionType} request ${selectedRequest.category} - ${formatMoney(selectedRequest.amount)}`,
      severity: actionType === "REJECT" ? "critical" : "warning",
      recordId: selectedRequest.id,
      oldValue: selectedRequest,
      newValue: {
        requestUpdate: payload,
        autoPostedExpense,
      },
    });

    closeAction();
    await getRequests();

    if (actionType === "RELEASE") {
      alert("Request released and automatically posted to Expenses Ledger.");
    }
  };

  /// FUNCTIONS - MANUAL POST RELEASED REQUEST TO EXPENSES (LEGACY / BACKUP)
  const postToExpenses = async (request: any) => {
    if (request.posted_to_expenses) {
      alert("This request is already posted to expenses.");
      return;
    }

    if (request.status !== "RELEASED" && request.status !== "LIQUIDATED") {
      alert("Only released or liquidated requests can be posted to expenses.");
      return;
    }

    const confirmPost = confirm("Post this released request to Expenses?");
    if (!confirmPost) return;

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        expense_date: request.released_date
          ? String(request.released_date).slice(0, 10)
          : request.request_date,
        category: request.category,
        subcategory: null,
        department: request.expense_area || request.department,
        description: request.reason,
        source: "Expense Request",
        amount: Number(request.amount || 0),
        payment_method: "Cash",
        remarks: `Posted from expense request by ${request.requested_by}. Request ID: ${request.id}. Released by: ${request.released_by || "-"}.`,
      })
      .select()
      .single();

    if (expenseError) {
      console.log("POST TO EXPENSES ERROR:", expenseError.message);
      alert("Failed to post to expenses.");
      return;
    }

    const { error: updateError } = await supabase
      .from("expense_requests")
      .update({
        posted_to_expenses: true,
        posted_expense_id: expenseData.id,
        posted_date: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) {
      console.log("UPDATE POSTED REQUEST ERROR:", updateError.message);
      alert("Expense was posted, but request was not updated.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: "Post Request To Expenses",
      description: `${request.category} request posted to expenses - ${formatMoney(request.amount)}`,
      severity: "warning",
      recordId: request.id,
      newValue: {
        request,
        expense: expenseData,
      },
    });

    alert("Posted to expenses successfully.");
    await getRequests();
  };

  /// FUNCTIONS - DELETE REQUEST
  const deleteRequest = async (request: any) => {
    if (request.posted_to_expenses) {
      alert("This request is already posted to expenses. Delete or reverse from Expenses first.");
      return;
    }

    const confirmDelete = confirm("Delete this request?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("expense_requests").delete().eq("id", request.id);

    if (error) {
      console.log("DELETE REQUEST ERROR:", error.message);
      alert("Failed to delete request.");
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: "Delete Expense Request",
      description: `Deleted expense request ${request.category} - ${formatMoney(request.amount)}`,
      severity: "critical",
      recordId: request.id,
      oldValue: request,
      newValue: { deleted: true },
    });

    await getRequests();
  };

  /// EFFECTS
  useEffect(() => {
    getFinanceSettings();
    getRequests();
  }, []);

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
<main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Finance Control
            </p>
            <h1 className="mt-2 text-3xl font-bold">Expense Requests</h1>
            <p className="mt-1 text-sm text-slate-400">
              Optional approval workflow for future request-to-release process. Turn it off when operations use direct expense posting.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              Workflow: {" "}
              <span className={approvalRequired ? "font-semibold text-amber-400" : "font-semibold text-emerald-400"}>
                {approvalRequired ? "Approval Required" : "Approval OFF / Direct Approved"}
              </span>
            </div>

            <button
              onClick={toggleApprovalWorkflow}
              disabled={isSavingSettings}
              className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                approvalRequired
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {isSavingSettings
                ? "Saving..."
                : approvalRequired
                ? "Turn Approval OFF"
                : "Turn Approval ON"}
            </button>
          </div>
        </div>

        {!approvalRequired && (
          <section className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <h2 className="text-lg font-black text-emerald-300">Direct Approval Mode</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-100">
              New requests will be saved as APPROVED automatically. This keeps the module ready for future approval workflow without forcing the hotel to use it today.
            </p>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Pending Requests" value={pendingCount} color="text-amber-400" />
          <SummaryCard title="Approved Requests" value={approvedCount} color="text-blue-400" />
          <SummaryCard title="Released Cash" value={formatMoney(releasedAmount)} color="text-purple-400" />
          <SummaryCard title="For Liquidation" value={forLiquidationCount} color="text-emerald-400" />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-bold">New Request</h2>

            <div className="mt-5 space-y-4">
              <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} style={{ colorScheme: "dark" }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select value={requestorType} onChange={(e) => setRequestorType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="Employee">Employee</option>
                <option value="Non Employee">Non Employee</option>
              </select>

              {requestorType === "Employee" ? (
                <>
                  <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>
                    ))}
                  </select>
                  <DepartmentCard department={selectedDepartment} emptyText="Select employee first" />
                </>
              ) : (
                <>
                  <input value={manualRequestorName} onChange={(e) => setManualRequestorName(e.target.value)} placeholder="Requestor name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
                  <input value={manualDepartment} onChange={(e) => setManualDepartment(e.target.value)} placeholder="Department / Source" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
                </>
              )}

              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="">Select category</option>
                {categories.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
              </select>

              <select value={expenseArea} onChange={(e) => setExpenseArea(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="">Select expense area</option>
                {areas.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
              </select>

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Requested amount" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>

              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Reason / purpose of request" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />

              <button onClick={submitRequest} disabled={isSubmitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? "Submitting..." : approvalRequired ? "Submit Request" : "Save as Approved Request"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold">Request Workflow</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Review pending, approved, released, and liquidated requests.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search request..." className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none">
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="RELEASED">Released</option>
                  <option value="LIQUIDATED">Liquidated</option>
                </select>
              </div>
            </div>

            <div className="max-h-[650px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[1250px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Requestor</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-4 py-3">{request.request_date}</td>
                      <td className="px-4 py-3"><p>{request.requested_by}</p><p className="text-xs text-slate-500">{request.requestor_type || "Employee"}</p></td>
                      <td className="px-4 py-3">{request.department}</td>
                      <td className="px-4 py-3">{request.category}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(request.amount)}</td>
                      <td className="px-4 py-3"><UrgencyBadge urgency={request.urgency} /></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}>{request.status}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p>Approved: {request.approved_by || "-"}</p>
                        <p>Released: {request.released_by || "-"}</p>
                        <p>Liquidated: {request.liquidated_by || "-"}</p>
                        <p>Posted: {request.posted_to_expenses ? <span className="text-emerald-400">Yes</span> : <span className="text-amber-400">No</span>}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {request.status === "PENDING" && approvalRequired && (
                            <>
                              <ActionButton label="Approve" color="blue" onClick={() => openAction(request, "APPROVE")} />
                              <ActionButton label="Reject" color="red" onClick={() => openAction(request, "REJECT")} />
                            </>
                          )}

                          {request.status === "APPROVED" && (
                            <ActionButton label="Release" color="purple" onClick={() => openAction(request, "RELEASE")} />
                          )}

                          {request.status === "RELEASED" && (
                            <>
                              {!request.posted_to_expenses && <ActionButton label="Post Expense" color="purple" onClick={() => postToExpenses(request)} />}
                              <ActionButton label="Liquidate" color="emerald" onClick={() => openAction(request, "LIQUIDATE")} />
                            </>
                          )}

                          <ActionButton label="Delete" color="slate" onClick={() => deleteRequest(request)} />
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No expense requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {selectedRequest && (
          <ActionModal
            actionType={actionType}
            selectedRequest={selectedRequest}
            actorName={actorName}
            actorRole={actorRole}
            actionRemarks={actionRemarks}
            setActorName={setActorName}
            setActorRole={setActorRole}
            setActionRemarks={setActionRemarks}
            closeAction={closeAction}
            submitAction={submitAction}
            formatMoney={formatMoney}
          />
        )}
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function DepartmentCard({ department, emptyText }: any) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Department</p>
      <p className="mt-2 text-lg font-bold text-white">{department || emptyText}</p>
    </div>
  );
}

function UrgencyBadge({ urgency }: any) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${urgency === "Urgent" ? "bg-red-500/10 text-red-400" : urgency === "Low" ? "bg-slate-700 text-slate-300" : "bg-blue-500/10 text-blue-400"}`}>
      {urgency}
    </span>
  );
}

function ActionButton({ label, color, onClick }: any) {
  const styles: any = {
    blue: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
    red: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    slate: "bg-slate-600 text-white hover:bg-slate-500",
  };

  return <button onClick={onClick} className={`rounded-lg px-3 py-1 text-xs font-semibold ${styles[color]}`}>{label}</button>;
}

function ActionModal({
  actionType,
  selectedRequest,
  actorName,
  actorRole,
  actionRemarks,
  setActorName,
  setActorRole,
  setActionRemarks,
  closeAction,
  submitAction,
  formatMoney,
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">{actionType}</p>
          <h2 className="mt-2 text-2xl font-bold">{selectedRequest.category} Ã¢â‚¬â€ {formatMoney(selectedRequest.amount)}</h2>
          <p className="mt-1 text-sm text-slate-400">Requested by {selectedRequest.requested_by} / {selectedRequest.department}</p>
        </div>

        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Reason</p>
          <p className="mt-2 leading-6">{selectedRequest.reason}</p>
        </div>

        {actionType !== "REJECT" && (
          <input
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
            placeholder={actionType === "APPROVE" ? "Approved by" : actionType === "RELEASE" ? "Released by" : "Liquidated by"}
            className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
          />
        )}

        {actionType === "APPROVE" && (
          <input value={actorRole} onChange={(e) => setActorRole(e.target.value)} placeholder="Approval role e.g. Supervisor, OM, Owner, CEO" className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" />
        )}

        <textarea
          value={actionRemarks}
          onChange={(e) => setActionRemarks(e.target.value)}
          rows={4}
          placeholder={actionType === "REJECT" ? "Reason for rejection" : actionType === "LIQUIDATE" ? "Receipt / liquidation remarks" : "Optional remarks"}
          className="mb-5 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
        />

        <div className="flex justify-end gap-3">
          <button onClick={closeAction} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
          <button onClick={submitAction} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">Confirm {actionType}</button>
        </div>
      </div>
    </div>
  );
}






