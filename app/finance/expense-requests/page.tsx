"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/SidebarV41";
import TopNavbar from "@/components/TopNavbar";
import PageGuard from "@/components/PageGuard";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export default function ExpenseRequestsPage() {
  /// STATES - DATABASE DATA
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [workflowSettings, setWorkflowSettings] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);

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
  const [dateScope, setDateScope] = useState("ALL");

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
    (employee) => String(employee.id) === String(selectedEmployee),
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
  const pendingCount = requests.filter(
    (item) => item.status === "PENDING",
  ).length;
  const approvedCount = requests.filter(
    (item) => item.status === "APPROVED",
  ).length;
  const releasedAmount = requests
    .filter(
      (item) => item.status === "RELEASED" || item.status === "LIQUIDATED",
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const forLiquidationCount = requests.filter(
    (item) => item.status === "RELEASED",
  ).length;

  /// CALCULATIONS - FILTERED TABLE
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;
      const matchesDate = dateScope === "ALL" ? true : item.request_date === today;
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.department || "")
          .toLowerCase()
          .includes(search) ||
        String(item.requested_by || "")
          .toLowerCase()
          .includes(search) ||
        String(item.category || "")
          .toLowerCase()
          .includes(search) ||
        String(item.reason || "")
          .toLowerCase()
          .includes(search);

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [requests, searchTerm, statusFilter, dateScope, today]);

  /// FUNCTIONS - FORMATTERS
  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getStatusStyle = (status: string) => {
    if (status === "PENDING")
      return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "APPROVED")
      return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
    if (status === "RELEASED")
      return "border-violet-200 bg-violet-50 text-violet-700";
    if (status === "LIQUIDATED")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const getLastAction = (request: any) => {
    if (request.liquidated_by) return `Liquidated by ${request.liquidated_by}`;
    if (request.released_by) return `Released by ${request.released_by}`;
    if (request.approved_by) return `Approved by ${request.approved_by}`;
    if (request.status === "REJECTED") return request.remarks || "Rejected";
    return approvalRequired ? "Awaiting manager approval" : "Direct approved";
  };

  /// PERMISSIONS
  const getCurrentUserPermissions = async () => {
    const currentEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    if (!currentEmployeeId) {
      setPermissions([]);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, system_role_id")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (employeeError || !employee?.system_role_id) {
      console.log(
        "EXPENSE REQUESTS PERMISSION EMPLOYEE ERROR:",
        employeeError?.message,
      );
      setPermissions([]);
      return;
    }

    const { data: rolePermissions, error: permissionError } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", employee.system_role_id);

    if (permissionError) {
      console.log(
        "EXPENSE REQUESTS PERMISSION ERROR:",
        permissionError.message,
      );
      setPermissions([]);
      return;
    }

    setPermissions(rolePermissions || []);
  };

  const hasPermission = (
    moduleKey: string,
    field:
      | "can_view"
      | "can_create"
      | "can_edit"
      | "can_delete"
      | "can_approve"
      | "can_release",
  ) => {
    return permissions.some(
      (permission) =>
        permission.module_key === moduleKey && permission[field] === true,
    );
  };

  const canCreateRequest = hasPermission("expense_requests", "can_create");
  const canApproveRequest = hasPermission("expense_requests", "can_approve");
  const canReleaseRequest = hasPermission("expense_requests", "can_release");
  const canDeleteRequest = hasPermission("expense_requests", "can_delete");
  const canManageWorkflow =
    hasPermission("expense_requests", "can_edit") ||
    hasPermission("approval_controls", "can_edit");

  /// FUNCTIONS - GET DATA
  const getFinanceSettings = async () => {
    const { data: employeesData, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .order("first_name", { ascending: true });

    if (employeesError)
      console.log("GET EMPLOYEES ERROR:", employeesError.message);

    // IMPORTANT: Use the same category table as the main Expenses page.
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError)
      console.log("GET CATEGORIES ERROR:", categoriesError.message);

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

    if (workflowError)
      console.log("GET WORKFLOW SETTINGS ERROR:", workflowError.message);

    if (!workflowData) {
      const { data: insertedWorkflow, error: insertWorkflowError } =
        await supabase
          .from("finance_workflow_settings")
          .insert({ require_expense_approval: false })
          .select("*")
          .single();

      if (insertWorkflowError) {
        console.log(
          "CREATE WORKFLOW SETTINGS ERROR:",
          insertWorkflowError.message,
        );
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
    if (!canManageWorkflow) {
      alert("Access denied.");
      return;
    }

    if (isSavingSettings) return;

    const nextValue = !approvalRequired;
    const confirmed = confirm(
      nextValue
        ? "Turn ON expense approval workflow? New requests will start as Pending."
        : "Turn OFF expense approval workflow? New requests will be Approved automatically.",
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
    if (!canCreateRequest) {
      alert("Access denied.");
      return;
    }

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
      remarks: approvalRequired
        ? ""
        : "Auto-approved because expense approval workflow is OFF.",
    };

    if (!approvalRequired) {
      payload.approved_by = "System";
      payload.approval_role = "Direct Approval";
      payload.approved_date = nowIso;
    }

    const { data: newRequest, error } = await supabase
      .from("expense_requests")
      .insert(payload)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      console.log("SUBMIT EXPENSE REQUEST ERROR:", error.message);
      alert("Failed to submit expense request.");
      return;
    }

    if (approvalRequired && newRequest) {
      const { error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          request_type: "EXPENSE_REQUEST",
          module: "Finance",
          reference_id: String(newRequest.id),
          title: `${category} - ${formatMoney(amountValue)}`,
          description: `${reason.trim()} | Area: ${expenseArea} | Urgency: ${urgency}`,
          requested_by: finalRequestedBy,
          status: "PENDING",
        });

      if (approvalError) {
        console.log("CREATE APPROVAL REQUEST ERROR:", approvalError.message);
        alert(
          "Expense request was saved, but approval center record was not created.",
        );
      }
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action: approvalRequired
        ? "Submit Expense Request"
        : "Submit Direct Approved Request",
      description: `${finalRequestedBy} submitted ${category} request for ${formatMoney(amountValue)}. Status: ${defaultStatus}`,
      severity: approvalRequired ? "info" : "warning",
      newValue: payload,
    });

    resetRequestForm();
    await getRequests();
  };

  /// FUNCTIONS - ACTION MODAL
  const openAction = (request: any, action: string) => {
    if (["APPROVE", "REJECT"].includes(action) && !canApproveRequest) {
      alert("Access denied.");
      return;
    }

    if (["RELEASE", "LIQUIDATE"].includes(action) && !canReleaseRequest) {
      alert("Access denied.");
      return;
    }

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

  const submitAction = async () => {
    if (!selectedRequest || !actionType) return;

    if (["APPROVE", "REJECT"].includes(actionType) && !canApproveRequest) {
      alert("Access denied.");
      return;
    }

    if (["RELEASE", "LIQUIDATE"].includes(actionType) && !canReleaseRequest) {
      alert("Access denied.");
      return;
    }

    let payload: any = {};
    let postedExpenseData: any = null;

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

      const releasedAt = new Date().toISOString();

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          expense_date: String(releasedAt).slice(0, 10),
          category: selectedRequest.category,
          subcategory: null,
          department:
            selectedRequest.expense_area || selectedRequest.department,
          description: selectedRequest.reason,
          source: "Expense Request",
          amount: Number(selectedRequest.amount || 0),
          payment_method: "Cash",
          remarks: `Auto-posted from approved expense request. Request ID: ${selectedRequest.id}. Requested by: ${selectedRequest.requested_by}. Released by: ${actorName.trim()}.`,
        })
        .select()
        .single();

      if (expenseError) {
        console.log(
          "AUTO POST RELEASE TO EXPENSES ERROR:",
          expenseError.message,
        );
        alert("Release failed because posting to Expenses failed.");
        return;
      }

      postedExpenseData = expenseData;

      payload = {
        status: "RELEASED",
        released_by: actorName.trim(),
        released_date: releasedAt,
        remarks: actionRemarks.trim() || selectedRequest.remarks || "",
        posted_to_expenses: true,
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
          ? `Expense was posted, but request status was not updated. ${error.message}`
          : `Failed to update request. ${error.message}`,
      );
      return;
    }

    await createAuditLog({
      userName: "OPSCORE USER",
      module: "Expense Requests",
      action:
        actionType === "RELEASE"
          ? "Release Expense Request and Auto Post"
          : `${actionType} Expense Request`,
      description:
        actionType === "RELEASE"
          ? `Released and posted ${selectedRequest.category} request to expenses - ${formatMoney(selectedRequest.amount)}`
          : `${actionType} request ${selectedRequest.category} - ${formatMoney(selectedRequest.amount)}`,
      severity: actionType === "REJECT" ? "critical" : "warning",
      recordId: selectedRequest.id,
      oldValue: selectedRequest,
      newValue: {
        requestUpdate: payload,
        postedExpense: postedExpenseData,
      },
    });

    closeAction();
    await getRequests();

    if (actionType === "RELEASE") {
      alert("Released and posted to Expenses successfully.");
    }
  };

  /// FUNCTIONS - POST RELEASED REQUEST TO EXPENSES
  const postToExpenses = async (request: any) => {
    if (!canReleaseRequest) {
      alert("Access denied.");
      return;
    }

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
      })
      .eq("id", request.id);

    if (updateError) {
      console.log("UPDATE POSTED REQUEST ERROR:", updateError.message);
      alert(
        `Expense was posted, but request was not updated. ${updateError.message}`,
      );
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
    if (!canDeleteRequest) {
      alert("Access denied.");
      return;
    }

    if (request.posted_to_expenses) {
      alert(
        "This request is already posted to expenses. Delete or reverse from Expenses first.",
      );
      return;
    }

    const confirmDelete = confirm("Delete this request?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("expense_requests")
      .delete()
      .eq("id", request.id);

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
    getCurrentUserPermissions();
    getFinanceSettings();
    getRequests();
  }, []);

  /// UI
  return (
    <PageGuard moduleKey="expense_requests">
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
          <TopNavbar />

          <div className="px-4 pb-6 pt-20 sm:px-6 lg:px-7">
            {/* PAGE HEADER */}
            <section className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Finance
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Expense Requests
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Request, approve, release, and liquidate operational expenses.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    approvalRequired ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    approvalRequired ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {approvalRequired ? "Approval workflow active" : "Direct approval mode"}
                </span>
              </div>
            </section>

            {/* ENTRY FORM */}
            <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Expense Request Entry
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Request Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Encode the request details once, then route it through
                  approval and release.
                </p>
              </div>

              {!canCreateRequest ? (
                <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  View-only access. You can review requests, but you cannot
                  submit new expense requests.
                </div>
              ) : (
                <div className="space-y-3.5 p-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    <FieldLabel label="Request Date">
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </FieldLabel>

                    <FieldLabel label="Requestor Type">
                      <select
                        value={requestorType}
                        onChange={(e) => setRequestorType(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="Employee">Employee</option>
                        <option value="Non Employee">Non Employee</option>
                      </select>
                    </FieldLabel>

                    {requestorType === "Employee" ? (
                      <FieldLabel label="Employee">
                        <select
                          value={selectedEmployee}
                          onChange={(e) => setSelectedEmployee(e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          <option value="">Select employee</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name}
                            </option>
                          ))}
                        </select>
                      </FieldLabel>
                    ) : (
                      <FieldLabel label="Requestor Name">
                        <input
                          value={manualRequestorName}
                          onChange={(e) =>
                            setManualRequestorName(e.target.value)
                          }
                          placeholder="Name"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </FieldLabel>
                    )}

                    <DepartmentCard
                      department={selectedDepartment}
                      emptyText="No department selected"
                    />
                  </div>

                  {requestorType !== "Employee" && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FieldLabel label="Department / Source">
                        <input
                          value={manualDepartment}
                          onChange={(e) => setManualDepartment(e.target.value)}
                          placeholder="Department or source"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </FieldLabel>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FieldLabel label="Category">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select category</option>
                        {categories.map((item) => (
                          <option key={item.id || item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>

                    <FieldLabel label="Expense Area">
                      <select
                        value={expenseArea}
                        onChange={(e) => setExpenseArea(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select expense area</option>
                        {areas.map((item) => (
                          <option key={item.id || item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>

                    <FieldLabel label="Amount">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                          ₱
                        </span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-lg font-black text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </FieldLabel>

                    <FieldLabel label="Urgency">
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </FieldLabel>
                  </div>

                  <FieldLabel label="Reason / Purpose">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="Describe the operational purpose of this expense request."
                      className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </FieldLabel>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetRequestForm}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={submitRequest}
                      disabled={isSubmitting}
                      className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : approvalRequired
                          ? "Submit Request"
                          : "Save as Approved Request"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* KPI CARDS */}
            <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Pending Approval"
                value={pendingCount}
                helper="Awaiting review"
              />
              <SummaryCard
                title="Ready For Release"
                value={approvedCount}
                helper="Ready for cashier release"
              />
              <SummaryCard
                title="Released This Month"
                value={formatMoney(releasedAmount)}
                helper="Released this period"
              />
              <SummaryCard
                title="Pending Liquidation"
                value={forLiquidationCount}
                helper="Receipt follow-up required"
              />
            </section>

            {/* REQUEST TABLE */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Expense Request Log
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review pending, approved, released, and liquidated requests.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search request..."
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="RELEASED">Released</option>
                    <option value="LIQUIDATED">Liquidated</option>
                  </select>
                  <select
                    value={dateScope}
                    onChange={(e) => setDateScope(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today</option>
                  </select>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Requestor</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Urgency</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Action</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="text-slate-700 transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                          {request.request_date}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">
                            {request.requested_by}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {request.requestor_type || "Employee"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {request.department}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {request.category}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatMoney(request.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <UrgencyBadge urgency={request.urgency} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                          <p>{getLastAction(request)}</p>
                          <p className="mt-1">
                            Posted:{" "}
                            {request.posted_to_expenses ? (
                              <span className="text-emerald-700">Yes</span>
                            ) : (
                              <span className="text-amber-700">No</span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {request.status === "PENDING" &&
                              approvalRequired &&
                              canApproveRequest && (
                                <>
                                  <ActionButton
                                    label="Approve"
                                    color="blue"
                                    onClick={() =>
                                      openAction(request, "APPROVE")
                                    }
                                  />
                                  <ActionButton
                                    label="Reject"
                                    color="red"
                                    onClick={() =>
                                      openAction(request, "REJECT")
                                    }
                                  />
                                </>
                              )}

                            {request.status === "PENDING" &&
                              approvalRequired &&
                              !canApproveRequest && (
                                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                  Awaiting Approval
                                </span>
                              )}

                            {request.status === "APPROVED" &&
                              !request.posted_to_expenses &&
                              canReleaseRequest && (
                                <ActionButton
                                  label="Release Cash"
                                  color="purple"
                                  onClick={() => openAction(request, "RELEASE")}
                                />
                              )}

                            {request.status === "RELEASED" && (
                              <>
                                {request.posted_to_expenses ? (
                                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    Posted
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                      Ready for Posting
                                    </span>
                                    {canReleaseRequest && (
                                      <ActionButton
                                        label="Post Now"
                                        color="purple"
                                        onClick={() => postToExpenses(request)}
                                      />
                                    )}
                                  </>
                                )}
                                {canReleaseRequest && (
                                  <ActionButton
                                    label="Liquidate"
                                    color="emerald"
                                    onClick={() =>
                                      openAction(request, "LIQUIDATE")
                                    }
                                  />
                                )}
                              </>
                            )}

                            {!request.posted_to_expenses &&
                              canDeleteRequest && (
                                <ActionButton
                                  label="Delete"
                                  color="slate"
                                  onClick={() => deleteRequest(request)}
                                />
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredRequests.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-sm font-medium text-slate-500"
                        >
                          No expense requests found.
                        </td>
                      </tr>
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
    </PageGuard>
  );
}

function FieldLabel({ label, children }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value, helper }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold text-slate-500">{title}</p>
      <h2 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function DepartmentCard({ department, emptyText }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Department
      </span>
      <div className="flex h-11 w-full items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
        {department || "—"}
      </div>
    </label>
  );
}

function UrgencyBadge({ urgency }: any) {
  const className =
    urgency === "Urgent"
      ? "border-red-200 bg-red-50 text-red-700"
      : urgency === "Low"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {urgency || "Normal"}
    </span>
  );
}

function ActionButton({ label, color, onClick }: any) {
  const styles: any = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    purple:
      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${styles[color]}`}
    >
      {label}
    </button>
  );
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
  const primaryLabel =
    actionType === "APPROVE"
      ? "Approve Request"
      : actionType === "REJECT"
        ? "Reject Request"
        : actionType === "RELEASE"
          ? "Release Cash"
          : actionType === "LIQUIDATE"
            ? "Mark Liquidated"
            : `Confirm ${actionType}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Expense Request Review
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {selectedRequest.category} — {formatMoney(selectedRequest.amount)}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Requested by {selectedRequest.requested_by} /{" "}
            {selectedRequest.department}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <MiniDetail label="Status" value={selectedRequest.status} />
            <MiniDetail
              label="Urgency"
              value={selectedRequest.urgency || "Normal"}
            />
            <MiniDetail
              label="Area"
              value={selectedRequest.expense_area || "-"}
            />
            <MiniDetail
              label="Date"
              value={selectedRequest.request_date || "-"}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Reason
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
              {selectedRequest.reason}
            </p>
          </div>

          {actionType !== "REJECT" && (
            <FieldLabel
              label={
                actionType === "APPROVE"
                  ? "Approved By"
                  : actionType === "RELEASE"
                    ? "Released By"
                    : "Liquidated By"
              }
            >
              <input
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="Name"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </FieldLabel>
          )}

          {actionType === "APPROVE" && (
            <FieldLabel label="Approval Role">
              <input
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                placeholder="Supervisor, Operations Manager, Owner"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </FieldLabel>
          )}

          <FieldLabel
            label={
              actionType === "REJECT"
                ? "Rejection Reason"
                : actionType === "LIQUIDATE"
                  ? "Liquidation Notes"
                  : "Remarks"
            }
          >
            <textarea
              value={actionRemarks}
              onChange={(e) => setActionRemarks(e.target.value)}
              rows={4}
              placeholder={
                actionType === "REJECT"
                  ? "Reason for rejection"
                  : actionType === "LIQUIDATE"
                    ? "Receipt / liquidation remarks"
                    : "Optional remarks"
              }
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </FieldLabel>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={closeAction}
            className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitAction}
            className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniDetail({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
