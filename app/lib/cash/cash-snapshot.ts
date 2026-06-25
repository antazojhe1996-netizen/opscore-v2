import { supabase } from '@/lib/supabase';
import { supabaseServer } from "@/lib/supabase-server";

/**
 * =========================
 * CASH SNAPSHOT (DRAWER UI ONLY)
 * =========================
 * PURPOSE:
 * - UI display only
 * - NOT source of truth
 * - no business logic ownership
 */

export async function getCashSnapshot(
  company_id: string,
  cash_drawer_id: string
) {
  if (!company_id || !cash_drawer_id) {
    throw new Error("Missing parameters");
  }

  const { data: movements, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .eq("cash_drawer_id", cash_drawer_id);

  if (error) throw error;

  const safe = movements ?? [];

  /**
   * =========================
   * NORMALIZE
   * =========================
   */
  const normalized = safe.map((m) => ({
    ...m,
    amount: Number(m.amount || 0),
  }));

  /**
   * =========================
   * COMPUTE
   * =========================
   */
  const cashIn = normalized
    .filter((m) => m.type === "CASH_IN")
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = normalized
    .filter((m) => m.type === "CASH_OUT")
    .reduce((sum, m) => sum + m.amount, 0);

  const net = cashIn - cashOut;

  /**
   * =========================
   * RETURN UI SNAPSHOT ONLY
   * =========================
   */
  return {
    cash_in: cashIn,
    cash_out: cashOut,
    net,
    movements: normalized,

    meta: {
      total_records: normalized.length,
    },
  };
}




