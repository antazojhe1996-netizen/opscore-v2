import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

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

// =========================
// CLEAN REMARKS ONLY
// =========================
export const cleanRemarks = (remarks: any) =>
  String(remarks || "Approved movement").trim();

// =========================
// APPROVAL UPDATE
// =========================
const markApprovalApproved = async ({
  request,
  currentEmployeeName,
}: {
  request: any;
  currentEmployeeName: string;
}) => {
  const { error } = await supabase
    .from("approval_requests")
    .update({
      status: "APPROVED",
      approved_by: currentEmployeeName || "Approval Center",
      approved_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) {
    throw new Error(`Approval update failed: ${error.message}`);
  }
};

// =========================
// EXISTING MOVEMENT CHECK
// =========================
const getExistingApprovalMovement = async (request: any) => {
  const { data, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("source_document_id", request.id)
    .neq("status", "VOIDED");

  if (error) throw new Error(error.message);

  if ((data || []).length > 1) {
    throw new Error(`Duplicate movement detected for request ${request.id}`);
  }

  return data?.[0] || null;
};

// =========================
// MAIN EXECUTION
// =========================
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
  const amountValue = Number(payload.amount || 0);

  const finalCompanyId = String(
    companyId || request.company_id || payload.company_id || ""
  ).trim();

  if (!request?.id) throw new Error("Invalid approval request.");
  if (!finalCompanyId) throw new Error("Missing company_id.");
  if (!Number.isFinite(amountValue) || amountValue <= 0)
    throw new Error("Invalid amount.");

  // =========================
  // CHECK EXISTING MOVEMENT
  // =========================
  const existingMovement = await getExistingApprovalMovement(request);

  // =========================
  // REUSE EXISTING
  // =========================
  if (existingMovement?.id) {
    await markApprovalApproved({ request, currentEmployeeName });

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Approval Reused Movement",
      description: `${request.request_type} reused existing movement.`,
      severity: "warning",
      recordId: request.id,
    });

    return {
      movement: existingMovement,
      expense: null,
      reusedExistingMovement: true,
    };
  }

  // =========================
  // CLEAN REMARKS
  // =========================
  const movementRemarks = cleanRemarks(
    payload.remarks || request.description || "Approved cash movement"
  );

  // =========================
  // CREATE CASH MOVEMENT
  // =========================
  const { data: movementData, error: movementError } = await supabase
    .from("finance_cash_movements")
    .insert({
      company_id: finalCompanyId,
      business_date: payload.business_date,
      movement_type: payload.movement_type,
      source: payload.source,
      payment_type: payload.payment_type || "Cash",
      amount: amountValue,

      from_person: payload.from_person || "",
      to_person: payload.to_person || "",
      encoded_by: payload.encoded_by || currentEmployeeName || "Approval Center",

      remarks: movementRemarks,
      status: "ACTIVE",

      // 🔥 SINGLE SOURCE OF TRUTH
      source_document_id: request.id,

      origin_type: "approval_request",
      origin_id: request.id,

      created_by_module: "Approval Center",
      source_action: normalizeWorkflowKey(request.request_type),

      created_by_user_id:
        currentSystemUserId || currentEmployeeId || null,
      created_by_user_name: currentEmployeeName || "Approval Center",

      cash_drawer_id: payload.cash_drawer_id || null,
    })
    .select()
    .single();

  if (movementError) throw new Error(movementError.message);

  let createdExpenseData: any = null;

  // =========================
  // OPTIONAL EXPENSE
  // =========================
  if (payload.should_create_expense) {
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: finalCompanyId,
        expense_date: payload.business_date,
        category: payload.expense_category || "Other",
        subcategory: payload.expense_subcategory || null,
        department: payload.expense_department || "Operations",

        description:
          payload.expense_description ||
          request.description ||
          "Approved expense",

        amount: amountValue,
        released_amount: amountValue,
        net_expense_amount: amountValue,

        payment_method: payload.payment_type || "Cash",
        remarks: movementRemarks,

        source_document_id: request.id,
      })
      .select()
      .single();

    if (expenseError) {
      throw new Error(`Expense failed: ${expenseError.message}`);
    }

    createdExpenseData = expenseData;
  }

  // =========================
  // APPROVE REQUEST
  // =========================
  await markApprovalApproved({ request, currentEmployeeName });

  await createAuditLog({
    userName: currentEmployeeName || "OPSCORE USER",
    module: "Approval Center",
    action: "Cash Approval Executed",
    description: `${request.request_type} approved successfully.`,
    severity: "info",
    recordId: request.id,
  });

  return {
    movement: movementData,
    expense: createdExpenseData,
    reusedExistingMovement: false,
  };
}