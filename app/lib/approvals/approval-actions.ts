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

export const getApprovalRequestMarker = (requestId: any) =>
  `Approval Request ID: ${String(requestId || "")}`;

export const appendApprovalRequestMarker = (remarks: any, requestId: any) => {
  const baseRemarks = String(remarks || "Approved movement").trim();
  const marker = getApprovalRequestMarker(requestId);
  if (baseRemarks.includes(marker)) return baseRemarks;
  return `${baseRemarks} | ${marker}`;
};

const getExistingApprovalMovement = async (request: any) => {
  const marker = getApprovalRequestMarker(request.id);

  const { data: linkedRows, error: linkedError } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("approval_request_id", request.id)
    .neq("status", "VOIDED")
    .order("created_at", { ascending: true });

  if (linkedError) throw new Error(linkedError.message);

  if ((linkedRows || []).length > 1) {
    throw new Error(
      `Approval audit blocked. This request already has ${linkedRows.length} linked cash movements.`,
    );
  }

  if (linkedRows?.[0]) return linkedRows[0];

  const { data: markerRows, error: markerError } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .ilike("remarks", `%${marker}%`)
    .neq("status", "VOIDED")
    .order("created_at", { ascending: true });

  if (markerError) throw new Error(markerError.message);

  if ((markerRows || []).length > 1) {
    throw new Error(
      `Approval audit blocked. This request already has ${markerRows.length} marker-matched cash movements.`,
    );
  }

  if (markerRows?.[0]) return markerRows[0];

  return null;
};

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
    throw new Error(`Approval status update failed: ${error.message}`);
  }
};

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
    companyId || request.company_id || payload.company_id || "",
  ).trim();

  if (!request?.id) throw new Error("Invalid approval request.");
  if (!finalCompanyId) throw new Error("No company_id found for this approval request.");
  if (!Number.isFinite(amountValue) || amountValue <= 0) throw new Error("Invalid approval amount.");

  const existingMovement = await getExistingApprovalMovement(request);

  if (existingMovement?.id) {
    await supabase
      .from("finance_cash_movements")
      .update({ approval_request_id: request.id })
      .eq("id", existingMovement.id);

    await markApprovalApproved({ request, currentEmployeeName });

    await createAuditLog({
      userName: currentEmployeeName || "OPSCORE USER",
      module: "Approval Center",
      action: "Cash Approval Idempotent Skip",
      description: `${request.request_type} already had one movement. Approval marked approved without duplicate posting.`,
      severity: "warning",
      recordId: request.id,
      newValue: { existingMovementId: existingMovement.id },
    });

    return {
      movement: existingMovement,
      expense: null,
      employeeBalance: null,
      reusedExistingMovement: true,
    };
  }

  const marker = getApprovalRequestMarker(request.id);
  const movementRemarks = appendApprovalRequestMarker(
    payload.remarks || request.description || "Approved cash drawer movement",
    request.id,
  );

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

      reference_type: payload.should_create_expense ? "expense" : "approval_request",
      reference_id: payload.should_create_expense ? null : request.id,

      approval_request_id: request.id,
      origin_type: "approval_request",
      origin_id: request.id,
      created_by_module: "Approval Center",
      source_action: payload.source_action || `APPROVE_${normalizeWorkflowKey(request.request_type)}`,
      created_by_user_id: currentSystemUserId || currentEmployeeId || null,
      created_by_user_name: currentEmployeeName || "Approval Center",
      cash_drawer_id: payload.cash_drawer_id || null,
      liquidation_status:
        payload.liquidation_status ||
        (payload.should_create_expense && !payload.is_cash_advance_cash_out
          ? "FOR_LIQUIDATION"
          : "NOT_REQUIRED"),
      net_expense_amount: payload.should_create_expense ? amountValue : 0,
    })
    .select()
    .single();

  if (movementError) throw new Error(movementError.message);

  let createdExpenseData: any = null;
  let createdBalanceData: any = null;

  if (payload.should_create_expense) {
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: finalCompanyId,
        expense_date: payload.business_date,
        category: payload.is_cash_advance_cash_out
          ? "Cash Advance"
          : payload.expense_category || "Other",
        subcategory: payload.is_cash_advance_cash_out
          ? "Cash Advance Release"
          : payload.expense_subcategory || null,
        department: payload.is_cash_advance_cash_out
          ? "Payroll"
          : payload.expense_department || "Operations",
        description: payload.is_cash_advance_cash_out
          ? `Cash Advance - ${payload.cash_advance_employee_name || ""}`
          : payload.expense_description || request.description || "Approved expense release",
        amount: amountValue,
        released_amount: amountValue,
        actual_spent_amount: 0,
        returned_cash_amount: 0,
        net_expense_amount: amountValue,
        liquidation_status: payload.is_cash_advance_cash_out ? "NOT_REQUIRED" : "FOR_LIQUIDATION",
        payment_method: payload.payment_type || "Cash",
        employee_id: payload.is_cash_advance_cash_out
          ? payload.cash_advance_employee_id || null
          : null,
        employee_name: payload.is_cash_advance_cash_out
          ? payload.cash_advance_employee_name || null
          : payload.expense_released_to || null,
        deduct_to_payroll: Boolean(payload.is_cash_advance_cash_out),
        payroll_period_id: payload.is_cash_advance_cash_out
          ? payload.payroll_period_id || null
          : null,
        remarks: movementRemarks,
        source: payload.is_cash_advance_cash_out
          ? "Cash Drawer - Cash Advance"
          : "Cash Drawer",
        posted_to_cash_movements: true,
        cash_movement_id: movementData.id,
        approval_request_id: request.id,
        cash_posted_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (expenseError) {
      throw new Error(`Cash movement posted, but expense failed: ${expenseError.message}`);
    }

    createdExpenseData = expenseData;

    const { error: movementLinkError } = await supabase
  .from("finance_cash_movements")
  .update({
    approval_request_id: request.id,
  })
  .eq("id", movementData.id);

    if (movementLinkError) {
      throw new Error(`Expense created but movement link failed: ${movementLinkError.message}`);
    }

    if (payload.is_cash_advance_cash_out) {
      const { data: balanceData, error: balanceError } = await supabase
        .from("employee_balances")
        .insert({
          company_id: finalCompanyId,
          employee_id: payload.cash_advance_employee_id,
          employee_name: payload.cash_advance_employee_name,
          balance_type: "Cash Advance",
          original_amount: amountValue,
          remaining_balance: amountValue,
          status: "Active",
          source_module: "Cash Drawer",
          source_id: movementData.id,
          period_id: payload.payroll_period_id || null,
          remarks: `Source: Cash Drawer Approval. Expense ID: ${expenseData.id}. Cash Movement ID: ${movementData.id}. ${payload.cash_advance_purpose || ""}. ${marker}`,
        })
        .select()
        .single();

      if (!balanceError && balanceData?.id) {
        createdBalanceData = balanceData;

        await supabase
          .from("expenses")
          .update({ employee_balance_id: balanceData.id })
          .eq("id", expenseData.id);
      }
    }
  }

  await markApprovalApproved({ request, currentEmployeeName });

  await createAuditLog({
    userName: currentEmployeeName || "OPSCORE USER",
    module: "Approval Center",
    action: "Execute Cash Approval Action",
    description: `${request.request_type} approved and posted exactly one cash movement.`,
    severity: "warning",
    recordId: request.id,
    newValue: {
      movement: movementData,
      expense: createdExpenseData,
      employeeBalance: createdBalanceData,
    },
  });

  return {
    movement: movementData,
    expense: createdExpenseData,
    employeeBalance: createdBalanceData,
    reusedExistingMovement: false,
  };
}