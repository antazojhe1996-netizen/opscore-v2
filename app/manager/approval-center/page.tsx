"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";

const CASH_DRAWER_REQUEST_TYPES = [
  "CASH_DRAWER_OUT",
  "CASH_EXPENSE_RELEASE",
  "CASH_ADVANCE_RELEASE",
  "OWNER_WITHDRAWAL",
  "BANK_DEPOSIT",
  "REFUND_OUT",
  "ADJUSTMENT_OUT",
];

export default function ApprovalCenterPage() {
  /// STATES
  const [requests, setRequests] = useState<any[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);
  const [approvalAssignments, setApprovalAssignments] = useState<any[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  /// FUNCTIONS
  const getApprovalRequests = async () => {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("APPROVAL REQUESTS ERROR:", error.message);
      return;
    }

    setRequests(data || []);
  };

  const getApprovalSecuritySetup = async () => {
    const localEmployeeId =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_id")
        : null;

    const localEmployeeName =
      typeof window !== "undefined"
        ? localStorage.getItem("opscore_current_employee_name") || ""
        : "";

    setCurrentEmployeeId(localEmployeeId);
    setCurrentEmployeeName(localEmployeeName);

    const { data: workflowData, error: workflowError } = await supabase
      .from("approval_workflows")
      .select("*")
      .eq("is_active", true);

    if (workflowError) {
      console.log("GET APPROVAL WORKFLOWS ERROR:", workflowError.message);
      setApprovalWorkflows([]);
    } else {
      setApprovalWorkflows(workflowData || []);
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("approval_assignments")
      .select("*")
      .eq("is_active", true);

    if (assignmentError) {
      console.log("GET APPROVAL ASSIGNMENTS ERROR:", assignmentError.message);
      setApprovalAssignments([]);
    } else {
      setApprovalAssignments(assignmentData || []);
    }
  };

  const refreshApprovalCenter = async () => {
    await getApprovalSecuritySetup();
    await getApprovalRequests();
  };

  const formatMoney = (value: any) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getPayload = (request: any) => {
    if (!request?.request_payload) return null;

    if (typeof request.request_payload === "string") {
      try {
        return JSON.parse(request.request_payload);
      } catch (error) {
        return null;
      }
    }

    return request.request_payload;
  };

  const formatDateTime = (value: any) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: any = {
      EXPENSE_REQUEST: "💰 Expense Request",
      CASH_DRAWER_OUT: "🏦 Cash Drawer Out",
      CASH_EXPENSE_RELEASE: "🏦 Cash Expense Release",
      CASH_ADVANCE_RELEASE: "👤 Cash Advance Release",
      OWNER_WITHDRAWAL: "🏧 Owner Withdrawal",
      BANK_DEPOSIT: "🏦 Bank Deposit",
      REFUND_OUT: "↩️ Refund Out",
      ADJUSTMENT_OUT: "⚖️ Adjustment Out",
      PAYROLL_ADJUSTMENT: "🧾 Payroll Adjustment",
      LEAVE_REQUEST: "🏖 Leave Request",
      LEAVE_CANCELLATION: "↩️ Leave Cancellation",
    };

    return labels[type] || type;
  };

  const getRequestTypeBadgeStyle = (type: string) => {
    if (type === "EXPENSE_REQUEST") return "bg-blue-100 text-blue-700";
    if (type === "PAYROLL_ADJUSTMENT") return "bg-indigo-100 text-indigo-700";
    if (type === "LEAVE_REQUEST") return "bg-emerald-100 text-emerald-700";
    if (type === "LEAVE_CANCELLATION") return "bg-orange-100 text-orange-700";
    if (type === "CASH_ADVANCE_RELEASE") return "bg-purple-100 text-purple-700";
    if (type === "OWNER_WITHDRAWAL") return "bg-red-100 text-red-700";
    if (CASH_DRAWER_REQUEST_TYPES.includes(type)) return "bg-amber-100 text-amber-700";

    return "bg-slate-100 text-slate-700";
  };

  const getWorkflowKeyForRequest = (request: any) => {
    if (!request?.request_type) return "";

    if (request.request_type === "CASH_EXPENSE_RELEASE") return "CASH_DRAWER_OUT";
    if (request.request_type === "CASH_ADVANCE_RELEASE") return "CASH_DRAWER_OUT";
    if (request.request_type === "REFUND_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "ADJUSTMENT_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "LEAVE_CANCELLATION") return "LEAVE_REQUEST";

    return request.request_type;
  };

  const getWorkflowForRequest = (request: any) => {
    const workflowKey = getWorkflowKeyForRequest(request);

    return (
      approvalWorkflows.find(
        (workflow) => String(workflow.workflow_key || "") === String(workflowKey)
      ) || null
    );
  };

  const getApproverRoleForRequest = (request: any) => {
    const workflow = getWorkflowForRequest(request);
    return workflow?.approver_role || "MANAGER";
  };

  const getAssignedApproversForRequest = (request: any) => {
    const approverRole = getApproverRoleForRequest(request);

    return approvalAssignments.filter(
      (assignment) =>
        String(assignment.approval_role || "") === String(approverRole) &&
        assignment.is_active !== false &&
        assignment.employee_id
    );
  };

  const canCurrentUserApproveRequest = (request: any) => {
    const assignedApprovers = getAssignedApproversForRequest(request);

    if (!currentEmployeeId || assignedApprovers.length === 0) return false;

    return assignedApprovers.some(
      (assignment) => String(currentEmployeeId) === String(assignment.employee_id)
    );
  };

  const getAssignedApproverLabel = (request: any) => {
    const assignedApprovers = getAssignedApproversForRequest(request);

    if (assignedApprovers.length === 0) return "No active assigned approver";

    const currentUserIsAssigned = assignedApprovers.some(
      (assignment) => String(currentEmployeeId || "") === String(assignment.employee_id || "")
    );

    if (currentUserIsAssigned) {
      const otherCount = assignedApprovers.length - 1;
      return `${currentEmployeeName || "Current User"}${otherCount > 0 ? ` + ${otherCount} more` : ""}`;
    }

    return `${assignedApprovers.length} active approver${assignedApprovers.length > 1 ? "s" : ""}`;
  };

  const getRequestCategory = (requestType: string) => {
    if (requestType === "EXPENSE_REQUEST") return "FINANCE";

    if (CASH_DRAWER_REQUEST_TYPES.includes(requestType)) {
      return "CASH";
    }

    if (requestType === "PAYROLL_ADJUSTMENT") {
      return "PAYROLL";
    }

    if (requestType === "LEAVE_REQUEST" || requestType === "LEAVE_CANCELLATION") {
      return "LEAVE";
    }

    return "OTHER";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      ALL: "All",
      FINANCE: "Finance",
      CASH: "Cash",
      PAYROLL: "Payroll",
      LEAVE: "Leave",
      OTHER: "Other",
    };

    return labels[category] || category;
  };

  const executeCashDrawerMovement = async (request: any) => {
    const payload = getPayload(request);

    if (!payload) {
      alert("Missing cash drawer approval payload. Check approval_requests.request_payload column.");
      return false;
    }

    const amountValue = Number(payload.amount || 0);

    if (amountValue <= 0) {
      alert("Invalid approval amount.");
      return false;
    }

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        business_date: payload.business_date,
        movement_type: payload.movement_type,
        source: payload.source,
        payment_type: payload.payment_type || "Cash",
        amount: amountValue,
        from_person: payload.from_person || "",
        to_person: payload.to_person || "",
        encoded_by: payload.encoded_by || currentEmployeeName || "Manager Approval Center",
        remarks: payload.remarks || request.description || "Approved cash drawer movement",
        reference_type: payload.should_create_expense ? "expense" : null,
        reference_id: null,
        cash_drawer_id: payload.cash_drawer_id || null,
      })
      .select()
      .single();

    if (movementError) {
      console.log("APPROVED CASH MOVEMENT INSERT ERROR:", movementError.message);
      alert(`Approval saved failed before drawer posting. ${movementError.message}`);
      return false;
    }

    let createdExpenseData: any = null;
    let createdBalanceData: any = null;

    if (payload.should_create_expense) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          expense_date: payload.business_date,
          category: payload.is_cash_advance_cash_out
            ? "Cash Advance"
            : payload.expense_category,
          subcategory: payload.is_cash_advance_cash_out
            ? "Cash Advance Release"
            : payload.expense_subcategory || null,
          department: payload.is_cash_advance_cash_out
            ? "Payroll"
            : payload.expense_department,
          description: payload.is_cash_advance_cash_out
            ? `Cash Advance - ${payload.cash_advance_employee_name || ""}`
            : payload.expense_description,
          amount: amountValue,
          payment_method: "Cash",
          employee_id: payload.is_cash_advance_cash_out
            ? payload.cash_advance_employee_id || null
            : null,
          employee_name: payload.is_cash_advance_cash_out
            ? payload.cash_advance_employee_name || null
            : null,
          deduct_to_payroll: Boolean(payload.is_cash_advance_cash_out),
          payroll_period_id: payload.is_cash_advance_cash_out
            ? payload.payroll_period_id || null
            : null,
          remarks: payload.is_cash_advance_cash_out
            ? `Source: Cash Drawer Approval. Auto linked to: ${payload.payroll_period_label || "Payroll Period"}. ${payload.cash_advance_purpose || ""} ${payload.remarks || ""}`.trim()
            : `${payload.remarks || ""}${payload.expense_released_to ? ` Released to: ${payload.expense_released_to}` : ""}`.trim(),
          source: payload.is_cash_advance_cash_out
            ? "Cash Drawer - Cash Advance"
            : "Cash Drawer",
          posted_to_cash_movements: true,
          cash_movement_id: movementData.id,
          cash_posted_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        console.log("APPROVED CASH MOVEMENT EXPENSE ERROR:", expenseError.message);
        alert("Cash movement was posted, but linked expense failed. Check expenses table columns.");
        return false;
      }

      createdExpenseData = expenseData;

      await supabase
        .from("finance_cash_movements")
        .update({ reference_id: expenseData.id })
        .eq("id", movementData.id);

      if (payload.is_cash_advance_cash_out) {
        const { data: balanceData, error: balanceError } = await supabase
          .from("employee_balances")
          .insert({
            employee_id: payload.cash_advance_employee_id,
            employee_name: payload.cash_advance_employee_name,
            balance_type: "Cash Advance",
            original_amount: amountValue,
            remaining_balance: amountValue,
            status: "Active",
            source_module: "Cash Drawer",
            source_id: movementData.id,
            period_id: payload.payroll_period_id || null,
            remarks: `Source: Cash Drawer Approval. Expense ID: ${expenseData.id}. Cash Movement ID: ${movementData.id}. ${payload.cash_advance_purpose || ""}`,
          })
          .select()
          .single();

        if (balanceError) {
          console.log("APPROVED CASH ADVANCE BALANCE ERROR:", balanceError.message);
          alert("Cash advance posted to drawer and expenses, but employee balance failed.");
        } else {
          createdBalanceData = balanceData;

          await supabase
            .from("expenses")
            .update({ employee_balance_id: balanceData.id })
            .eq("id", expenseData.id);

          if (payload.payroll_period_id) {
            await supabase
              .from("payroll_periods")
              .update({ needs_regeneration: true })
              .eq("id", payload.payroll_period_id);
          }
        }
      }
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Approve Cash Drawer Movement",
      description: `${request.request_type} approved and posted - ${formatMoney(amountValue)}`,
      severity: "warning",
      recordId: request.id,
      newValue: {
        approvalRequest: request,
        movement: movementData,
        expense: createdExpenseData,
        employeeBalance: createdBalanceData,
      },
    });

    return true;
  };


  const syncLeaveRequestApproval = async (request: any) => {
    if (request.request_type !== "LEAVE_REQUEST" || !request.reference_id) {
      return true;
    }

    const payload = getPayload(request);

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "Approved",
        approved_by: currentEmployeeName || "Manager Approval Center",
        approved_at: new Date().toISOString(),
      })
      .eq("id", request.reference_id);

    if (error) {
      console.log("SYNC LEAVE REQUEST APPROVAL ERROR:", error.message);
      alert("Approval saved failed before leave request sync. Check leave_requests columns.");
      return false;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Approve Leave Request",
      description: `${request.title || "Leave Request"} approved for ${payload?.employee_name || request.requested_by || "employee"}`,
      severity: "info",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "APPROVED",
        leaveRequestId: request.reference_id,
        approvedBy: currentEmployeeName || "Manager Approval Center",
        payload,
      },
    });

    return true;
  };

  const syncLeaveRequestRejection = async (request: any, reason: string) => {
    if (request.request_type !== "LEAVE_REQUEST" || !request.reference_id) {
      return true;
    }

    const payload = getPayload(request);

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "Rejected",
        rejected_by: currentEmployeeName || "Manager Approval Center",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", request.reference_id);

    if (error) {
      console.log("SYNC LEAVE REQUEST REJECTION ERROR:", error.message);
      alert("Rejection saved failed before leave request sync. Check leave_requests columns.");
      return false;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Reject Leave Request",
      description: `${request.title || "Leave Request"} rejected. Reason: ${reason}`,
      severity: "warning",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "REJECTED",
        leaveRequestId: request.reference_id,
        rejectedBy: currentEmployeeName || "Manager Approval Center",
        rejectionReason: reason,
        payload,
      },
    });

    return true;
  };


  const syncLeaveCancellationApproval = async (request: any) => {
    if (request.request_type !== "LEAVE_CANCELLATION" || !request.reference_id) {
      return true;
    }

    const payload = getPayload(request);
    const finalReason =
      payload?.cancellation_reason ||
      payload?.reason ||
      request.description ||
      "Leave cancellation approved by manager.";

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "Cancelled",
        cancelled_by: currentEmployeeName || "Manager Approval Center",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: finalReason,
      })
      .eq("id", request.reference_id);

    if (error) {
      console.log("SYNC LEAVE CANCELLATION APPROVAL ERROR:", error.message);
      alert("Approval saved failed before leave cancellation sync. Check leave_requests cancellation columns.");
      return false;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Approve Leave Cancellation",
      description: `${request.title || "Leave Cancellation"} approved for ${payload?.employee_name || request.requested_by || "employee"}`,
      severity: "warning",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "CANCELLED",
        leaveRequestId: request.reference_id,
        cancelledBy: currentEmployeeName || "Manager Approval Center",
        cancellationReason: finalReason,
        payload,
      },
    });

    return true;
  };

  const syncLeaveCancellationRejection = async (request: any, reason: string) => {
    if (request.request_type !== "LEAVE_CANCELLATION" || !request.reference_id) {
      return true;
    }

    const payload = getPayload(request);

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Reject Leave Cancellation",
      description: `${request.title || "Leave Cancellation"} rejected. Original leave remains approved. Reason: ${reason}`,
      severity: "warning",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "CANCELLATION_REJECTED",
        leaveRequestId: request.reference_id,
        rejectedBy: currentEmployeeName || "Manager Approval Center",
        rejectionReason: reason,
        payload,
      },
    });

    return true;
  };

  const approveRequest = async (request: any) => {
    if (!request?.id || isProcessing) return;

    if (!canCurrentUserApproveRequest(request)) {
      alert("You are not assigned as approver for this request.");
      return;
    }

    setIsProcessing(true);

    if (CASH_DRAWER_REQUEST_TYPES.includes(request.request_type)) {
      const executed = await executeCashDrawerMovement(request);

      if (!executed) {
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "PAYROLL_ADJUSTMENT" && request.reference_id) {
      const { error: adjustmentError } = await supabase
        .from("payroll_adjustments")
        .update({
          status: "Approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.reference_id);

      if (adjustmentError) {
        console.log("SYNC PAYROLL ADJUSTMENT APPROVAL ERROR:", adjustmentError.message);
        alert("Approval saved failed before payroll adjustment sync.");
        setIsProcessing(false);
        return;
      }

      const payload = getPayload(request);
      if (payload?.period_id) {
        await supabase
          .from("payroll_periods")
          .update({ needs_regeneration: true })
          .eq("id", payload.period_id);
      }
    }

    if (request.request_type === "EXPENSE_REQUEST" && request.reference_id) {
      const { error: expenseRequestError } = await supabase
        .from("expense_requests")
        .update({
          status: "APPROVED",
          approved_by: currentEmployeeName || "Manager Approval Center",
          approval_role: getApproverRoleForRequest(request),
          approved_date: new Date().toISOString(),
        })
        .eq("id", request.reference_id);

      if (expenseRequestError) {
        console.log("SYNC EXPENSE REQUEST APPROVAL ERROR:", expenseRequestError.message);
        alert("Approval saved failed before expense request sync.");
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "LEAVE_REQUEST") {
      const synced = await syncLeaveRequestApproval(request);

      if (!synced) {
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "LEAVE_CANCELLATION") {
      const synced = await syncLeaveCancellationApproval(request);

      if (!synced) {
        setIsProcessing(false);
        return;
      }
    }

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "APPROVED",
        approved_by: currentEmployeeName || "Manager Approval Center",
        approved_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    setIsProcessing(false);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshApprovalCenter();
    setSelectedRequest(null);
    setActiveTab("APPROVED");
  };

  const rejectRequest = async (request: any, reason: string) => {
    if (!request?.id || isProcessing) return;

    const finalReason = reason.trim();

    if (!finalReason) {
      alert("Please enter rejection reason.");
      return;
    }

    if (!canCurrentUserApproveRequest(request)) {
      alert("You are not assigned as approver for this request.");
      return;
    }

    setIsProcessing(true);

    if (request.request_type === "PAYROLL_ADJUSTMENT" && request.reference_id) {
      const { error: adjustmentError } = await supabase
        .from("payroll_adjustments")
        .update({
          status: "Rejected",
          remarks: finalReason,
        })
        .eq("id", request.reference_id);

      if (adjustmentError) {
        console.log("SYNC PAYROLL ADJUSTMENT REJECTION ERROR:", adjustmentError.message);
        alert("Rejection saved failed before payroll adjustment sync.");
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "EXPENSE_REQUEST" && request.reference_id) {
      const { error: expenseRequestError } = await supabase
        .from("expense_requests")
        .update({
          status: "REJECTED",
          remarks: finalReason,
        })
        .eq("id", request.reference_id);

      if (expenseRequestError) {
        console.log("SYNC EXPENSE REQUEST REJECTION ERROR:", expenseRequestError.message);
        alert("Rejection saved failed before expense request sync.");
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "LEAVE_REQUEST") {
      const synced = await syncLeaveRequestRejection(request, finalReason);

      if (!synced) {
        setIsProcessing(false);
        return;
      }
    }

    if (request.request_type === "LEAVE_CANCELLATION") {
      const synced = await syncLeaveCancellationRejection(request, finalReason);

      if (!synced) {
        setIsProcessing(false);
        return;
      }
    }

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "REJECTED",
        rejected_by: currentEmployeeName || "Manager Approval Center",
        rejected_at: new Date().toISOString(),
        rejection_reason: finalReason,
      })
      .eq("id", request.id);

    setIsProcessing(false);

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Reject Approval Request",
      description: `${request.request_type} rejected. Reason: ${finalReason}`,
      severity: "warning",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "REJECTED",
        rejectedBy: currentEmployeeName || "Manager Approval Center",
        rejectionReason: finalReason,
      },
    });

    await refreshApprovalCenter();
    setSelectedRequest(null);
    setShowRejectModal(false);
    setRejectReason("");
    setActiveTab("REJECTED");
  };

  useEffect(() => {
    refreshApprovalCenter();

    const handleStorageChange = () => {
      refreshApprovalCenter();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /// CALCULATIONS
  const visibleRequests = requests.filter((request) =>
    canCurrentUserApproveRequest(request)
  );

  const pendingRequests = visibleRequests.filter((r) => r.status === "PENDING");
  const approvedRequests = visibleRequests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = visibleRequests.filter((r) => r.status === "REJECTED");

  const getCategoryCount = (status: string, category: string) => {
    return visibleRequests.filter((request) => {
      const statusMatch = request.status === status;
      const categoryMatch =
        category === "ALL" || getRequestCategory(request.request_type) === category;

      return statusMatch && categoryMatch;
    }).length;
  };

  const categoryItems = [
    { key: "ALL", label: "All", count: getCategoryCount(activeTab, "ALL") },
    { key: "FINANCE", label: "Finance", count: getCategoryCount(activeTab, "FINANCE") },
    { key: "CASH", label: "Cash", count: getCategoryCount(activeTab, "CASH") },
    { key: "PAYROLL", label: "Payroll", count: getCategoryCount(activeTab, "PAYROLL") },
    { key: "LEAVE", label: "Leave", count: getCategoryCount(activeTab, "LEAVE") },
  ];

  const filteredRequests = visibleRequests.filter((request) => {
    const statusMatch = request.status === activeTab;
    const categoryMatch =
      categoryFilter === "ALL" ||
      getRequestCategory(request.request_type) === categoryFilter;

    return statusMatch && categoryMatch;
  });

  /// UI
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Manager Approval Center
          </h1>
          <p className="text-sm text-slate-500">
            Centralized approval hub. Only requests assigned to your approval role are shown.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Current User: {currentEmployeeName || currentEmployeeId || "Not detected"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pending Requests</p>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{pendingRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Approved</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{approvedRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Rejected</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{rejectedRequests.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Requests</p>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">{visibleRequests.length}</h2>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCategoryFilter("ALL");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {categoryItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCategoryFilter(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                categoryFilter === item.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-xl border bg-white px-4 py-3 text-sm text-slate-600">
          Showing <span className="font-bold text-slate-900">{filteredRequests.length}</span> {activeTab.toLowerCase()} request(s) under <span className="font-bold text-slate-900">{getCategoryLabel(categoryFilter)}</span>.
        </div>

        <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Module</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Requested By</th>
                <th className="p-3 text-left">Approver Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No approval requests assigned to you.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-t">
                    <td className="p-3">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getRequestTypeBadgeStyle(
                          request.request_type
                        )}`}
                      >
                        {getRequestTypeLabel(request.request_type)}
                      </span>
                    </td>
                    <td className="p-3">{request.module}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {getCategoryLabel(getRequestCategory(request.request_type))}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {request.title}
                    </td>
                    <td className="p-3">{request.requested_by || "-"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {getApproverRoleForRequest(request)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : request.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
            <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Review Request
                  </h2>
                  <p className="text-sm text-slate-500">
                    {getRequestTypeLabel(selectedRequest.request_type)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500">Title</p>
                  <p className="font-semibold text-slate-800">
                    {selectedRequest.title}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Module</p>
                  <p>{selectedRequest.module}</p>
                </div>

                <div>
                  <p className="text-slate-500">Requested By</p>
                  <p>{selectedRequest.requested_by || "-"}</p>
                </div>

                <div>
                  <p className="text-slate-500">Description</p>
                  <p>{selectedRequest.description || "No description provided."}</p>
                </div>

                <div>
                  <p className="text-slate-500">Reference ID</p>
                  <p>{selectedRequest.reference_id || "-"}</p>
                </div>

                <div>
                  <p className="text-slate-500">Requested At</p>
                  <p>{formatDateTime(selectedRequest.created_at)}</p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="mb-2 font-semibold text-blue-800">
                    Approval Assignment
                  </p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>Required Role: {getApproverRoleForRequest(selectedRequest)}</p>
                    <p>Assigned Approvers: {getAssignedApproverLabel(selectedRequest)}</p>
                    <p>
                      Current User: {currentEmployeeName || currentEmployeeId || "Not detected"}
                    </p>
                    <p>
                      Access:{" "}
                      {canCurrentUserApproveRequest(selectedRequest)
                        ? "Allowed to approve/reject"
                        : "View only - not assigned approver"}
                    </p>
                  </div>
                </div>

                {getPayload(selectedRequest) && (
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="mb-2 font-semibold text-slate-700">
                      Request Details
                    </p>

                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold">Amount:</span>{" "}
                        {formatMoney(getPayload(selectedRequest)?.amount)}
                      </p>
                      <p>
                        <span className="font-semibold">Business Date:</span>{" "}
                        {getPayload(selectedRequest)?.business_date || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Movement:</span>{" "}
                        {getPayload(selectedRequest)?.movement_type || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Source:</span>{" "}
                        {getPayload(selectedRequest)?.source || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Payment:</span>{" "}
                        {getPayload(selectedRequest)?.payment_type || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">From:</span>{" "}
                        {getPayload(selectedRequest)?.from_person || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">To:</span>{" "}
                        {getPayload(selectedRequest)?.to_person || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Encoded By:</span>{" "}
                        {getPayload(selectedRequest)?.encoded_by || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Expense Category:</span>{" "}
                        {getPayload(selectedRequest)?.expense_category || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Expense Area:</span>{" "}
                        {getPayload(selectedRequest)?.expense_department || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Expense Description:</span>{" "}
                        {getPayload(selectedRequest)?.expense_description || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Cash Advance Employee:</span>{" "}
                        {getPayload(selectedRequest)?.cash_advance_employee_name || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Payroll Period:</span>{" "}
                        {getPayload(selectedRequest)?.payroll_period_label || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Leave Employee:</span>{" "}
                        {getPayload(selectedRequest)?.employee_name || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Leave Type:</span>{" "}
                        {getPayload(selectedRequest)?.leave_type || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Leave Dates:</span>{" "}
                        {getPayload(selectedRequest)?.start_date || "-"} to {getPayload(selectedRequest)?.end_date || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Total Days:</span>{" "}
                        {getPayload(selectedRequest)?.days || getPayload(selectedRequest)?.total_days || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Remarks:</span>{" "}
                        {getPayload(selectedRequest)?.remarks || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Cancellation Reason:</span>{" "}
                        {getPayload(selectedRequest)?.cancellation_reason || "-"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="mb-2 font-semibold text-slate-700">
                    Approval History
                  </p>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p>Approved By: {selectedRequest.approved_by || "-"}</p>
                    <p>Approved At: {formatDateTime(selectedRequest.approved_at)}</p>
                    <p>Rejected By: {selectedRequest.rejected_by || "-"}</p>
                    <p>Rejected At: {formatDateTime(selectedRequest.rejected_at)}</p>
                    <p>
                      Rejection Reason:{" "}
                      {selectedRequest.rejection_reason || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.status === "PENDING" ? (
                canCurrentUserApproveRequest(selectedRequest) ? (
                  <div className="mt-8 flex gap-3">
                    <button
                      disabled={isProcessing}
                      onClick={() => approveRequest(selectedRequest)}
                      className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? "Processing..." : "Approve"}
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => {
                        setRejectReason("");
                        setShowRejectModal(true);
                      }}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? "Processing..." : "Reject"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    You can view this request, but only an assigned approver can approve or reject it.
                  </div>
                )
              ) : (
                <div className="mt-8 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
                  This request is already {selectedRequest.status}.
                </div>
              )}
            </div>
          </div>
        )}

        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Reject Request
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Please enter the reason for rejecting this request.
                </p>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-red-500"
                rows={4}
                placeholder="Example: Insufficient documentation, duplicate request, or budget exceeded..."
              />

              <div className="mt-4 flex gap-3">
                <button
                  disabled={isProcessing}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => rejectRequest(selectedRequest, rejectReason)}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
