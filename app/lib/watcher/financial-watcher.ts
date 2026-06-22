import { supabase } from "@/app/lib/supabase";

export async function getFinancialWatcher() {
  const { data, error } = await supabase
    .from("watcher_findings")
    .select("*")
    .eq("watcher_type", "FINANCIAL")
    .eq("status", "OPEN")
    .order("severity", { ascending: false })
    .order("financial_impact", { ascending: false });

  if (error) {
    console.error("[WATCHER]", error);
    return [];
  }

  return data ?? [];
}