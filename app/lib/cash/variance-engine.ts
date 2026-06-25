import { supabase } from '@/lib/supabase';
/**
 * PURE CASH VARIANCE ENGINE
 * No DB, no supabase, pure computation only
 */

export function computeDrawerVariance({
  opening_float,
  movements,
  actual_cash = 0,
}: any) {
  const opening = Number(opening_float || 0);
  const actual = Number(actual_cash || 0);

  const cashIn = (movements || [])
    .filter((m: any) => m.movement_type === "Cash In")
    .reduce((a: number, b: any) => a + Number(b.amount || 0), 0);

  const cashOut = (movements || [])
    .filter((m: any) => m.movement_type === "Cash Out")
    .reduce((a: number, b: any) => a + Number(b.amount || 0), 0);

  const expected_cash = opening + cashIn - cashOut;
  const variance = actual - expected_cash;

  let status: "OK" | "SHORT" | "OVER" = "OK";

  if (variance < 0) status = "SHORT";
  else if (variance > 0) status = "OVER";

  return {
    opening_float: opening,
    cash_in: cashIn,
    cash_out: cashOut,
    expected_cash,
    actual_cash: actual,
    variance,
    status,
  };
}


