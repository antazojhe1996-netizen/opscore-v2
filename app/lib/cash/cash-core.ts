import { cashIn, cashOut } from "@/lib/cash/cash-engine";
import { logCashEvent } from "@/lib/cash/cash-audit";

/**
 * =========================
 * CASH PAYLOAD TYPE
 * =========================
 */

export type CashPayload = {
  company_id: string;
  cash_drawer_id: string;
  amount: number;
  category?: string;
  payment_method?: "CASH" | "GCASH" | "BANK" | "CARD";
  reference_no?: string;
  created_by?: string;
};

/**
 * =========================
 * SAFE AUDIT WRAPPER
 * =========================
 * - Never blocks cash transaction
 * - Prevents audit crash from breaking system
 */

async function safeAudit(payload: any) {
  try {
    await logCashEvent(payload);
  } catch (err) {
    console.warn("[CASH AUDIT FAILED BUT IGNORED]", err);
  }
}

/**
 * =========================
 * CASH IN
 * =========================
 */

export async function insertCashMovement(
  payload: CashPayload,
  type: "CASH_IN" | "CASH_OUT"
) {
  if (type === "CASH_IN") {
    const result = await cashIn(payload);

    await safeAudit({
      company_id: payload.company_id,
      action: "CASH_IN",
      amount: payload.amount,
      cash_drawer_id: payload.cash_drawer_id,
      reference_no: result?.id || null,
      user_id: payload.created_by || null,
    });

    return result;
  }

  if (type === "CASH_OUT") {
    const result = await cashOut(payload);

    await safeAudit({
      company_id: payload.company_id,
      action: "CASH_OUT",
      amount: payload.amount,
      cash_drawer_id: payload.cash_drawer_id,
      reference_no: result?.id || null,
      user_id: payload.created_by || null,
    });

    return result;
  }

  throw new Error("Invalid cash movement type");
}

/**
 * =========================
 * BACKWARD COMPATIBILITY
 * =========================
 * (IMPORTANT: fixes old imports)
 */

export async function cashInEntry(payload: CashPayload) {
  return insertCashMovement(payload, "CASH_IN");
}

export async function cashOutEntry(payload: CashPayload) {
  return insertCashMovement(payload, "CASH_OUT");
}




