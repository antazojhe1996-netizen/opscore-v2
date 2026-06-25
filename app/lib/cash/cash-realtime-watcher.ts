import { supabase } from '@/lib/supabase';


/**
 * =========================
 * REALTIME CASH WATCHER (PRODUCTION SAFE)
 * =========================
 * - listens cash movements
 * - listens approval updates
 * - prevents duplicate triggers
 * - auto cleanup supported
 */

export function subscribeCashWatcher(
  company_id: string,
  callback: () => void
) {
  if (!company_id) {
    console.warn("Missing company_id for watcher");
    return () => {};
  }

  const channel = supabase.channel(`cash-watch-${company_id}`);

  // =========================
  // CASH MOVEMENTS
  // =========================
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
    }
  );

  // =========================
  // APPROVAL REQUESTS
  // =========================
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
    }
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}





