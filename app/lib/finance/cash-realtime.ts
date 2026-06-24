import { supabase } from "../supabase";

/**
 * REALTIME CASH MOVEMENTS ONLY
 * - simple
 * - stable
 * - no recursion
 */

export function subscribeCashRealtime(
  company_id: string,
  onChange: (payload: any) => void
) {
  const channel = supabase
    .channel("finance-cash-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "finance_cash_movements",
        filter: `company_id=eq.${company_id}`,
      },
      (payload) => {
        onChange(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * UNSUBSCRIBE
 */
export function unsubscribeCashRealtime(channel: any) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}