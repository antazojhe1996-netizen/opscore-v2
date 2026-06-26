import { supabaseServer as supabase } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit";

/**
 * =========================
 * APPROVAL ACTIONS / ENGINE
 * =========================
 * Source of truth for approval side effects.
 *
 * Rules:
 * - PENDING = no movement
 * - APPROVED = exactly one movement
 * - REJECTED = no movement
 *
 * This file must not create a separate Supabase client.
 * It uses the official V3 server client only.
 */

/**
 * =========================
 * HELPERS
 * =========================
 */

export const normalizeWorkflowKey = (value: any) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

export const getApprovalPayload = (request: any) => {
  if (!request?.request_payload) return {};

  if (typeof request.request_payload === "string") {
    try {
      return JSON.parse(request.request_payload);
    } catch {
      return {};
    }
  }

  return request.request_payload || {};
};

const cleanRemarks = (remarks: any) =>
  String(remarks || "Approved movement").trim();

const getAmount = (request: any, payload: any) => {
  const amount = Number(
    payload.amount ??
      request.amount ??
      payload.total_amount ??
      payload.request_amount ??
      0,
  );

  return Number.isFinite(amount) ? amount : 0;
};

const getCashDrawerId = (payload: any) =>
  payload.cash_cash_drawer_id ||
  payload.cash_drawer_id ||
  payload.drawer_id ||
  null;

const getPaymentType = (request: any, payload: any) =>
  payload.payment_type ||
  payload.payment_method ||
  request.payment_type ||
  request.payment_method ||
  "Cash";

const getMovementType = (request: any, payload: any) => {
  if (payload.movement_type) return payload.movement_type;

  const requestType = normalizeWorkflowKey(request.request_type);

  if (requestType.includes("CASH_IN")) return "Cash In";
  if (requestType.includes("IN")) return "Cash In";

  return "Cash Out";
};

const getSource = (request: any, payload: any) =>
  payload.source ||
  request.source ||
  request.category ||
  payload.category ||
  "Approval";

const getBusinessDate = (payload: any) =>
  payload.business_date ||
  payload.date ||
  new Date().toISOString().slice(0, 10);

/**
 * =========================
 * LOCK CHECK
 * =========================
 */
