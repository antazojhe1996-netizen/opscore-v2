import { supabase } from "@/app/lib/supabase";

export const buildMovementOriginId = () => crypto.randomUUID();

export const normalizeCashMovementPayload = (payload: any) => ({
  company_id: payload.company_id || null,
  business_date: payload.business_date,
  movement_type: payload.movement_type,
  source: payload.source,
  payment_type: payload.payment_type || "Cash",
  amount: Number(payload.amount || 0),
  from_person: payload.from_person || "",
  to_person: payload.to_person || "",
  encoded_by: payload.encoded_by || "",
  remarks: payload.remarks || "",
  status: payload.status || "ACTIVE",
  reference_type: payload.reference_type || null,
  reference_id: payload.reference_id || null,
  origin_type: payload.origin_type || "manual_cash_movement",
  origin_id: payload.origin_id || buildMovementOriginId(),
  created_by_module: payload.created_by_module || "Cash Management",
  source_action: payload.source_action || "CREATE_CASH_MOVEMENT",
  created_by_user_id: payload.created_by_user_id || null,
  created_by_user_name: payload.created_by_user_name || payload.encoded_by || "",
  cash_drawer_id: payload.cash_drawer_id || null,
  liquidation_status: payload.liquidation_status || "NOT_REQUIRED",
  actual_spent_amount: Number(payload.actual_spent_amount || 0),
  returned_cash_amount: Number(payload.returned_cash_amount || 0),
  net_expense_amount: Number(payload.net_expense_amount || 0),
  affects_cash_flow:
    payload.affects_cash_flow === false ? false : true,
});

export const checkDuplicateCashMovement = async (payload: any) => {
  const normalized = normalizeCashMovementPayload(payload);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const baseRemarks = String(normalized.remarks || "").trim();

  let query = supabase
    .from("finance_cash_movements")
    .select("id, created_at")
    .eq("status", "ACTIVE")
    .eq("business_date", normalized.business_date)
    .eq("movement_type", normalized.movement_type)
    .eq("source", normalized.source)
    .eq("payment_type", normalized.payment_type)
    .eq("amount", normalized.amount)
    .gte("created_at", tenMinutesAgo)
    .limit(1);

  if (normalized.cash_drawer_id) {
    query = query.eq("cash_drawer_id", normalized.cash_drawer_id);
  } else {
    query = query.is("cash_drawer_id", null);
  }

  if (baseRemarks) {
    query = query.ilike("remarks", `%${baseRemarks}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.log("DUPLICATE CASH MOVEMENT CHECK ERROR:", error.message);
    return false;
  }

  return Boolean(data?.length);
};

export const createCashMovement = async (payload: any) => {
  const normalized = normalizeCashMovementPayload(payload);

  if (!normalized.business_date) {
    throw new Error("Cash movement blocked. Missing business_date.");
  }

  if (!normalized.movement_type) {
    throw new Error("Cash movement blocked. Missing movement_type.");
  }

  if (!normalized.source) {
    throw new Error("Cash movement blocked. Missing source.");
  }

  if (!Number.isFinite(normalized.amount) || normalized.amount <= 0) {
    throw new Error("Cash movement blocked. Invalid amount.");
  }

  if (!normalized.origin_type) {
    throw new Error("Cash movement blocked. Missing origin_type.");
  }

  if (!normalized.origin_id) {
    throw new Error("Cash movement blocked. Missing origin_id.");
  }

  const isDuplicate = await checkDuplicateCashMovement(normalized);

  if (isDuplicate) {
    throw new Error("Possible duplicate cash movement detected. Posting was blocked.");
  }

  const { data, error } = await supabase
    .from("finance_cash_movements")
    .insert(normalized)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create cash movement. ${error.message}`);
  }

  return data;
};

export const updateCashMovement = async (movementId: string, updates: any) => {
  if (!movementId) throw new Error("Missing cash movement ID.");

  const { data, error } = await supabase
    .from("finance_cash_movements")
    .update(updates)
    .eq("id", movementId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update cash movement. ${error.message}`);
  }

  return data;
};

export const voidCashMovement = async ({
  movementId,
  reason,
  voidedBy,
}: {
  movementId: string;
  reason: string;
  voidedBy: string;
}) => {
  const finalReason = String(reason || "").trim();

  if (!movementId) throw new Error("Missing cash movement ID.");
  if (!finalReason) throw new Error("Void reason is required.");

  const { data, error } = await supabase
    .from("finance_cash_movements")
    .update({
      status: "VOIDED",
      void_reason: finalReason,
      voided_at: new Date().toISOString(),
      voided_by: voidedBy || "OPSCORE USER",
    })
    .eq("id", movementId)
    .eq("status", "ACTIVE")
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to void cash movement. ${error.message}`);
  }

  return data;
};