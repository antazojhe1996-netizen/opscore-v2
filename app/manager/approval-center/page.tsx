"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";
import TopNavbar from "@/components/TopNavbar";

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
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null,
  );
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRequestRef = useRef<string | null>(null);
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

  const getCompanyIdForRequest = async (request: any, payload?: any) => {
    const directCompanyId = String(
      request?.company_id ||
        payload?.company_id ||
        localStorage.getItem("opscore_current_company_id") ||
        "",
    ).trim();

    if (directCompanyId) return directCompanyId;

    if (!currentEmployeeId) return "";

    const { data, error } = await supabase
      .from("employees")
      .select("company_id")
      .eq("id", currentEmployeeId)
      .maybeSingle();

    if (error) {
      console.log("APPROVAL CENTER COMPANY ID LOOKUP ERROR:", error.message);
      return "";
    }

    const companyId = String(data?.company_id || "").trim();

    if (companyId) {
      localStorage.setItem("opscore_current_company_id", companyId);
    }

    return companyId;
  };

  const validateLeaveApprovalNoOverlap = async (request: any) => {
    if (request?.request_type !== "LEAVE_REQUEST" || !request?.reference_id) {
      return true;
    }

    const payload = getPayload(request) || {};

    const { data: leaveData, error: leaveFetchError } = await supabase
      .from("leave_requests")
      .select(
        "id, company_id, employee_id, employee_name, leave_type, start_date, end_date, status",
      )
      .eq("id", request.reference_id)
      .maybeSingle();

    if (leaveFetchError) {
      console.log(
        "LEAVE APPROVAL OVERLAP FETCH ERROR:",
        leaveFetchError.message,
      );
      alert(`Leave approval safety check failed. ${leaveFetchError.message}`);
      return false;
    }

    if (!leaveData) {
      alert(
        "Leave approval safety check failed. Linked leave request was not found.",
      );
      return false;
    }

    const companyId = String(
      leaveData.company_id || request.company_id || payload.company_id || "",
    ).trim();
    const employeeId = String(
      leaveData.employee_id || payload.employee_id || "",
    ).trim();
    const startDate = String(
      leaveData.start_date || payload.start_date || "",
    ).trim();
    const endDate = String(leaveData.end_date || payload.end_date || "").trim();

    if (!companyId || !employeeId || !startDate || !endDate) {
      alert(
        "Leave approval safety check failed. Missing company, employee, or leave dates.",
      );
      return false;
    }

    const { data: overlappingLeaves, error: overlapError } = await supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, status")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .eq("status", "Approved")
      .neq("id", leaveData.id)
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .order("start_date", { ascending: true })
      .limit(1);

    if (overlapError) {
      console.log("LEAVE APPROVAL OVERLAP CHECK ERROR:", overlapError.message);
      alert(`Leave approval safety check failed. ${overlapError.message}`);
      return false;
    }

    const conflict = overlappingLeaves?.[0];

    if (conflict) {
      alert(
        `Cannot approve leave. Selected dates overlap with ${conflict.leave_type || "approved leave"} from ${formatDate(conflict.start_date)} to ${formatDate(conflict.end_date)} (${conflict.status}).`,
      );
      return false;
    }

    return true;
  };

  const calculateLeaveDays = (
    startDate: any,
    endDate: any,
    fallbackDays?: any,
  ) => {
    const fallback = Number(fallbackDays || 0);
    const start = String(startDate || "").slice(0, 10);
    const end = String(endDate || startDate || "").slice(0, 10);

    if (!start || !end) return fallback > 0 ? fallback : 1;

    const startTime = new Date(`${start}T00:00:00`).getTime();
    const endTime = new Date(`${end}T00:00:00`).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return fallback > 0 ? fallback : 1;
    }

    const days = Math.floor((endTime - startTime) / 86_400_000) + 1;
    return Math.max(days, fallback > 0 ? fallback : 1);
  };

  const getLeaveCreditEmployeeNo = async (leaveData: any, payload: any) => {
    const directEmployeeNo = String(
      leaveData?.employee_no ||
        payload?.employee_no ||
        payload?.employee_number ||
        "",
    ).trim();

    if (directEmployeeNo) return directEmployeeNo;

    const employeeId = String(
      leaveData?.employee_id || payload?.employee_id || "",
    ).trim();

    if (!employeeId) return "";

    const { data, error } = await supabase
      .from("employees")
      .select("employee_no")
      .eq("id", employeeId)
      .maybeSingle();

    if (error) {
      console.log("LEAVE CREDIT EMPLOYEE LOOKUP ERROR:", error.message);
      throw new Error(error.message);
    }

    return String(data?.employee_no || "").trim();
  };

  const getLeaveSettingForType = async (leaveType: string) => {
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .eq("leave_type", leaveType)
      .maybeSingle();

    if (error) {
      console.log("GET LEAVE SETTING FOR CREDIT ERROR:", error.message);
      throw new Error(error.message);
    }

    return data || null;
  };

  const adjustLeaveCreditsForApproval = async (
    request: any,
    leaveData: any,
  ) => {
    const payload = getPayload(request) || {};
    const leaveType = String(
      leaveData?.leave_type || payload?.leave_type || "",
    ).trim();

    if (!leaveType) return true;

    const leaveSetting = await getLeaveSettingForType(leaveType);

    if (!leaveSetting?.requires_credits) return true;

    const employeeNo = await getLeaveCreditEmployeeNo(leaveData, payload);

    if (!employeeNo) {
      alert("Leave credit deduction failed. Employee number was not found.");
      return false;
    }

    const leaveDays = calculateLeaveDays(
      leaveData?.start_date || payload?.start_date,
      leaveData?.end_date || payload?.end_date,
      payload?.days || payload?.total_days,
    );

    const { data: creditRecords, error: creditError } = await supabase
      .from("employee_leave_credits")
      .select("*")
      .eq("employee_no", employeeNo)
      .eq("leave_type", leaveType)
      .order("id", { ascending: true });

    if (creditError) {
      console.log("GET LEAVE CREDIT RECORD ERROR:", creditError.message);
      alert(`Leave credit deduction failed. ${creditError.message}`);
      return false;
    }

    if (!creditRecords || creditRecords.length === 0) {
      alert(
        `Cannot approve leave. No ${leaveType} credit record found for employee no. ${employeeNo}.`,
      );
      return false;
    }

    if (creditRecords.length > 1) {
      alert(
        `Cannot approve leave. Duplicate ${leaveType} credit records found for employee no. ${employeeNo}. Please clean Leave Credits first.`,
      );
      return false;
    }

    const creditRecord = creditRecords[0];

    const currentUsed = Number(creditRecord.used_credits || 0);
    const currentRemaining = Number(
      creditRecord.remaining_credits ?? creditRecord.credits ?? 0,
    );

    if (currentRemaining < leaveDays) {
      alert(
        `Cannot approve leave. Insufficient ${leaveType} credits. Needed: ${leaveDays}. Remaining: ${currentRemaining}.`,
      );
      return false;
    }

    const newUsed = currentUsed + leaveDays;
    const newRemaining = Math.max(currentRemaining - leaveDays, 0);

    const { error: updateError } = await supabase
      .from("employee_leave_credits")
      .update({
        used_credits: newUsed,
        remaining_credits: newRemaining,
      })
      .eq("id", creditRecord.id);

    if (updateError) {
      console.log("DEDUCT LEAVE CREDIT ERROR:", updateError.message);
      alert(
        `Leave approval failed before credit deduction. ${updateError.message}`,
      );
      return false;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Deduct Leave Credits",
      description: `${leaveDays} ${leaveType} credit(s) deducted for ${leaveData?.employee_name || payload?.employee_name || employeeNo}. Remaining: ${newRemaining}`,
      severity: "warning",
      recordId: String(creditRecord.id),
      oldValue: creditRecord,
      newValue: {
        leaveRequestId: request.reference_id,
        approvalRequestId: request.id,
        employeeNo,
        leaveType,
        deductedDays: leaveDays,
        used_credits: newUsed,
        remaining_credits: newRemaining,
      },
    });

    return true;
  };

  const restoreLeaveCreditsForCancellation = async (
    request: any,
    leaveData: any,
  ) => {
    const payload = getPayload(request) || {};
    const leaveType = String(
      leaveData?.leave_type || payload?.leave_type || "",
    ).trim();

    if (!leaveType) return true;

    const leaveSetting = await getLeaveSettingForType(leaveType);

    if (!leaveSetting?.requires_credits) return true;

    const employeeNo = await getLeaveCreditEmployeeNo(leaveData, payload);

    if (!employeeNo) return true;

    const leaveDays = calculateLeaveDays(
      leaveData?.start_date || payload?.start_date,
      leaveData?.end_date || payload?.end_date,
      payload?.days || payload?.total_days,
    );

    const { data: creditRecords, error: creditError } = await supabase
      .from("employee_leave_credits")
      .select("*")
      .eq("employee_no", employeeNo)
      .eq("leave_type", leaveType)
      .order("id", { ascending: true });

    if (creditError) {
      console.log("GET LEAVE CREDIT RESTORE ERROR:", creditError.message);
      alert(`Leave cancellation credit restore failed. ${creditError.message}`);
      return false;
    }

    if (!creditRecords || creditRecords.length === 0) return true;

    if (creditRecords.length > 1) {
      alert(
        `Leave cancellation credit restore failed. Duplicate ${leaveType} credit records found for employee no. ${employeeNo}. Please clean Leave Credits first.`,
      );
      return false;
    }

    const creditRecord = creditRecords[0];

    const currentUsed = Number(creditRecord.used_credits || 0);
    const currentRemaining = Number(creditRecord.remaining_credits || 0);
    const totalCredits = Number(creditRecord.credits || 0);
    const newUsed = Math.max(currentUsed - leaveDays, 0);
    const newRemaining = Math.min(currentRemaining + leaveDays, totalCredits);

    const { error: updateError } = await supabase
      .from("employee_leave_credits")
      .update({
        used_credits: newUsed,
        remaining_credits: newRemaining,
      })
      .eq("id", creditRecord.id);

    if (updateError) {
      console.log("RESTORE LEAVE CREDIT ERROR:", updateError.message);
      alert(
        `Leave cancellation failed before credit restore. ${updateError.message}`,
      );
      return false;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Restore Leave Credits",
      description: `${leaveDays} ${leaveType} credit(s) restored for ${leaveData?.employee_name || payload?.employee_name || employeeNo}. Remaining: ${newRemaining}`,
      severity: "warning",
      recordId: String(creditRecord.id),
      oldValue: creditRecord,
      newValue: {
        leaveRequestId: request.reference_id,
        approvalRequestId: request.id,
        employeeNo,
        leaveType,
        restoredDays: leaveDays,
        used_credits: newUsed,
        remaining_credits: newRemaining,
      },
    });

    return true;
  };

  const formatDate = (value: any) => {
    if (!value) return "-";

    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return String(value);

    return parsed.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      EXPENSE_REQUEST: "Expense Request",
      CASH_DRAWER_OUT: "Cash Drawer Out",
      CASH_EXPENSE_RELEASE: "Cash Expense Release",
      CASH_ADVANCE_RELEASE: "Cash Advance Release",
      OWNER_WITHDRAWAL: "Owner Withdrawal",
      BANK_DEPOSIT: "Bank Deposit",
      REFUND_OUT: "Refund",
      ADJUSTMENT_OUT: "Adjustment",
      PAYROLL_ADJUSTMENT: "Payroll Adjustment",
      PAYROLL_REOPEN: "Payroll Reopen",
      LEAVE_REQUEST: "Leave Request",
      LEAVE_CANCELLATION: "Leave Cancellation",
    };

    return labels[type] || type;
  };

  const getRequestTypeBadgeStyle = (type: string) => {
    if (type === "EXPENSE_REQUEST")
      return "border-blue-200 bg-blue-50 text-blue-700";
    if (type === "PAYROLL_ADJUSTMENT")
      return "border-blue-200 bg-blue-50 text-blue-700";
    if (type === "PAYROLL_REOPEN")
      return "border-amber-200 bg-amber-50 text-amber-700";
    if (type === "LEAVE_REQUEST")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (type === "LEAVE_CANCELLATION")
      return "border-slate-200 bg-slate-100 text-slate-700";
    if (type === "CASH_ADVANCE_RELEASE")
      return "border-blue-200 bg-blue-50 text-blue-700";
    if (type === "OWNER_WITHDRAWAL")
      return "border-red-200 bg-red-50 text-red-700";
    if (CASH_DRAWER_REQUEST_TYPES.includes(type))
      return "border-slate-200 bg-slate-100 text-slate-700";

    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getWorkflowKeyForRequest = (request: any) => {
    if (!request?.request_type) return "";

    // OPSCORE APPROVAL ROUTING FIX:
    // Expense Requests use their own request_type for audit/history,
    // but they should follow the same manager approval lane as Finance/Cash releases
    // unless a dedicated EXPENSE_REQUEST workflow is configured later.
    if (request.request_type === "EXPENSE_REQUEST") return "CASH_DRAWER_OUT";
    if (request.request_type === "CASH_EXPENSE_RELEASE")
      return "CASH_DRAWER_OUT";
    if (request.request_type === "CASH_ADVANCE_RELEASE")
      return "CASH_DRAWER_OUT";
    if (request.request_type === "REFUND_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "ADJUSTMENT_OUT") return "CASH_DRAWER_OUT";
    if (request.request_type === "LEAVE_CANCELLATION") return "LEAVE_REQUEST";
    if (request.request_type === "PAYROLL_REOPEN") return "PAYROLL_ADJUSTMENT";

    return request.request_type;
  };

  const getWorkflowForRequest = (request: any) => {
    const workflowKey = getWorkflowKeyForRequest(request);

    return (
      approvalWorkflows.find(
        (workflow) =>
          String(workflow.workflow_key || "") === String(workflowKey),
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
        assignment.employee_id,
    );
  };

  const canCurrentUserApproveRequest = (request: any) => {
    const assignedApprovers = getAssignedApproversForRequest(request);

    if (!currentEmployeeId || assignedApprovers.length === 0) return false;

    return assignedApprovers.some(
      (assignment) =>
        String(currentEmployeeId) === String(assignment.employee_id),
    );
  };

  const getAssignedApproverLabel = (request: any) => {
    const assignedApprovers = getAssignedApproversForRequest(request);

    if (assignedApprovers.length === 0) return "No active assigned approver";

    const currentUserIsAssigned = assignedApprovers.some(
      (assignment) =>
        String(currentEmployeeId || "") ===
        String(assignment.employee_id || ""),
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

    if (
      requestType === "PAYROLL_ADJUSTMENT" ||
      requestType === "PAYROLL_REOPEN"
    ) {
      return "PAYROLL";
    }

    if (
      requestType === "LEAVE_REQUEST" ||
      requestType === "LEAVE_CANCELLATION"
    ) {
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

  const getApprovalRequestMarker = (requestId: any) =>
    `Approval Request ID: ${String(requestId || "")}`;

  const appendApprovalRequestMarker = (remarks: any, requestId: any) => {
    const baseRemarks = String(
      remarks || "Approved cash drawer movement",
    ).trim();
    const marker = getApprovalRequestMarker(requestId);

    if (baseRemarks.includes(marker)) return baseRemarks;

    return `${baseRemarks} | ${marker}`;
  };

  const cashDrawerMovementAlreadyPosted = async (
    request: any,
    payload: any,
    amountValue: number,
  ) => {
    const marker = getApprovalRequestMarker(request.id);

    const { data: markerMatch, error: markerError } = await supabase
      .from("finance_cash_movements")
      .select("id, created_at")
      .ilike("remarks", `%${marker}%`)
      .limit(1)
      .maybeSingle();

    if (markerError) {
      console.log(
        "CASH APPROVAL DUPLICATE MARKER CHECK ERROR:",
        markerError.message,
      );
      throw new Error(markerError.message);
    }

    if (markerMatch) return true;

    // Safety fallback for older rows created before the approval-request marker existed.
    // This catches accidental double-clicks / repeated approval execution with the same payload.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const baseRemarks = String(
      payload.remarks || request.description || "Approved cash drawer movement",
    ).trim();

    let fallbackQuery = supabase
      .from("finance_cash_movements")
      .select("id, created_at")
      .eq("business_date", payload.business_date)
      .eq("movement_type", payload.movement_type)
      .eq("source", payload.source)
      .eq("payment_type", payload.payment_type || "Cash")
      .eq("amount", amountValue)
      .eq("from_person", payload.from_person || "")
      .eq("to_person", payload.to_person || "")
      .ilike("remarks", `%${baseRemarks}%`)
      .gte("created_at", tenMinutesAgo)
      .limit(1);

    fallbackQuery = payload.cash_drawer_id
      ? fallbackQuery.eq("cash_drawer_id", payload.cash_drawer_id)
      : fallbackQuery.is("cash_drawer_id", null);

    const { data: fallbackMatch, error: fallbackError } =
      await fallbackQuery.maybeSingle();

    if (fallbackError) {
      console.log(
        "CASH APPROVAL DUPLICATE FALLBACK CHECK ERROR:",
        fallbackError.message,
      );
      throw new Error(fallbackError.message);
    }

    return Boolean(fallbackMatch);
  };

  const executeCashDrawerMovement = async (request: any) => {
    const payload = getPayload(request);

    if (!payload) {
      alert(
        "Missing cash drawer approval payload. Check approval_requests.request_payload column.",
      );
      return false;
    }

    const amountValue = Number(payload.amount || 0);
    const companyId = await getCompanyIdForRequest(request, payload);

    if (!companyId) {
      alert("Approval cannot continue. No company_id found for this request.");
      return false;
    }

    if (amountValue <= 0) {
      alert("Invalid approval amount.");
      return false;
    }

    let alreadyPosted = false;

    try {
      alreadyPosted = await cashDrawerMovementAlreadyPosted(
        request,
        payload,
        amountValue,
      );
    } catch (duplicateCheckError: any) {
      alert(
        `Duplicate safety check failed. Nothing was posted. ${duplicateCheckError?.message || duplicateCheckError}`,
      );
      return false;
    }

    if (alreadyPosted) {
      alert(
        "Possible duplicate approval detected. This request already created a cash movement. Nothing was posted again.",
      );
      return false;
    }

    const movementRemarks = appendApprovalRequestMarker(
      payload.remarks || request.description || "Approved cash drawer movement",
      request.id,
    );

    const { data: movementData, error: movementError } = await supabase
      .from("finance_cash_movements")
      .insert({
        company_id: companyId,
        business_date: payload.business_date,
        movement_type: payload.movement_type,
        source: payload.source,
        payment_type: payload.payment_type || "Cash",
        amount: amountValue,
        from_person: payload.from_person || "",
        to_person: payload.to_person || "",
        encoded_by:
          payload.encoded_by ||
          currentEmployeeName ||
          "Manager Approval Center",
        remarks: movementRemarks,
        reference_type: payload.should_create_expense
          ? "expense"
          : "approval_request",
        reference_id: payload.should_create_expense ? null : request.id,
        cash_drawer_id: payload.cash_drawer_id || null,
      })
      .select()
      .single();

    if (movementError) {
      console.log(
        "APPROVED CASH MOVEMENT INSERT ERROR:",
        movementError.message,
      );
      alert(
        `Approval saved failed before drawer posting. ${movementError.message}`,
      );
      return false;
    }

    let createdExpenseData: any = null;
    let createdBalanceData: any = null;

    if (payload.should_create_expense) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          company_id: companyId,
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
          payment_method: payload.payment_type || "Cash",
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
            ? `Source: Cash Drawer Approval. Auto linked to: ${payload.payroll_period_label || "Payroll Period"}. ${payload.cash_advance_purpose || ""} ${movementRemarks}`.trim()
            : `${movementRemarks}${payload.expense_released_to ? ` Released to: ${payload.expense_released_to}` : ""}`.trim(),
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
        console.log(
          "APPROVED CASH MOVEMENT EXPENSE ERROR:",
          expenseError.message,
        );
        alert(
          "Cash movement was posted, but linked expense failed. Check expenses table columns.",
        );
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
            company_id: companyId,
            employee_id: payload.cash_advance_employee_id,
            employee_name: payload.cash_advance_employee_name,
            balance_type: "Cash Advance",
            original_amount: amountValue,
            remaining_balance: amountValue,
            status: "Active",
            source_module: "Cash Drawer",
            source_id: movementData.id,
            period_id: payload.payroll_period_id || null,
            remarks: `Source: Cash Drawer Approval. Expense ID: ${expenseData.id}. Cash Movement ID: ${movementData.id}. ${payload.cash_advance_purpose || ""}. ${getApprovalRequestMarker(request.id)}`,
          })
          .select()
          .single();

        if (balanceError) {
          console.log(
            "APPROVED CASH ADVANCE BALANCE ERROR:",
            balanceError.message,
          );
          alert(
            "Cash advance posted to drawer and expenses, but employee balance failed.",
          );
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
    const noOverlap = await validateLeaveApprovalNoOverlap(request);

    if (!noOverlap) {
      return false;
    }

    const { data: leaveData, error: leaveFetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", request.reference_id)
      .maybeSingle();

    if (leaveFetchError) {
      console.log(
        "FETCH LEAVE FOR CREDIT DEDUCTION ERROR:",
        leaveFetchError.message,
      );
      alert(
        `Approval saved failed before leave credit check. ${leaveFetchError.message}`,
      );
      return false;
    }

    if (!leaveData) {
      alert("Approval failed. Linked leave request was not found.");
      return false;
    }

    const creditAdjusted = await adjustLeaveCreditsForApproval(
      request,
      leaveData,
    );

    if (!creditAdjusted) {
      return false;
    }

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
      alert(
        "Approval saved failed before leave request sync. Check leave_requests columns.",
      );
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
      alert(
        "Rejection saved failed before leave request sync. Check leave_requests columns.",
      );
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
    if (
      request.request_type !== "LEAVE_CANCELLATION" ||
      !request.reference_id
    ) {
      return true;
    }

    const payload = getPayload(request);
    const finalReason =
      payload?.cancellation_reason ||
      payload?.reason ||
      request.description ||
      "Leave cancellation approved by manager.";

    const { data: leaveData, error: leaveFetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", request.reference_id)
      .maybeSingle();

    if (leaveFetchError) {
      console.log(
        "FETCH LEAVE FOR CREDIT RESTORE ERROR:",
        leaveFetchError.message,
      );
      alert(
        `Leave cancellation failed before credit restore check. ${leaveFetchError.message}`,
      );
      return false;
    }

    if (leaveData && String(leaveData.status || "") === "Approved") {
      const creditsRestored = await restoreLeaveCreditsForCancellation(
        request,
        leaveData,
      );

      if (!creditsRestored) {
        return false;
      }
    }

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
      alert(
        "Approval saved failed before leave cancellation sync. Check leave_requests cancellation columns.",
      );
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

  const syncLeaveCancellationRejection = async (
    request: any,
    reason: string,
  ) => {
    if (
      request.request_type !== "LEAVE_CANCELLATION" ||
      !request.reference_id
    ) {
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

  const syncPayrollReopenApproval = async (request: any) => {
    if (request.request_type !== "PAYROLL_REOPEN") {
      return true;
    }

    const payload = getPayload(request) || {};
    const snapshotId = String(
      payload.snapshot_id ||
        payload.snapshotId ||
        request.reference_id ||
        "",
    ).trim();

    let periodId = String(
      payload.period_id ||
        payload.periodId ||
        "",
    ).trim();

    const reopenType = String(
      payload.reopen_type ||
        payload.reopenType ||
        payload.correction_type ||
        "PAYROLL_ONLY",
    ).toUpperCase();

    const normalizedReopenType =
      reopenType === "WITH_ATTENDANCE" ||
      reopenType === "ATTENDANCE" ||
      reopenType === "ATTENDANCE_CORRECTION"
        ? "WITH_ATTENDANCE"
        : "PAYROLL_ONLY";

    const targetStatus =
      normalizedReopenType === "WITH_ATTENDANCE" ? "OPEN" : "REGISTERED";

    const reopenTypeLabel =
      normalizedReopenType === "WITH_ATTENDANCE"
        ? "Attendance / Time Entries Correction"
        : "Payroll Values Only Correction";

    const reason = String(
      payload.reason ||
        request.description ||
        "Payroll reopen approved.",
    ).trim();

    if (!snapshotId) {
      alert("Payroll reopen approval failed. Missing payroll snapshot ID.");
      return false;
    }

    const { data: snapshotData, error: snapshotFetchError } = await supabase
      .from("payroll_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapshotFetchError) {
      console.log(
        "FETCH PAYROLL SNAPSHOT FOR REOPEN ERROR:",
        snapshotFetchError.message,
      );
      alert(
        `Payroll reopen failed before snapshot check. ${snapshotFetchError.message}`,
      );
      return false;
    }

    if (!snapshotData) {
      alert("Payroll reopen failed. Linked payroll snapshot was not found.");
      return false;
    }

    if (!periodId) {
      periodId = String(snapshotData.period_id || "").trim();
    }

    const snapshotStatus = String(snapshotData.status || "").toUpperCase();

    const { data: releasedHeader, error: releasedHeaderError } = await supabase
      .from("released_payrolls")
      .select("id, status")
      .eq("snapshot_id", snapshotId)
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (releasedHeaderError) {
      console.log(
        "FETCH RELEASED PAYROLL HEADER FOR REOPEN ERROR:",
        releasedHeaderError.message,
      );
      alert(
        `Payroll reopen failed before released payroll check. ${releasedHeaderError.message}`,
      );
      return false;
    }

    const hasReleasedPayroll = Boolean(releasedHeader?.id);

    if (snapshotStatus !== "RELEASED" && !hasReleasedPayroll) {
      alert(
        "Payroll reopen blocked. Only payroll with released records can be reopened from Approval Center.",
      );
      return false;
    }

    const { error: snapshotError } = await supabase
      .from("payroll_snapshots")
      .update({
        status: targetStatus,
      })
      .eq("id", snapshotId);

    if (snapshotError) {
      console.log("SYNC PAYROLL REOPEN SNAPSHOT ERROR:", snapshotError.message);
      alert(`Payroll snapshot reopen failed. ${snapshotError.message}`);
      return false;
    }

    if (!periodId) {
      await createAuditLog({
        userName: currentEmployeeName || "OPSCORE USER",
        module: "Approval Center",
        action: "Payroll Reopen Period Missing",
        description:
          "Payroll snapshot was reopened, but no linked payroll period was found for attendance unlock.",
        severity: "critical",
        recordId: request.id,
        oldValue: request,
        newValue: {
          snapshotId,
          snapshotData,
          targetStatus,
          reopenType: normalizedReopenType,
          payload,
        },
      });

      alert(
        "Payroll snapshot reopened, but no linked payroll period was found. Attendance unlock was skipped.",
      );
      return false;
    }

    const periodUpdate =
      normalizedReopenType === "WITH_ATTENDANCE"
        ? {
            status: "OPEN",
            attendance_locked: false,
            needs_regeneration: true,
          }
        : {
            status: "REGISTERED",
            attendance_locked: false,
            needs_regeneration: false,
          };

    const { error: periodError } = await supabase
      .from("payroll_periods")
      .update(periodUpdate)
      .eq("id", periodId);

    if (periodError) {
      console.log("SYNC PAYROLL REOPEN PERIOD ERROR:", periodError.message);
      alert(`Payroll period reopen failed. ${periodError.message}`);
      return false;
    }

    // Archive the previous released payroll header from the active release lane.
    // The immutable release rows remain stored for audit/version history.
    if (releasedHeader?.id) {
      const { error: archiveError } = await supabase
        .from("released_payrolls")
        .update({
          status: "REOPENED",
        })
        .eq("id", releasedHeader.id);

      if (archiveError) {
        console.log(
          "ARCHIVE RELEASED PAYROLL FOR REOPEN ERROR:",
          archiveError.message,
        );
        alert(
          `Payroll reopened, but old released payroll archive failed. ${archiveError.message}`,
        );
        return false;
      }
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Approve Payroll Reopen",
      description: `${request.title || "Payroll Reopen"} approved as ${reopenTypeLabel}. Payroll returned to ${targetStatus}. Reason: ${reason}`,
      severity: "critical",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: targetStatus,
        snapshotId,
        periodId,
        reopenType: normalizedReopenType,
        reopenTypeLabel,
        attendance_locked: false,
        needs_regeneration: true,
        archivedReleaseId: releasedHeader?.id || null,
        payload,
      },
    });

    return true;
  };

  const syncPayrollReopenRejection = async (request: any, reason: string) => {
    if (request.request_type !== "PAYROLL_REOPEN") {
      return true;
    }

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Reject Payroll Reopen",
      description: `${request.title || "Payroll Reopen"} rejected. Released payroll remains immutable. Reason: ${reason}`,
      severity: "warning",
      recordId: request.id,
      oldValue: request,
      newValue: {
        status: "REOPEN_REJECTED",
        rejectedBy: currentEmployeeName || "Manager Approval Center",
        rejectionReason: reason,
        payload: getPayload(request),
      },
    });

    return true;
  };


  const approveRequest = async (request: any) => {
    if (!request?.id || isProcessing) return;

    const processingKey = String(request.id);

    if (processingRequestRef.current === processingKey) return;

    processingRequestRef.current = processingKey;

    if (!canCurrentUserApproveRequest(request)) {
      alert("You are not assigned as approver for this request.");
      processingRequestRef.current = null;
      return;
    }

    setIsProcessing(true);

    const { data: freshRequest, error: freshRequestError } = await supabase
      .from("approval_requests")
      .select("id, status, approved_at, approved_by, rejected_at, rejected_by")
      .eq("id", request.id)
      .maybeSingle();

    if (freshRequestError) {
      setIsProcessing(false);
      processingRequestRef.current = null;
      alert(
        `Approval status safety check failed. ${freshRequestError.message}`,
      );
      return;
    }

    if (!freshRequest || String(freshRequest.status || "") !== "PENDING") {
      setIsProcessing(false);
      processingRequestRef.current = null;
      alert(
        "This request is no longer pending. It may have already been processed.",
      );
      await refreshApprovalCenter();
      setSelectedRequest(null);
      return;
    }

    if (CASH_DRAWER_REQUEST_TYPES.includes(request.request_type)) {
      const executed = await executeCashDrawerMovement(request);

      if (!executed) {
        setIsProcessing(false);
        processingRequestRef.current = null;
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
        console.log(
          "SYNC PAYROLL ADJUSTMENT APPROVAL ERROR:",
          adjustmentError.message,
        );
        alert("Approval saved failed before payroll adjustment sync.");
        setIsProcessing(false);
        processingRequestRef.current = null;
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
        console.log(
          "SYNC EXPENSE REQUEST APPROVAL ERROR:",
          expenseRequestError.message,
        );
        alert("Approval saved failed before expense request sync.");
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "LEAVE_REQUEST") {
      const synced = await syncLeaveRequestApproval(request);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "LEAVE_CANCELLATION") {
      const synced = await syncLeaveCancellationApproval(request);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "PAYROLL_REOPEN") {
      const synced = await syncPayrollReopenApproval(request);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
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
    processingRequestRef.current = null;

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
        console.log(
          "SYNC PAYROLL ADJUSTMENT REJECTION ERROR:",
          adjustmentError.message,
        );
        alert("Rejection saved failed before payroll adjustment sync.");
        setIsProcessing(false);
        processingRequestRef.current = null;
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
        console.log(
          "SYNC EXPENSE REQUEST REJECTION ERROR:",
          expenseRequestError.message,
        );
        alert("Rejection saved failed before expense request sync.");
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "LEAVE_REQUEST") {
      const synced = await syncLeaveRequestRejection(request, finalReason);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "LEAVE_CANCELLATION") {
      const synced = await syncLeaveCancellationRejection(request, finalReason);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
        return;
      }
    }

    if (request.request_type === "PAYROLL_REOPEN") {
      const synced = await syncPayrollReopenRejection(request, finalReason);

      if (!synced) {
        setIsProcessing(false);
        processingRequestRef.current = null;
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
    canCurrentUserApproveRequest(request),
  );

  const pendingRequests = visibleRequests.filter((r) => r.status === "PENDING");
  const approvedRequests = visibleRequests.filter(
    (r) => r.status === "APPROVED",
  );
  const rejectedRequests = visibleRequests.filter(
    (r) => r.status === "REJECTED",
  );

  const getCategoryCount = (status: string, category: string) => {
    return visibleRequests.filter((request) => {
      const statusMatch = request.status === status;
      const categoryMatch =
        category === "ALL" ||
        getRequestCategory(request.request_type) === category;

      return statusMatch && categoryMatch;
    }).length;
  };

  const categoryItems = [
    { key: "ALL", label: "All", count: getCategoryCount(activeTab, "ALL") },
    {
      key: "FINANCE",
      label: "Finance",
      count: getCategoryCount(activeTab, "FINANCE"),
    },
    { key: "CASH", label: "Cash", count: getCategoryCount(activeTab, "CASH") },
    {
      key: "PAYROLL",
      label: "Payroll",
      count: getCategoryCount(activeTab, "PAYROLL"),
    },
    {
      key: "LEAVE",
      label: "Leave",
      count: getCategoryCount(activeTab, "LEAVE"),
    },
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
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F5F7FB]">
        <TopNavbar breadcrumb="APPROVALS / APPROVAL CENTER" />

        <div className="px-4 pb-6 pt-20 sm:px-6 lg:px-7">
          {/* PAGE HEADER */}
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Approvals
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Approval Center
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                Review, approve, or reject assigned finance, cash, payroll, and
                leave requests.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">
                Current user:{" "}
                {currentEmployeeName || currentEmployeeId || "Not detected"}
              </span>
              <button
                type="button"
                onClick={refreshApprovalCenter}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Refresh Queue
              </button>
            </div>
          </section>

          {/* KPI ROW */}
          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ApprovalKpiCard
              title="Pending"
              value={pendingRequests.length}
              helper="Awaiting decision"
            />
            <ApprovalKpiCard
              title="Approved"
              value={approvedRequests.length}
              helper="Approved assigned requests"
            />
            <ApprovalKpiCard
              title="Rejected"
              value={rejectedRequests.length}
              helper="Rejected assigned requests"
            />
            <ApprovalKpiCard
              title="Assigned To Me"
              value={visibleRequests.length}
              helper="Total visible workload"
            />
          </section>

          {/* FILTER TOOLBAR */}
          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    key: "PENDING",
                    label: "Pending",
                    count: pendingRequests.length,
                  },
                  {
                    key: "APPROVED",
                    label: "Approved",
                    count: approvedRequests.length,
                  },
                  {
                    key: "REJECTED",
                    label: "Rejected",
                    count: rejectedRequests.length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCategoryFilter("ALL");
                    }}
                    className={
                      activeTab === tab.key
                        ? "h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                        : "h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    }
                  >
                    {tab.label}{" "}
                    <span className="ml-1 text-xs opacity-70">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] xl:w-[520px]">
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {categoryItems.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label} ({item.count})
                    </option>
                  ))}
                </select>

                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">
                  <span className="font-black text-slate-950">
                    {filteredRequests.length}
                  </span>
                  <span className="ml-1">
                    {activeTab.toLowerCase()} request(s) •{" "}
                    {getCategoryLabel(categoryFilter)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* MAIN WORKFLOW AREA */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* APPROVAL QUEUE */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Workflow Queue
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Manager Action Queue
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Open a request to review details, assignment, and approval
                  actions.
                </p>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3">Requested By</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center">
                          <p className="text-sm font-black text-slate-700">
                            No records found
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            No approval requests are assigned to you for this
                            filter.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getRequestTypeBadgeStyle(
                                  request.request_type,
                                )}`}
                              >
                                {getRequestTypeLabel(request.request_type)}
                              </span>
                              <div>
                                <p className="font-black text-slate-950">
                                  {request.title || "Untitled Request"}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {getApproverRoleForRequest(request)} approval
                                  lane
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {request.module ||
                                getCategoryLabel(
                                  getRequestCategory(request.request_type),
                                )}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700">
                            {request.requested_by || "-"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-500">
                            {formatDateTime(request.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <ApprovalStatusBadge status={request.status} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedRequest(request)}
                              className="h-10 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
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
            </div>

            {/* REQUEST SUMMARY */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Request Summary
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {selectedRequest ? "Selected Request" : "No Request Selected"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedRequest
                  ? "Review the key approval details before opening the action panel."
                  : "Select a request from the queue to view its details."}
              </p>

              <div className="mt-5 space-y-3">
                <SummaryLine
                  label="Title"
                  value={selectedRequest?.title || "-"}
                />
                <SummaryLine
                  label="Type"
                  value={
                    selectedRequest
                      ? getRequestTypeLabel(selectedRequest.request_type)
                      : "-"
                  }
                />
                <SummaryLine
                  label="Requested By"
                  value={selectedRequest?.requested_by || "-"}
                />
                <SummaryLine
                  label="Required Role"
                  value={
                    selectedRequest
                      ? getApproverRoleForRequest(selectedRequest)
                      : "-"
                  }
                />
                <SummaryLine
                  label="Assigned Approvers"
                  value={
                    selectedRequest
                      ? getAssignedApproverLabel(selectedRequest)
                      : "-"
                  }
                />
                <SummaryLine
                  label="Status"
                  value={selectedRequest?.status || "-"}
                  strong
                />
              </div>

              {selectedRequest && (
                <button
                  type="button"
                  onClick={() => setSelectedRequest(selectedRequest)}
                  className="mt-5 h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Open Review Panel
                </button>
              )}
            </aside>
          </section>
        </div>

        {selectedRequest && (
          <div className="fixed bottom-0 right-0 top-0 z-50 flex justify-end bg-slate-950/45 lg:left-[16rem]">
            <aside className="flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl">
              <div className="border-b border-slate-100 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      Request Review Center
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {selectedRequest.title || "Untitled Request"}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getRequestTypeBadgeStyle(
                          selectedRequest.request_type,
                        )}`}
                      >
                        {getRequestTypeLabel(selectedRequest.request_type)}
                      </span>
                      <ApprovalStatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="h-10 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                    aria-label="Close review panel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-6">
                <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ApprovalDetailCard
                    label="Requested By"
                    value={selectedRequest.requested_by || "-"}
                  />
                  <ApprovalDetailCard
                    label="Category"
                    value={getCategoryLabel(
                      getRequestCategory(selectedRequest.request_type),
                    )}
                  />
                  <ApprovalDetailCard
                    label="Module"
                    value={selectedRequest.module || "-"}
                  />
                  <ApprovalDetailCard
                    label="Submitted"
                    value={formatDateTime(selectedRequest.created_at)}
                  />
                </section>

                <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Request Details
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Details
                  </h3>
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700">
                    {selectedRequest.description || "No description provided."}
                  </p>

                  {getPayload(selectedRequest) && (
                    <ApprovalRequestDetails
                      request={selectedRequest}
                      payload={getPayload(selectedRequest)}
                      formatMoney={formatMoney}
                    />
                  )}
                </section>

                <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Approval Assignment
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Assignment
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <ApprovalInfoRow
                      label="Required Role"
                      value={getApproverRoleForRequest(selectedRequest)}
                    />
                    <ApprovalInfoRow
                      label="Assigned Approvers"
                      value={getAssignedApproverLabel(selectedRequest)}
                    />
                    <ApprovalInfoRow
                      label="Current User"
                      value={
                        currentEmployeeName ||
                        currentEmployeeId ||
                        "Not detected"
                      }
                    />
                    <ApprovalInfoRow
                      label="Access"
                      value={
                        canCurrentUserApproveRequest(selectedRequest)
                          ? "Allowed to approve/reject"
                          : "View only - not assigned approver"
                      }
                    />
                  </div>
                </section>

                <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Audit Trail
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    History
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <ApprovalInfoRow
                      label="Reference ID"
                      value={selectedRequest.reference_id || "-"}
                    />
                    <ApprovalInfoRow
                      label="Approved By"
                      value={selectedRequest.approved_by || "-"}
                    />
                    <ApprovalInfoRow
                      label="Approved At"
                      value={formatDateTime(selectedRequest.approved_at)}
                    />
                    <ApprovalInfoRow
                      label="Rejected By"
                      value={selectedRequest.rejected_by || "-"}
                    />
                    <ApprovalInfoRow
                      label="Rejected At"
                      value={formatDateTime(selectedRequest.rejected_at)}
                    />
                    <ApprovalInfoRow
                      label="Rejection Reason"
                      value={selectedRequest.rejection_reason || "-"}
                      wide
                    />
                  </div>
                </section>

                {selectedRequest.status !== "PENDING" && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                    This request is already {selectedRequest.status}.
                  </div>
                )}

                {selectedRequest.status === "PENDING" &&
                  !canCurrentUserApproveRequest(selectedRequest) && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                      You can view this request, but only an assigned approver
                      can approve or reject it.
                    </div>
                  )}
              </div>

              {selectedRequest.status === "PENDING" &&
                canCurrentUserApproveRequest(selectedRequest) && (
                  <div className="border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => approveRequest(selectedRequest)}
                        className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      >
                        {isProcessing ? "Processing..." : "Approve Decision"}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => {
                          setRejectReason("");
                          setShowRejectModal(true);
                        }}
                        className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      >
                        {isProcessing ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                )}
            </aside>
          </div>
        )}

        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Reject Request
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Decline Request
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Enter the reason for rejecting this request. This reason will
                  be saved in the approval audit trail.
                </p>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                rows={4}
                placeholder="Example: Insufficient documentation, duplicate request, or budget exceeded..."
              />

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="h-11 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => rejectRequest(selectedRequest, rejectReason)}
                  className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                >
                  {isProcessing ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ApprovalTopNavbar() {
  return (
    <div className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-full items-center justify-between px-5 sm:px-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          APPROVALS / APPROVAL CENTER
        </p>
      </div>
    </div>
  );
}

function ApprovalRequestDetails({ request, payload, formatMoney }: any) {
  const requestType = String(request?.request_type || "");

  if (requestType === "EXPENSE_REQUEST") {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <ApprovalInfoRow label="Amount" value={formatMoney(payload?.amount)} />
        <ApprovalInfoRow
          label="Request Date"
          value={
            payload?.request_date || request?.created_at?.slice?.(0, 10) || "-"
          }
        />
        <ApprovalInfoRow
          label="Expense Category"
          value={payload?.category || payload?.expense_category || "-"}
        />
        <ApprovalInfoRow
          label="Expense Area"
          value={payload?.expense_area || payload?.expense_department || "-"}
        />
        <ApprovalInfoRow
          label="Department"
          value={payload?.department || "-"}
        />
        <ApprovalInfoRow label="Urgency" value={payload?.urgency || "-"} />
        <ApprovalInfoRow
          label="Reason / Purpose"
          value={payload?.reason || request?.description || "-"}
          wide
        />
      </div>
    );
  }

  if (requestType === "PAYROLL_REOPEN") {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <ApprovalInfoRow
          label="Employee"
          value={payload?.employee_name || payload?.employeeName || request?.requested_by || "-"}
        />
        <ApprovalInfoRow
          label="Payroll Period"
          value={payload?.period_label || payload?.periodLabel || "-"}
        />
        <ApprovalInfoRow
          label="Target Status"
          value={payload?.reopen_target_status || "REGISTERED"}
        />
        <ApprovalInfoRow
          label="Attendance Lock"
          value={
            payload?.attendance_locked === false
              ? "Unlock attendance"
              : "Unlock after approval"
          }
        />
        <ApprovalInfoRow
          label="Needs Regeneration"
          value={payload?.needs_regeneration === false ? "No" : "Yes"}
        />
        <ApprovalInfoRow
          label="Reason"
          value={payload?.reason || request?.description || "-"}
          wide
        />
      </div>
    );
  }

  if (requestType === "LEAVE_REQUEST" || requestType === "LEAVE_CANCELLATION") {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <ApprovalInfoRow
          label="Employee"
          value={payload?.employee_name || request?.requested_by || "-"}
        />
        <ApprovalInfoRow
          label="Leave Type"
          value={payload?.leave_type || "-"}
        />
        <ApprovalInfoRow
          label="Start Date"
          value={payload?.start_date || "-"}
        />
        <ApprovalInfoRow label="End Date" value={payload?.end_date || "-"} />
        <ApprovalInfoRow
          label="Total Days"
          value={payload?.days || payload?.total_days || "-"}
        />
        <ApprovalInfoRow
          label="Reason"
          value={
            payload?.reason || payload?.remarks || request?.description || "-"
          }
          wide
        />
        {requestType === "LEAVE_CANCELLATION" && (
          <ApprovalInfoRow
            label="Cancellation Reason"
            value={payload?.cancellation_reason || "-"}
            wide
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
      <ApprovalInfoRow label="Amount" value={formatMoney(payload?.amount)} />
      <ApprovalInfoRow
        label="Business Date"
        value={payload?.business_date || payload?.request_date || "-"}
      />
      <ApprovalInfoRow label="Movement" value={payload?.movement_type || "-"} />
      <ApprovalInfoRow label="Source" value={payload?.source || "-"} />
      <ApprovalInfoRow label="Payment" value={payload?.payment_type || "-"} />
      <ApprovalInfoRow label="From" value={payload?.from_person || "-"} />
      <ApprovalInfoRow label="To" value={payload?.to_person || "-"} />
      <ApprovalInfoRow label="Encoded By" value={payload?.encoded_by || "-"} />
      <ApprovalInfoRow
        label="Expense Category"
        value={payload?.expense_category || payload?.category || "-"}
      />
      <ApprovalInfoRow
        label="Expense Area"
        value={payload?.expense_department || payload?.expense_area || "-"}
      />
      <ApprovalInfoRow
        label="Cash Advance Employee"
        value={payload?.cash_advance_employee_name || "-"}
      />
      <ApprovalInfoRow
        label="Payroll Period"
        value={payload?.payroll_period_label || "-"}
      />
      <ApprovalInfoRow
        label="Remarks"
        value={payload?.remarks || payload?.reason || "-"}
        wide
      />
    </div>
  );
}

function ApprovalKpiCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: any;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function ApprovalStatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const style =
    normalized === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700"
        : normalized === "PENDING"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : normalized === "CLOSED" || normalized === "CANCELLED"
            ? "border-slate-200 bg-slate-100 text-slate-700"
            : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}
    >
      {normalized || "UNKNOWN"}
    </span>
  );
}

function ApprovalDetailCard({ label, value }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <h3 className="mt-1.5 break-words text-base font-black text-slate-950">
        {value}
      </h3>
    </div>
  );
}

function ApprovalInfoRow({ label, value, wide }: any) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${wide ? "md:col-span-2" : ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function SummaryLine({ label, value, strong }: any) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className={`max-w-[210px] text-right text-sm ${strong ? "font-black text-slate-950" : "font-semibold text-slate-700"}`}
      >
        {value}
      </p>
    </div>
  );
}