async function checkLock(requestId: string) {
  const { data, error } = await supabase
    .from("cash_execution_locks")
    .select("*")
    .eq("source_document_id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

/**
 * =========================
 * CREATE LOCK
 * =========================
 */
async function createLock(requestId: string, companyId: string) {
  const { error } = await supabase.from("cash_execution_locks").insert({
    source_document_id: requestId,
    company_id: companyId,
    type: "APPROVAL",
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error("Execution already locked");
  }
}

/**
 * =========================
 * DELETE LOCK
 * =========================
 */
async function deleteLock(requestId: string) {
  await supabase
    .from("cash_execution_locks")
    .delete()
    .eq("source_document_id", requestId);
}

/**
 * =========================
 * MARK APPROVED
 * =========================
 */
async function markApprovalApproved(requestId: string, employeeName: string) {
  const { error } = await supabase
    .from("approval_requests")
    .update({
      status: "APPROVED",
      approved_by: employeeName || "Approval Center",
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw new Error(error.message);
}

/**
 * =========================
 * CREATE CASH MOVEMENT
 * =========================
 */
async function createCashMovement({
  request,
  payload,
  amount,
  companyId,
  currentEmployeeName,
  currentEmployeeId,
  currentSystemUserId,
}: {
  request: any;
  payload: any;
  amount: number;
  companyId: string;
  currentEmployeeName: string;
  currentEmployeeId?: string | null;
  currentSystemUserId?: string | null;
}) {
  const movementType = getMovementType(request, payload);
  const paymentType = getPaymentType(request, payload);
  const source = getSource(request, payload);
  const businessDate = getBusinessDate(payload);

  const remarks = cleanRemarks(
    payload.remarks ||
      request.description ||
      request.title ||
      "Approved movement",
  );

  const { data: movement, error } = await supabase
    .from("finance_cash_movements")
    .insert({
      company_id: companyId,
      business_date: businessDate,
      movement_type: movementType,
      source,
      payment_type: paymentType,
      amount,

      from_person: payload.from_person || "",
      to_person: payload.to_person || "",
      encoded_by: currentEmployeeName,

      remarks,
      status: "ACTIVE",

      source_document_id: request.id,
      origin_type: "approval_request",
      origin_id: request.id,

      created_by_module: "Approval Center",
      source_action: normalizeWorkflowKey(request.request_type),

      created_by_user_id: currentSystemUserId || currentEmployeeId || null,
      created_by_user_name: currentEmployeeName,

      cash_cash_drawer_id: getCashDrawerId(payload),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return movement;
}

/**
 * =========================
 * OPTIONAL EXPENSE
 * =========================
 */
async function createOptionalExpense({
  request,
  payload,
  amount,
  companyId,
}: {
  request: any;
  payload: any;
  amount: number;
  companyId: string;
}) {
  if (!payload.should_create_expense) return null;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      expense_date: getBusinessDate(payload),
      category: payload.expense_category || payload.category || "Other",
      subcategory: payload.expense_subcategory || null,
      department: payload.expense_department || "Operations",
      description:
        payload.expense_description ||
        request.description ||
        request.title ||
        "Approved expense",
      amount,
      payment_method: getPaymentType(request, payload),
      source_document_id: request.id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}

/**
 * =========================
 * OPTIONAL EMPLOYEE BALANCE
 * =========================
 */
async function createOptionalEmployeeBalance({
  request,
  payload,
  amount,
  companyId,
}: {
  request: any;
  payload: any;
  amount: number;
  companyId: string;
}) {
  if (!payload.should_create_employee_balance) return null;

  const employeeId =
    payload.employee_id ||
    payload.requested_employee_id ||
    payload.cash_advance_employee_id ||
    null;

  if (!employeeId) {
    throw new Error("Missing employee_id for employee balance");
  }

  const { data, error } = await supabase
    .from("employee_balances")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      balance_type:
        payload.balance_type ||
        payload.employee_balance_type ||
        "Cash Advance",
      amount,
      original_amount: amount,
      remaining_balance: amount,
      status: "ACTIVE",
      source_document_id: request.id,
      remarks:
        payload.balance_remarks ||
        request.description ||
        request.title ||
        "Approved employee balance",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}

/**
 * =========================
 * MAIN EXECUTION
 * =========================
 */
export async function executeCashDrawerApprovalAction({
  request,
  currentEmployeeName,
  currentEmployeeId,
  currentSystemUserId,
  companyId,
}: {
  request: any;
  currentEmployeeName: string;
  currentEmployeeId?: string | null;
  currentSystemUserId?: string | null;
  companyId?: string | null;
}) {
  const payload = getApprovalPayload(request);
  const amount = getAmount(request, payload);

  const finalCompanyId =
    companyId || request.company_id || payload.company_id || null;

  if (!request?.id) throw new Error("Invalid request");
  if (!finalCompanyId) throw new Error("Missing company_id");
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const lock = await checkLock(request.id);

  if (lock) {
    await createAuditLog({
      userName: currentEmployeeName,
      module: "Approval Center",
      action: "Blocked Duplicate Execution",
      description: `Request ${request.id} already executed`,
      severity: "warning",
      recordId: request.id,
    });

    return {
      movement: null,
      expense: null,
      employeeBalance: null,
      reusedExistingMovement: true,
      message: "Already executed (locked)",
    };
  }

  await createLock(request.id, finalCompanyId);

  try {
    const movement = await createCashMovement({
      request,
      payload,
      amount,
      companyId: finalCompanyId,
      currentEmployeeName,
      currentEmployeeId,
      currentSystemUserId,
    });

    const expense = await createOptionalExpense({
      request,
      payload,
      amount,
      companyId: finalCompanyId,
    });

    const employeeBalance = await createOptionalEmployeeBalance({
      request,
      payload,
      amount,
      companyId: finalCompanyId,
    });

    await markApprovalApproved(request.id, currentEmployeeName);

    await createAuditLog({
      userName: currentEmployeeName,
      module: "Approval Center",
      action: "Cash Approval Executed",
      description: `${request.request_type} approved`,
      severity: "info",
      recordId: request.id,
    });

    return {
      movement,
      expense,
      employeeBalance,
      reusedExistingMovement: false,
    };
  } catch (error) {
    await deleteLock(request.id);

    throw error;
  }
}