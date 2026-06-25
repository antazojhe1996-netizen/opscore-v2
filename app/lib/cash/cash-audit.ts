import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * =========================
 * CASH AUDIT LOG (FIXED EXPORT)
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
    })
    .select()
    .single();

  if (error) {
    console.warn("Cash audit failed:", error.message);
    return null;
  }

  return data;
}


