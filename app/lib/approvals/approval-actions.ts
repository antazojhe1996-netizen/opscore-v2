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
  const finalCompanyId = String(companyId || request.company_id || payload.company_id || "").trim();

  if (!finalCompanyId) {
    throw new Error("No company_id found for this approval request.");
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new Error("Invalid approval amount.");
  }

  const marker = getApprovalRequestMarker(request.id);

  const { data: existingMovement, error: existingError } = await supabase
    .from("finance_cash_movements")
    .select("id")
    .eq("approval_request_id", request.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingMovement?.id) {
    throw new Error("This approval already has a linked cash movement.");
  }

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
      origin_type: payload.origin_type || "approval_request",
      origin_id: payload.origin_id || request.id,
      created_by_module: payload.created_by_module || "Approval Center",
      source_action: payload.source_action || `APPROVE_${normalizeWorkflowKey(request.request_type)}`,
      created_by_user_id: currentSystemUserId || currentEmployeeId || null,
      created_by_user_name: currentEmployeeName || "Approval Center",
      cash_drawer_id: payload.cash_drawer_id || null,
      liquidation_status:
        payload.liquidation_status ||
        (payload.should_create_expense ? "FOR_LIQUIDATION" : "NOT_REQUIRED"),
      net_expense_amount: payload.should_create_expense ? amountValue : 0,
    })
    .select()
    .single();

  if (movementError) {
    throw new Error(movementError.message);
  }

  const { data: linkedMovementData, error: linkMovementError } = await supabase
    .from("finance_cash_movements")
    .update({
      approval_request_id: request.id,
    })
    .eq("id", movementData.id)
    .select("id, approval_request_id")
    .single();

  if (linkMovementError) {
    throw new Error(`Cash movement posted but approval link failed: ${linkMovementError.message}`);
  }

  if (String(linkedMovementData?.approval_request_id || "") !== String(request.id)) {
    throw new Error("Cash movement posted but approval_request_id was not saved. Approval stopped for audit safety.");
  }

  let createdExpenseData: any = null;
  let createdBalanceData: any = null;

  if (payload.should_create_expense) {
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: finalCompanyId,
        expense_date: payload.business_date,
        category: payload.is_cash_advance_cash_out ? "Cash Advance" : payload.expense_category,
        subcategory: payload.is_cash_advance_cash_out
          ? "Cash Advance Release"
          : payload.expense_subcategory || null,
        department: payload.is_cash_advance_cash_out ? "Payroll" : payload.expense_department,
        description: payload.is_cash_advance_cash_out
          ? `Cash Advance - ${payload.cash_advance_employee_name || ""}`
          : payload.expense_description,
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

    const { data: linkedMovement, error: linkedMovementError } = await supabase
  .from("finance_cash_movements")
  .update({
    reference_id: expenseData.id,
    approval_request_id: request.id,
  })
  .eq("id", movementData.id)
  .select("id, reference_id, approval_request_id")
  .single();

if (linkedMovementError) {
  throw new Error(
    `Expense created but movement link failed: ${linkedMovementError.message}`
  );
}

if (String(linkedMovement?.reference_id || "") !== String(expenseData.id)) {
  throw new Error(
    "Expense created but reference_id was not saved to finance_cash_movements."
  );
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

      if (!balanceError) {
        createdBalanceData = balanceData;
        await supabase
          .from("expenses")
          .update({ employee_balance_id: balanceData.id })
          .eq("id", expenseData.id);
      }
    }
  }

  await createAuditLog({
    userName: currentEmployeeName || "OPSCORE USER",
    module: "Approval Center",
    action: "Execute Cash Approval Action",
    description: `${request.request_type} posted with linked approval_request_id.`,
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
  };
}

