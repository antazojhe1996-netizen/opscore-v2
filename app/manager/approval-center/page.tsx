"use client";

import { useEffect, useRef, useState } from "react";
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
        ""
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
      .select("id, company_id, employee_id, employee_name, leave_type, start_date, end_date, status")
      .eq("id", request.reference_id)
      .maybeSingle();

    if (leaveFetchError) {
      console.log("LEAVE APPROVAL OVERLAP FETCH ERROR:", leaveFetchError.message);
      alert(`Leave approval safety check failed. ${leaveFetchError.message}`);
      return false;
    }

    if (!leaveData) {
      alert("Leave approval safety check failed. Linked leave request was not found.");
      return false;
    }

    const companyId = String(
      leaveData.company_id || request.company_id || payload.company_id || ""
    ).trim();
    const employeeId = String(leaveData.employee_id || payload.employee_id || "").trim();
    const startDate = String(leaveData.start_date || payload.start_date || "").trim();
    const endDate = String(leaveData.end_date || payload.end_date || "").trim();

    if (!companyId || !employeeId || !startDate || !endDate) {
      alert("Leave approval safety check failed. Missing company, employee, or leave dates.");
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
        `Cannot approve leave. Selected dates overlap with ${conflict.leave_type || "approved leave"} from ${formatDate(conflict.start_date)} to ${formatDate(conflict.end_date)} (${conflict.status}).`
      );
      return false;
    }

    return true;
  };

  const calculateLeaveDays = (startDate: any, endDate: any, fallbackDays?: any) => {
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
        ""
    ).trim();

    if (directEmployeeNo) return directEmployeeNo;

    const employeeId = String(leaveData?.employee_id || payload?.employee_id || "").trim();

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

  const adjustLeaveCreditsForApproval = async (request: any, leaveData: any) => {
    const payload = getPayload(request) || {};
    const leaveType = String(leaveData?.leave_type || payload?.leave_type || "").trim();

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

    const { data: creditRecord, error: creditError } = await supabase
      .from("employee_leave_credits")
      .select("*")
      .eq("employee_no", employeeNo)
      .eq("leave_type", leaveType)
      .maybeSingle();

    if (creditError) {
      console.log("GET LEAVE CREDIT RECORD ERROR:", creditError.message);
      alert(`Leave credit deduction failed. ${creditError.message}`);
      return false;
    }

    if (!creditRecord) {
      alert(`Cannot approve leave. No ${leaveType} credit record found for employee no. ${employeeNo}.`);
      return false;
    }

    const currentUsed = Number(creditRecord.used_credits || 0);
    const currentRemaining = Number(creditRecord.remaining_credits ?? creditRecord.credits ?? 0);

    if (currentRemaining < leaveDays) {
      alert(
        `Cannot approve leave. Insufficient ${leaveType} credits. Needed: ${leaveDays}. Remaining: ${currentRemaining}.`
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
      alert(`Leave approval failed before credit deduction. ${updateError.message}`);
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

  const restoreLeaveCreditsForCancellation = async (request: any, leaveData: any) => {
    const payload = getPayload(request) || {};
    const leaveType = String(leaveData?.leave_type || payload?.leave_type || "").trim();

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

    const { data: creditRecord, error: creditError } = await supabase
      .from("employee_leave_credits")
      .select("*")
      .eq("employee_no", employeeNo)
      .eq("leave_type", leaveType)
      .maybeSingle();

    if (creditError) {
      console.log("GET LEAVE CREDIT RESTORE ERROR:", creditError.message);
      alert(`Leave cancellation credit restore failed. ${creditError.message}`);
      return false;
    }

    if (!creditRecord) return true;

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
      alert(`Leave cancellation failed before credit restore. ${updateError.message}`);
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
      LEAVE_REQUEST: "Leave Request",
      LEAVE_CANCELLATION: "Leave Cancellation",
    };

    return labels[type] || type;
  };

  const getRequestTypeBadgeStyle = (type: string) => {
    if (type === "EXPENSE_REQUEST") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    if (type === "PAYROLL_ADJUSTMENT") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    if (type === "LEAVE_REQUEST") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    if (type === "LEAVE_CANCELLATION") return "border-slate-700 bg-slate-800 text-slate-300";
    if (type === "CASH_ADVANCE_RELEASE") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    if (type === "OWNER_WITHDRAWAL") return "border-red-500/20 bg-red-500/10 text-red-300";
    if (CASH_DRAWER_REQUEST_TYPES.includes(type)) return "border-slate-700 bg-slate-800 text-slate-300";

    return "border-slate-700 bg-slate-800 text-slate-300";
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

  const getApprovalRequestMarker = (requestId: any) =>
    `Approval Request ID: ${String(requestId || "")}`;

  const appendApprovalRequestMarker = (remarks: any, requestId: any) => {
    const baseRemarks = String(remarks || "Approved cash drawer movement").trim();
    const marker = getApprovalRequestMarker(requestId);

    if (baseRemarks.includes(marker)) return baseRemarks;

    return `${baseRemarks} | ${marker}`;
  };

  const cashDrawerMovementAlreadyPosted = async (
    request: any,
    payload: any,
    amountValue: number
  ) => {
    const marker = getApprovalRequestMarker(request.id);

    const { data: markerMatch, error: markerError } = await supabase
      .from("finance_cash_movements")
      .select("id, created_at")
      .ilike("remarks", `%${marker}%`)
      .limit(1)
      .maybeSingle();

    if (markerError) {
      console.log("CASH APPROVAL DUPLICATE MARKER CHECK ERROR:", markerError.message);
      throw new Error(markerError.message);
    }

    if (markerMatch) return true;

    // Safety fallback for older rows created before the approval-request marker existed.
    // This catches accidental double-clicks / repeated approval execution with the same payload.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const baseRemarks = String(payload.remarks || request.description || "Approved cash drawer movement").trim();

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

    const { data: fallbackMatch, error: fallbackError } = await fallbackQuery.maybeSingle();

    if (fallbackError) {
      console.log("CASH APPROVAL DUPLICATE FALLBACK CHECK ERROR:", fallbackError.message);
      throw new Error(fallbackError.message);
    }

    return Boolean(fallbackMatch);
  };

  const executeCashDrawerMovement = async (request: any) => {
    const payload = getPayload(request);

    if (!payload) {
      alert("Missing cash drawer approval payload. Check approval_requests.request_payload column.");
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
      alreadyPosted = await cashDrawerMovementAlreadyPosted(request, payload, amountValue);
    } catch (duplicateCheckError: any) {
      alert(`Duplicate safety check failed. Nothing was posted. ${duplicateCheckError?.message || duplicateCheckError}`);
      return false;
    }

    if (alreadyPosted) {
      alert("Possible duplicate approval detected. This request already created a cash movement. Nothing was posted again.");
      return false;
    }

    const movementRemarks = appendApprovalRequestMarker(
      payload.remarks || request.description || "Approved cash drawer movement",
      request.id
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
        encoded_by: payload.encoded_by || currentEmployeeName || "Manager Approval Center",
        remarks: movementRemarks,
        reference_type: payload.should_create_expense ? "expense" : "approval_request",
        reference_id: payload.should_create_expense ? null : request.id,
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
      console.log("FETCH LEAVE FOR CREDIT DEDUCTION ERROR:", leaveFetchError.message);
      alert(`Approval saved failed before leave credit check. ${leaveFetchError.message}`);
      return false;
    }

    if (!leaveData) {
      alert("Approval failed. Linked leave request was not found.");
      return false;
    }

    const creditAdjusted = await adjustLeaveCreditsForApproval(request, leaveData);

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

    const { data: leaveData, error: leaveFetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", request.reference_id)
      .maybeSingle();

    if (leaveFetchError) {
      console.log("FETCH LEAVE FOR CREDIT RESTORE ERROR:", leaveFetchError.message);
      alert(`Leave cancellation failed before credit restore check. ${leaveFetchError.message}`);
      return false;
    }

    if (leaveData && String(leaveData.status || "") === "Approved") {
      const creditsRestored = await restoreLeaveCreditsForCancellation(request, leaveData);

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
      alert(`Approval status safety check failed. ${freshRequestError.message}`);
      return;
    }

    if (!freshRequest || String(freshRequest.status || "") !== "PENDING") {
      setIsProcessing(false);
      processingRequestRef.current = null;
      alert("This request is no longer pending. It may have already been processed.");
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
        console.log("SYNC PAYROLL ADJUSTMENT APPROVAL ERROR:", adjustmentError.message);
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
        console.log("SYNC EXPENSE REQUEST APPROVAL ERROR:", expenseRequestError.message);
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
        console.log("SYNC PAYROLL ADJUSTMENT REJECTION ERROR:", adjustmentError.message);
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
        console.log("SYNC EXPENSE REQUEST REJECTION ERROR:", expenseRequestError.message);
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden p-6 xl:p-8">
        <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
              Workflow Control
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">
              Approval Center
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
              Centralized approval workspace for leave, payroll, cash drawer,
              expense, and operational requests. Only requests assigned to your
              approval role are shown.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Current user: {currentEmployeeName || currentEmployeeId || "Not detected"}
            </p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ApprovalKpiCard
            icon={<Clock className="h-5 w-5" />}
            title="Needs Action"
            value={pendingRequests.length}
            description="Pending requests assigned to you"
            danger={pendingRequests.length > 0}
          />
          <ApprovalKpiCard
            icon={<CheckCircle className="h-5 w-5" />}
            title="Completed"
            value={approvedRequests.length}
            description="Approved requests in your queue"
            success
          />
          <ApprovalKpiCard
            icon={<XCircle className="h-5 w-5" />}
            title="Declined"
            value={rejectedRequests.length}
            description="Rejected approval requests"
            danger={rejectedRequests.length > 0}
          />
          <ApprovalKpiCard
            icon={<FileText className="h-5 w-5" />}
            title="All Requests"
            value={visibleRequests.length}
            description="Total visible approval workload"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Status
              </label>
              <select
                value={activeTab}
                onChange={(event) => {
                  setActiveTab(event.target.value);
                  setCategoryFilter("ALL");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none"
              >
                {categoryItems.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Current View
              </p>
              <p className="mt-1">
                Showing <span className="font-black text-white">{filteredRequests.length}</span>{" "}
                {activeTab.toLowerCase()} request(s) under{" "}
                <span className="font-black text-white">{getCategoryLabel(categoryFilter)}</span>.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Approval Queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review assigned requests. Detailed payload, workflow assignment,
                and audit history are available inside the review drawer.
              </p>
            </div>
            <ApprovalStatusBadge status={activeTab} />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-950 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Request</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                        No approval requests assigned to you.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getRequestTypeBadgeStyle(
                                request.request_type
                              )}`}
                            >
                              {getRequestTypeLabel(request.request_type)}
                            </span>
                            <div>
                              <p className="font-black text-white">{request.title || "Untitled Request"}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {request.module || "No module"} • {getApproverRoleForRequest(request)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                            {getCategoryLabel(getRequestCategory(request.request_type))}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {request.requested_by || "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {formatDateTime(request.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <ApprovalStatusBadge status={request.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
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
        </section>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 text-white shadow-2xl">
              <div className="border-b border-slate-800 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                      Review Request
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      {selectedRequest.title || "Untitled Request"}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getRequestTypeBadgeStyle(
                          selectedRequest.request_type
                        )}`}
                      >
                        {getRequestTypeLabel(selectedRequest.request_type)}
                      </span>
                      <ApprovalStatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-xl bg-slate-900 p-3 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ApprovalDetailCard label="Requested By" value={selectedRequest.requested_by || "-"} />
                  <ApprovalDetailCard label="Category" value={getCategoryLabel(getRequestCategory(selectedRequest.request_type))} />
                  <ApprovalDetailCard label="Module" value={selectedRequest.module || "-"} />
                  <ApprovalDetailCard label="Submitted" value={formatDateTime(selectedRequest.created_at)} />
                </section>

                <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="text-lg font-black text-white">Request Details</h3>
                  <p className="mt-3 rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                    {selectedRequest.description || "No description provided."}
                  </p>

                  {getPayload(selectedRequest) && (
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <ApprovalInfoRow label="Amount" value={formatMoney(getPayload(selectedRequest)?.amount)} />
                      <ApprovalInfoRow label="Business Date" value={getPayload(selectedRequest)?.business_date || "-"} />
                      <ApprovalInfoRow label="Movement" value={getPayload(selectedRequest)?.movement_type || "-"} />
                      <ApprovalInfoRow label="Source" value={getPayload(selectedRequest)?.source || "-"} />
                      <ApprovalInfoRow label="Payment" value={getPayload(selectedRequest)?.payment_type || "-"} />
                      <ApprovalInfoRow label="From" value={getPayload(selectedRequest)?.from_person || "-"} />
                      <ApprovalInfoRow label="To" value={getPayload(selectedRequest)?.to_person || "-"} />
                      <ApprovalInfoRow label="Encoded By" value={getPayload(selectedRequest)?.encoded_by || "-"} />
                      <ApprovalInfoRow label="Expense Category" value={getPayload(selectedRequest)?.expense_category || "-"} />
                      <ApprovalInfoRow label="Expense Area" value={getPayload(selectedRequest)?.expense_department || "-"} />
                      <ApprovalInfoRow label="Cash Advance Employee" value={getPayload(selectedRequest)?.cash_advance_employee_name || "-"} />
                      <ApprovalInfoRow label="Payroll Period" value={getPayload(selectedRequest)?.payroll_period_label || "-"} />
                      <ApprovalInfoRow label="Leave Employee" value={getPayload(selectedRequest)?.employee_name || "-"} />
                      <ApprovalInfoRow label="Leave Type" value={getPayload(selectedRequest)?.leave_type || "-"} />
                      <ApprovalInfoRow
                        label="Leave Dates"
                        value={`${getPayload(selectedRequest)?.start_date || "-"} to ${getPayload(selectedRequest)?.end_date || "-"}`}
                      />
                      <ApprovalInfoRow label="Total Days" value={getPayload(selectedRequest)?.days || getPayload(selectedRequest)?.total_days || "-"} />
                      <ApprovalInfoRow label="Remarks" value={getPayload(selectedRequest)?.remarks || "-"} wide />
                      <ApprovalInfoRow label="Cancellation Reason" value={getPayload(selectedRequest)?.cancellation_reason || "-"} wide />
                    </div>
                  )}
                </section>

                <section className="mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                  <h3 className="text-lg font-black text-blue-200">Approval Assignment</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <ApprovalInfoRow label="Required Role" value={getApproverRoleForRequest(selectedRequest)} />
                    <ApprovalInfoRow label="Assigned Approvers" value={getAssignedApproverLabel(selectedRequest)} />
                    <ApprovalInfoRow label="Current User" value={currentEmployeeName || currentEmployeeId || "Not detected"} />
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

                <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="text-lg font-black text-white">Audit Trail</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <ApprovalInfoRow label="Reference ID" value={selectedRequest.reference_id || "-"} />
                    <ApprovalInfoRow label="Approved By" value={selectedRequest.approved_by || "-"} />
                    <ApprovalInfoRow label="Approved At" value={formatDateTime(selectedRequest.approved_at)} />
                    <ApprovalInfoRow label="Rejected By" value={selectedRequest.rejected_by || "-"} />
                    <ApprovalInfoRow label="Rejected At" value={formatDateTime(selectedRequest.rejected_at)} />
                    <ApprovalInfoRow label="Rejection Reason" value={selectedRequest.rejection_reason || "-"} wide />
                  </div>
                </section>

                {selectedRequest.status === "PENDING" ? (
                  canCurrentUserApproveRequest(selectedRequest) ? (
                    <div className="sticky bottom-0 -mx-6 border-t border-slate-800 bg-slate-950/95 p-6 backdrop-blur">
                      <div className="flex gap-3">
                        <button
                          disabled={isProcessing}
                          onClick={() => approveRequest(selectedRequest)}
                          className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProcessing ? "Processing..." : "Approve Request"}
                        </button>

                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setRejectReason("");
                            setShowRejectModal(true);
                          }}
                          className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-black text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProcessing ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                      You can view this request, but only an assigned approver can approve or reject it.
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                    This request is already {selectedRequest.status}.
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
              <div className="mb-4">
                <h3 className="text-lg font-black text-white">Reject Request</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the reason for rejecting this request. This reason will be saved in the approval audit trail.
                </p>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200 outline-none focus:border-red-500"
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
                  className="flex-1 rounded-xl border border-slate-700 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => rejectRequest(selectedRequest, rejectReason)}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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

function ApprovalKpiCard({
  icon,
  title,
  value,
  description,
  success,
  danger,
}: any) {
  const cardStyle = danger
    ? "border-red-500/20 bg-slate-900"
    : success
      ? "border-emerald-500/20 bg-slate-900"
      : "border-slate-800 bg-slate-900";

  const iconStyle = danger
    ? "bg-red-500/10 text-red-300"
    : success
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-slate-950 text-slate-300";

  return (
    <div className={`rounded-2xl border p-5 ${cardStyle}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{title}</p>
        <div className={`rounded-xl p-3 ${iconStyle}`}>{icon}</div>
      </div>
      <h2 className="text-3xl font-black text-white">{value}</h2>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function ApprovalStatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const style =
    normalized === "APPROVED"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : normalized === "REJECTED"
        ? "border-red-500/20 bg-red-500/10 text-red-300"
        : normalized === "PENDING"
          ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
          : "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${style}`}>
      {normalized || "UNKNOWN"}
    </span>
  );
}

function ApprovalDetailCard({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className="mt-2 break-words text-lg font-black text-white">{value}</h3>
    </div>
  );
}

function ApprovalInfoRow({ label, value, wide }: any) {
  return (
    <div className={`rounded-xl bg-slate-950 px-4 py-3 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}
