import { supabase } from "@/app/lib/supabase";

export const buildMovementOriginId = () => crypto.randomUUID();

export const checkDuplicateCashMovement = async (payload: any) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const baseRemarks = String(payload.remarks || "").trim();

  let query = supabase
    .from("finance_cash_movements")
    .select("id, created_at")
    .eq("status", "ACTIVE")
    .eq("business_date", payload.business_date)
    .eq("movement_type", payload.movement_type)
    .eq("source", payload.source)
    .eq("payment_type", payload.payment_type || "Cash")
    .eq("amount", payload.amount)
    .gte("created_at", tenMinutesAgo)
    .limit(1);

  if (payload.cash_drawer_id) query = query.eq("cash_drawer_id", payload.cash_drawer_id);
  if (baseRemarks) query = query.ilike("remarks", baseRemarks);

  const { data, error } = await query;

  if (error) {
    console.log("DUPLICATE CASH MOVEMENT CHECK ERROR:", error.message);
    return false;
  }

  return Boolean(data?.length);
};