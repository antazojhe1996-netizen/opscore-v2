import { supabase } from "../supabase";

/**
 * =========================
 * TYPES
 * =========================
 */

export type CashMovementType = "CASH_IN" | "CASH_OUT";

export interface CashMovementPayload {
  company_id: string;
  cash_drawer_id: string;
  amount: number;
  type: CashMovementType;
  category?: string;
  reference_no?: string;
  payment_method?: "CASH" | "GCASH" | "BANK" | "CARD";
  created_by?: string;
}

/**
 * =========================
 * VALIDATION
 * =========================
 */

function validate(payload: CashMovementPayload) {
  if (!payload.company_id) throw new Error("NO_COMPANY");
  if (!payload.cash_drawer_id) throw new Error("NO_DRAWER");
  if (!payload.amount || payload.amount <= 0) throw new Error("INVALID_AMOUNT");
}

/**
 * =========================
 * MAIN WRITER (ONLY ENTRY POINT)
 * =========================
 */

export async function addMovement(payload: CashMovementPayload) {
  validate(payload);

  const { data, error } = await supabase
    .from("finance_cash_movements")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // sync state AFTER insert
  await syncCashDrawerState({
    company_id: payload.company_id,
    cash_drawer_id: payload.cash_drawer_id,
  });

  return data;
}

/**
 * =========================
 * CASH IN / OUT WRAPPERS
 * =========================
 */

export async function cashIn(payload: Omit<CashMovementPayload, "type">) {
  return addMovement({ ...payload, type: "CASH_IN" });
}

export async function cashOut(payload: Omit<CashMovementPayload, "type">) {
  return addMovement({ ...payload, type: "CASH_OUT" });
}

/**
 * =========================
 * LEDGER
 * =========================
 */

export async function getDailyLedger(company_id: string, business_date: string) {
  const { data } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .gte("created_at", `${business_date} 00:00:00`)
    .lte("created_at", `${business_date} 23:59:59`);

  const movements = data || [];

  const cashIn = movements
    .filter(m => m.type === "CASH_IN")
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const cashOut = movements
    .filter(m => m.type === "CASH_OUT")
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  return {
    cash_in: cashIn,
    cash_out: cashOut,
    net: cashIn - cashOut,
  };
}

/**
 * =========================
 * STATE SYNC (FINAL SOURCE OF TRUTH)
 * =========================
 */

async function syncCashDrawerState({
  company_id,
  cash_drawer_id,
}: {
  company_id: string;
  cash_drawer_id: string;
}) {
  const { data } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .eq("cash_drawer_id", cash_drawer_id);

  const movements = data || [];

  const cashIn = movements
    .filter(m => m.type === "CASH_IN")
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const cashOut = movements
    .filter(m => m.type === "CASH_OUT")
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const expected_cash = cashIn - cashOut;

  await supabase.from("finance_cash_drawer_state").upsert({
    company_id,
    cash_drawer_id,
    expected_cash,
    actual_cash: expected_cash,
    status: "SYNCED",
    updated_at: new Date().toISOString(),
  });
}