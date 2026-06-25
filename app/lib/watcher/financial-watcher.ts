import { supabaseServer } from "@/lib/supabase-server";;

/**
 * =========================
 * CASH WATCHER (SINGLE SOURCE OF TRUTH)
 * =========================
 * RULE:
 * - NO UI LOGIC
 * - NO DEDUPE HERE
 * - STRICT DB AGGREGATION ONLY
 */

export async function getCashWatcher(
  company_id: string,
  business_date: string
) {
  const { data: movements, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .gte("created_at", `${business_date} 00:00:00`)
    .lte("created_at", `${business_date} 23:59:59`);

  if (error) throw error;

  const safe = movements || [];

  // =========================
  // SAFE NORMALIZATION
  // =========================
  const normalized = safe.map((m) => ({
    ...m,
    amount: Number(m.amount || 0),
  }));

  // =========================
  // STRICT CASH FLOW CALCULATION
  // =========================
  const cashIn = normalized
    .filter((m) => m.movement_type === "CASH_IN")
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = normalized
    .filter((m) => m.movement_type === "CASH_OUT")
    .reduce((sum, m) => sum + m.amount, 0);

  const net = cashIn - cashOut;

  return {
    cash_in: cashIn,
    cash_out: cashOut,
    net,
    movements: normalized,
    count: normalized.length,
  };
}




