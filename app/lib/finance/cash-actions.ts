import { cashIn, cashOut } from "./cash-engine";
import type { CashMovementPayload } from "./cash-engine";

/**
 * =========================
 * CASH ACTIONS (UI LAYER ONLY)
 * =========================
 * RULE:
 * - NO TYPE FIELD HERE
 * - ENGINE determines CASH_IN / CASH_OUT
 * - UI ONLY SENDS DATA
 */

type CashActionPayload = Omit<CashMovementPayload, "type">;

/**
 * CASH IN
 */
export async function handleCashIn(payload: CashActionPayload) {
  return cashIn({
    ...payload
  });
}

/**
 * CASH OUT
 */
export async function handleCashOut(payload: CashActionPayload) {
  return cashOut({
    ...payload
  });
}