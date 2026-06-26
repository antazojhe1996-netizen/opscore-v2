import { supabaseServer as supabase } from "@/lib/supabase-server";
/**
 * =========================
 * CASH LIVE SYNC (OPTIMIZED)
 * =========================
 */

export function subscribeCashUpdates(
  company_id: string,
  drawer_id: string | null,
  callback: (event: {
    source: "MOVEMENT" | "APPROVAL";
    drawer_id?: string;
  }) => void
) {
  const channel = supabase.channel("cash-live-sync");

  /**
   * CASH MOVEMENTS
   */
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "finance_cash_movements",
      filter: `company_id=eq.${company_id}`,
    },
    (payload) => {
      const row = (payload as any)?.new;

      if (!drawer_id || row?.cash_drawer_id === drawer_id) {
        callback({
          source: "MOVEMENT",
          drawer_id: row?.cash_drawer_id,
        });
      }
    }
  );

  /**
   * APPROVALS
   */
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "approval_requests",
      filter: `company_id=eq.${company_id}`,
    },
    (payload) => {
      callback({
        source: "APPROVAL",
      });
    }
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}





