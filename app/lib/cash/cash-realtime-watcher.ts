import { supabaseClient as supabase } from "@/lib/supabase-client";

/**
 * =========================
 * CASH REALTIME WATCHER V3
 * =========================
 * Client-side watcher listener only.
 *
 * Rules:
 * - Read/listen only
 * - No inserts
 * - No updates
 * - No business logic
 * - Company-wide refresh trigger for Watcher UI
 */

export function subscribeCashWatcher(
  company_id: string,
  callback: () => void,
) {
  if (!company_id) {
    console.warn("[CASH WATCHER] Missing company_id");
    return () => {};
  }

  const channel = supabase.channel(`cash-watch-${company_id}`);

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "finance_cash_movements",
      filter: `company_id=eq.${company_id}`,
    },
    () => {
      callback();
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
    () => {
      callback();
    },
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}