import { supabase } from "../supabase";

/**
 * =========================
 * CASH WATCHER (SINGLE SOURCE OF TRUTH)
 * =========================
 * RULE:
 * - NO UI CALCULATION
 * - NO DUPLICATE SUMS
 * - ONLY DB AGGREGATION
 */

export async function getCashWatcher(company_id: string, business_date: string) {
  const { data: movements, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .gte("created_at", `${business_date} 00:00:00`)
    .lte("created_at", `${business_date} 23:59:59`);

  if (error) throw error;

  const safe = movements || [];

  // 🧠 GROUP BY TYPE (STRICT SINGLE SOURCE CALC)
  const cashIn = safe
    .filter(m => m.type === "CASH_IN")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const cashOut = safe
    .filter(m => m.type === "CASH_OUT")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const net = cashIn - cashOut;

  // 🧠 REMOVE DUPLICATE VISUAL ENTRIES (SAFE DEDUPE)
  const uniqueMap = new Map();

  const deduped = safe.filter(m => {
    const key = `${m.cash_drawer_id}-${m.type}-${m.amount}-${m.created_at}`;
    if (uniqueMap.has(key)) return false;
    uniqueMap.set(key, true);
    return true;
  });

  return {
    cash_in: cashIn,
    cash_out: cashOut,
    net,
    movements: deduped,
    count: deduped.length,
  };
}