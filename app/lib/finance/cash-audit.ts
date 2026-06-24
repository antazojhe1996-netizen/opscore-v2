import { supabase } from "../supabase";

/**
 * =========================
 * CASH AUDIT LOGGING
 * =========================
 */

export async function logCashEvent({
  company_id,
  action,
  amount,
  cash_drawer_id,
  reference_no,
  user_id,
  metadata = {},
}: any) {
  const { data, error } = await supabase
    .from("finance_cash_audit_logs")
    .insert({
      company_id,
      action,
      amount,
      cash_drawer_id,
      reference_no,
      user_id,
      metadata,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
  return data;
}