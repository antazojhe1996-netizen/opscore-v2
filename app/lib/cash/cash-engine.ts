import { supabaseServer as supabase } from "@/lib/supabase-server";

/**
 * =========================
 * CASH ENGINE V3
 * =========================
 * Source of truth for creating cash movements.
 *
 * Rules:
 * - This is the only cash module allowed to insert finance_cash_movements.
 * - Accepts normalized payload from cash-core.ts.
 * - Keeps legacy columns and V3 columns in sync during migration.
 */

type CashMovementType = "CASH_IN" | "CASH_OUT";

const normalizeType = (value: any): CashMovementType => {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

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

const getDrawerId = (payload: any) =>
  payload.cash_cash_drawer_id ||
  payload.cash_drawer_id ||
  payload.drawer_id ||
  null;

const getSource = (payload: any) =>
  String(payload.source || payload.category || "Cash Movement").trim();

const getBusinessDate = (payload: any) =>
  String(
    payload.business_date ||
      payload.date ||
      new Date().toISOString().slice(0, 10),
  ).slice(0, 10);

const getCreatedBy = (payload: any) =>
  payload.created_by ||
  payload.created_by_user_id ||
  payload.created_by_user_name ||
  null;

const getReferenceNo = (payload: any) =>
  payload.reference_no ||
  payload.source_document_id ||
  payload.origin_id ||
  null;

export async function cashIn(payload: any) {
  return insertMovement(payload, "CASH_IN");
}

export async function cashOut(payload: any) {
  return insertMovement(payload, "CASH_OUT");
}

async function insertMovement(payload: any, fallbackType: CashMovementType) {
  const type = normalizeType(payload.type || fallbackType);
  const drawerId = getDrawerId(payload);
  const amount = Number(payload.amount || 0);
  const source = getSource(payload);
  const payment = normalizePayment(payload.payment_type || payload.payment_method);
  const businessDate = getBusinessDate(payload);
  const referenceNo = getReferenceNo(payload);
  const createdBy = getCreatedBy(payload);

  if (!payload.company_id) {
    throw new Error("Missing company_id");
  }

  if (!drawerId) {
    throw new Error("Missing cash drawer id");
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const { data, error } = await supabase
    .from("finance_cash_movements")
    .insert({
      /**
       * V3 standard fields
       */
      company_id: payload.company_id,
      business_date: businessDate,
      movement_type: payload.movement_type || movementTypeLabel(type),
      source,
      payment_type: payment,

      amount,

      cash_cash_drawer_id: drawerId,

      from_person: payload.from_person || "",
      to_person: payload.to_person || "",
      encoded_by:
        payload.encoded_by ||
        payload.created_by_user_name ||
        payload.created_by ||
        "Cash Engine",

      remarks:
        payload.remarks ||
        payload.description ||
        payload.title ||
        "Cash movement",

      status: payload.status || "ACTIVE",

      source_document_id: payload.source_document_id || referenceNo,
      origin_type: payload.origin_type || "cash_movement",
      origin_id: payload.origin_id || referenceNo,

      created_by_module: payload.created_by_module || "Cash Engine",
      source_action: payload.source_action || type,

      created_by_user_id:
        payload.created_by_user_id || payload.created_by || null,
      created_by_user_name:
        payload.created_by_user_name || payload.created_by || null,

      /**
       * Legacy compatibility fields
       * Keep these while old pages/snapshots still read them.
       */
      cash_drawer_id: drawerId,
      category: source,
      payment_method: payment,
      reference_no: referenceNo,
      created_by: createdBy,
      type,

      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}