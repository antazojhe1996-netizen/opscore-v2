import { supabaseClient as supabase } from "@/lib/supabase-client";

/**
 * =========================
 * CASH REALTIME V3
 * =========================
 * Client-side realtime listener only.
 *
 * Rules:
 * - Read/listen only
 * - No inserts
 * - No updates
 * - No business logic
 * - Compatible with legacy + V3 drawer fields
 */

type CashRealtimeSource = "MOVEMENT" | "APPROVAL";

type CashRealtimeEvent = {
  source: CashRealtimeSource;
  event_type?: "INSERT" | "UPDATE" | "DELETE" | "*";
  drawer_id?: string | null;
  row?: any;
};

const getDrawerId = (row: any) =>
  row?.cash_cash_drawer_id || row?.cash_drawer_id || null;

export function subscribeCashUpdates(
  company_id: string,
  drawer_id: string | null,
  callback: (event: CashRealtimeEvent) => void,
) {
  if (!company_id) {
    console.warn("[CASH REALTIME] Missing company_id");
    return () => {};
  }

  const channel = supabase.channel(`cash-live-sync-${company_id}-${drawer_id || "all"}`);

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "finance_cash_movements",
      filter: `company_id=eq.${company_id}`,
    },
    (payload: any) => {
      const row = payload?.new || payload?.old || null;
      const rowDrawerId = getDrawerId(row);

      if (!drawer_id || rowDrawerId === drawer_id) {
        callback({
          source: "MOVEMENT",
          event_type: payload?.eventType || "*",
          drawer_id: rowDrawerId,
          row,
        });
      }
    },
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "approval_requests",
      filter: `company_id=eq.${company_id}`,
    },
    (payload: any) => {
      callback({
        source: "APPROVAL",
        event_type: payload?.eventType || "*",
        row: payload?.new || payload?.old || null,
      });
    },
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}