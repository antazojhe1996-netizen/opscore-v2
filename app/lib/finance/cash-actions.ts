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

  source_document_id: payload.source_document_id || null,

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
});