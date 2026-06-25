import { supabase } from '@/lib/supabase';
import { createAuditLog } from "@/lib/audit";

/**
 * =========================
 * SERVER SUPABASE CLIENT
 * =========================
 */
function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

/**
 * =========================
 * LOCK CHECK
 * =========================
 */
async function checkLock(supabase: any, requestId: string) {
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
async function createLock(
  supabase: any,
  requestId: string,
  companyId: string
) {
  const { error } = await supabase
    .from("cash_execution_locks")
    .insert({
      source_document_id: requestId,
      company_id: companyId,
      type: "APPROVAL",
      created_at: new Date().toISOString(),
    });

  if (error) throw new Error("Execution already locked");
}

/**
 * =========================
 * MARK APPROVED
 * =========================
 */
async function markApprovalApproved(
  supabase: any,
  request: any,
  employeeName: string
) {
  const { error } = await supabase
    .from("approval_requests")
    .update({
      status: "APPROVED",
      approved_by: employeeName || "Approval Center",
      approved_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) throw new Error(error.message);
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
  const supabase = getSupabaseServer();

  const payload = getApprovalPayload(request);
  const amount = Number(payload.amount || 0);

  const finalCompanyId =
    companyId || request.company_id || payload.company_id;

  if (!request?.id) throw new Error("Invalid request");
  if (!finalCompanyId) throw new Error("Missing company_id");
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  /**
   * =========================
   * STEP 1: CHECK LOCK
   * =========================
   */
  const lock = await checkLock(supabase, request.id);

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
      reusedExistingMovement: true,
      message: "Already executed (locked)",
    };
  }

  /**
   * =========================
   * STEP 2: CREATE LOCK
   * =========================
   */
  await createLock(supabase, request.id, finalCompanyId);

  /**
   * =========================
   * STEP 3: CREATE MOVEMENT
   * =========================
   */
  const remarks = cleanRemarks(
    payload.remarks || request.description || "Approved movement"
  );

  const { data: movement, error: movementError } = await supabase
    .from("finance_cash_movements")
    .insert({
      company_id: finalCompanyId,
      business_date: payload.business_date,
      movement_type: payload.movement_type,
      source: payload.source,
      payment_type: payload.payment_type || "Cash",
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

      created_by_user_id: currentSystemUserId || currentEmployeeId,
      created_by_user_name: currentEmployeeName,

      cash_cash_drawer_id: payload.cash_cash_drawer_id || null,
    })
    .select()
    .single();

  if (movementError) {
    await supabase
      .from("cash_execution_locks")
      .delete()
      .eq("source_document_id", request.id);

    throw new Error(movementError.message);
  }

  /**
   * =========================
   * STEP 4: OPTIONAL EXPENSE
   * =========================
   */
  let expense = null;

  if (payload.should_create_expense) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        company_id: finalCompanyId,
        expense_date: payload.business_date,
        category: payload.expense_category || "Other",
        subcategory: payload.expense_subcategory || null,
        department: payload.expense_department || "Operations",
        description: payload.expense_description || request.description,
        amount,
        payment_method: payload.payment_type || "Cash",
        source_document_id: request.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    expense = data;
  }

  /**
   * =========================
   * STEP 5: APPROVE REQUEST
   * =========================
   */
  await markApprovalApproved(supabase, request, currentEmployeeName);

  /**
   * =========================
   * STEP 6: AUDIT LOG
   * =========================
   */
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
    reusedExistingMovement: false,
  };
}
