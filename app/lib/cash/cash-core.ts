import { cashIn, cashOut } from "@/lib/cash/cash-engine";
import { logCashEvent } from "@/lib/cash/cash-audit";

/**
 * =========================
 * CASH CORE V3
 * =========================
 * Compatibility + normalization layer.
 *
 * Responsibilities:
 * - Accept legacy payload
 * - Accept V3 payload
 * - Normalize payload before engine call
 * - Standardize response contract
 * - Safe audit only
 *
 * This file does NOT directly insert to Supabase.
 */

export type CashMovementType = "CASH_IN" | "CASH_OUT";

export type CashPaymentMethod = "CASH" | "GCASH" | "BANK" | "CARD" | "TERMINAL";

export type CashPayload = {
  company_id: string;

  cash_drawer_id?: string | null;
  cash_cash_drawer_id?: string | null;
  drawer_id?: string | null;

  amount: number;

  category?: string | null;
  source?: string | null;

  payment_method?: CashPaymentMethod | string | null;
  payment_type?: string | null;

  reference_no?: string | null;
  source_document_id?: string | null;

  created_by?: string | null;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;

  remarks?: string | null;
  description?: string | null;

  business_date?: string | null;
  movement_type?: string | null;
  type?: CashMovementType | string | null;

  [key: string]: any;
};

export type NormalizedCashPayload = CashPayload & {
  company_id: string;
  cash_drawer_id: string | null;
  cash_cash_drawer_id: string | null;
  amount: number;
  category: string | null;
  source: string | null;
  payment_method: string;
  payment_type: string;
  reference_no: string | null;
  movement_type: "Cash In" | "Cash Out";
  type: CashMovementType;
  business_date: string;
};

export type CashCoreResult =
  | {
      success: true;
      data: any;
      normalized: NormalizedCashPayload;
    }
  | {
      success: false;
      error: string;
      normalized?: NormalizedCashPayload;
    };

const normalizeType = (value: any): CashMovementType => {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (key === "CASH_IN" || key === "IN" || key === "CASHIN") {
    return "CASH_IN";
  }

  if (key === "CASH_OUT" || key === "OUT" || key === "CASHOUT") {
    return "CASH_OUT";
  }

  return "CASH_IN";
};

const movementTypeLabel = (type: CashMovementType) =>
  type === "CASH_IN" ? "Cash In" : "Cash Out";

const normalizePayment = (value: any) => {
  const text = String(value || "Cash").trim();

  const upper = text.toUpperCase();

  if (upper === "CASH") return "Cash";
  if (upper === "GCASH") return "GCash";
  if (upper === "BANK") return "Bank";
  if (upper === "CARD") return "Card";
  if (upper === "TERMINAL") return "Terminal";

  return text || "Cash";
};

const normalizeSource = (payload: CashPayload) =>
  String(payload.source || payload.category || "Cash Movement").trim();

const normalizeBusinessDate = (payload: CashPayload) =>
  String(
    payload.business_date ||
      payload.date ||
      new Date().toISOString().slice(0, 10),
  ).slice(0, 10);

export function normalizeCashPayload(
  payload: CashPayload,
  fallbackType?: CashMovementType | string,
): NormalizedCashPayload {
  const type = normalizeType(payload.type || fallbackType);
  const drawerId =
    payload.cash_cash_drawer_id ||
    payload.cash_drawer_id ||
    payload.drawer_id ||
    null;

  const amount = Number(payload.amount || 0);
  const payment = normalizePayment(payload.payment_type || payload.payment_method);
  const source = normalizeSource(payload);

  return {
    ...payload,

    company_id: payload.company_id,
    cash_drawer_id: drawerId,
    cash_cash_drawer_id: drawerId,

    amount,

    category: source,
    source,

    payment_method: payment,
    payment_type: payment,

    reference_no:
      payload.reference_no ||
      payload.source_document_id ||
      payload.origin_id ||
      null,

    movement_type: movementTypeLabel(type),
    type,

    business_date: normalizeBusinessDate(payload),
  };
}

function validateNormalizedPayload(payload: NormalizedCashPayload) {
  if (!payload.company_id) {
    return "Missing company_id";
  }

  if (!payload.cash_drawer_id && !payload.cash_cash_drawer_id) {
    return "Missing cash drawer id";
  }

  if (!payload.amount || payload.amount <= 0) {
    return "Invalid amount";
  }

  return null;
}

/**
 * =========================
 * SAFE AUDIT WRAPPER
 * =========================
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
 * INSERT CASH MOVEMENT
 * =========================
 */
export async function insertCashMovement(
  payload: CashPayload,
  type: CashMovementType = "CASH_IN",
): Promise<CashCoreResult> {
  const normalized = normalizeCashPayload(payload, type);
  const validationError = validateNormalizedPayload(normalized);

  if (validationError) {
    return {
      success: false,
      error: validationError,
      normalized,
    };
  }

  try {
    const movement =
      normalized.type === "CASH_IN"
        ? await cashIn(normalized)
        : await cashOut(normalized);

    await safeAudit({
      company_id: normalized.company_id,
      action: normalized.type,
      amount: normalized.amount,
      cash_drawer_id: normalized.cash_drawer_id,
      reference_no: movement?.id || normalized.reference_no || null,
      user_id:
        normalized.created_by ||
        normalized.created_by_user_id ||
        normalized.created_by_user_name ||
        null,
      metadata: {
        source: normalized.source,
        payment_type: normalized.payment_type,
        movement_type: normalized.movement_type,
        origin_id: normalized.origin_id || null,
        origin_type: normalized.origin_type || null,
      },
    });

    return {
      success: true,
      data: movement,
      normalized,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Cash movement failed",
      normalized,
    };
  }
}

/**
 * =========================
 * BACKWARD COMPATIBILITY
 * =========================
 */

export async function cashInEntry(payload: CashPayload) {
  return insertCashMovement(payload, "CASH_IN");
}

export async function cashOutEntry(payload: CashPayload) {
  return insertCashMovement(payload, "CASH_OUT");
}