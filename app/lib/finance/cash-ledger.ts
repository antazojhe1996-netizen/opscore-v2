// lib/finance/cash-ledger.ts

import { supabase } from "../supabase";

/**
 * =========================
 * TYPES
 * =========================
 */

export type CashMovementType = "CASH_IN" | "CASH_OUT";

export interface CashMovement {
  id: string;
  amount: number;
  type: CashMovementType;
  created_at: string;
}

/**
 * =========================
 * GET DAILY LEDGER
 * =========================
 * This is your SINGLE SOURCE OF TRUTH
 */
export async function getDailyCashLedger(company_id: string, business_date: string) {
  // 1. get daily cash record
  const { data: daily, error: dailyErr } = await supabase
    .from("finance_cash_management")
    .select("*")
    .eq("company_id", company_id)
    .eq("business_date", business_date)
    .single();

  if (dailyErr && dailyErr.code !== "PGRST116") {
    throw dailyErr;
  }

  // 2. get movements for that day
  const { data: movements, error: movErr } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .gte("created_at", `${business_date} 00:00:00`)
    .lte("created_at", `${business_date} 23:59:59`);

  if (movErr) throw movErr;

  const safeMovements: CashMovement[] = movements || [];

  // 3. compute totals
  const cashIn = safeMovements
    .filter(m => m.type === "CASH_IN")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const cashOut = safeMovements
    .filter(m => m.type === "CASH_OUT")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const net = cashIn - cashOut;

  // 4. expected cash logic
  const opening = Number(daily?.opening_float || 0);
  const expected_cash = opening + net;

  return {
    business_date,
    opening_float: opening,
    cash_in: cashIn,
    cash_out: cashOut,
    net,
    expected_cash,
    actual_cash: daily?.actual_cash ?? null,
    variance: daily?.actual_cash != null
      ? Number(daily.actual_cash) - expected_cash
      : null,
    movements: safeMovements,
    raw: daily,
  };
}

/**
 * =========================
 * UPSERT DAILY RECORD
 * =========================
 * ensures 1 row per day per company
 */
export async function upsertDailyCashRecord({
  company_id,
  business_date,
  opening_float = 0,
}: {
  company_id: string;
  business_date: string;
  opening_float?: number;
}) {
  const { data, error } = await supabase
    .from("finance_cash_management")
    .upsert({
      company_id,
      business_date,
      opening_float,
    }, {
      onConflict: "company_id,business_date"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =========================
 * FINALIZE DAY (RECONCILIATION)
 * =========================
 */
export async function finalizeCashDay({
  company_id,
  business_date,
  actual_cash,
}: {
  company_id: string;
  business_date: string;
  actual_cash: number;
}) {
  const ledger = await getDailyCashLedger(company_id, business_date);

  const variance = Number(actual_cash) - Number(ledger.expected_cash);

  const { data, error } = await supabase
    .from("finance_cash_management")
    .update({
      actual_cash: Number(actual_cash),
      expected_cash: ledger.expected_cash,
      variance,
    })
    .eq("company_id", company_id)
    .eq("business_date", business_date)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =========================
 * SUMMARY (FOR UI / WATCHER)
 * =========================
 */
export async function getCashSummary(company_id: string, date_from: string, date_to: string) {
  const { data, error } = await supabase
    .from("finance_cash_management")
    .select("*")
    .eq("company_id", company_id)
    .gte("business_date", date_from)
    .lte("business_date", date_to)
    .order("business_date", { ascending: false });

  if (error) throw error;

  return (data || []).map(d => ({
    business_date: d.business_date,
    opening_float: d.opening_float,
    actual_cash: d.actual_cash,
    expected_cash: d.expected_cash,
    variance: d.variance,
  }));
}