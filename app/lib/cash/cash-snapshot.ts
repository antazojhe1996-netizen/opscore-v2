import { supabaseServer as supabase } from "@/lib/supabase-server";

/**
 * =========================
 * CASH SNAPSHOT V3
 * =========================
 * Drawer UI read model only.
 *
 * Rules:
 * - Read-only
 * - No inserts
 * - No updates
 * - No source-of-truth ownership
 * - Compatible with legacy + V3 movement fields
 */

type NormalizedMovement = any & {
  amount: number;
  normalized_type: "CASH_IN" | "CASH_OUT";
  normalized_movement_type: "Cash In" | "Cash Out";
  normalized_drawer_id: string | null;
  normalized_payment_type: string;
  normalized_source: string;
};

const normalizeType = (movement: any): "CASH_IN" | "CASH_OUT" => {
  const raw = String(movement.type || movement.movement_type || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (raw === "CASH_OUT" || raw === "CASHOUT" || raw === "OUT") {
    return "CASH_OUT";
  }

  if (raw === "CASH_IN" || raw === "CASHIN" || raw === "IN") {
    return "CASH_IN";
  }

  return "CASH_IN";
};

const movementLabel = (type: "CASH_IN" | "CASH_OUT") =>
  type === "CASH_IN" ? "Cash In" : "Cash Out";

const normalizePayment = (movement: any) =>
  String(movement.payment_type || movement.payment_method || "Cash").trim();

const normalizeSource = (movement: any) =>
  String(movement.source || movement.category || "Cash Movement").trim();

const normalizeDrawerId = (movement: any) =>
  movement.cash_cash_drawer_id || movement.cash_drawer_id || null;

const normalizeMovement = (movement: any): NormalizedMovement => {
  const type = normalizeType(movement);

  return {
    ...movement,
    amount: Number(movement.amount || 0),
    normalized_type: type,
    normalized_movement_type: movementLabel(type),
    normalized_drawer_id: normalizeDrawerId(movement),
    normalized_payment_type: normalizePayment(movement),
    normalized_source: normalizeSource(movement),
  };
};

export async function getCashSnapshot(
  company_id: string,
  cash_drawer_id: string,
) {
  if (!company_id || !cash_drawer_id) {
    throw new Error("Missing parameters");
  }

  const { data: movements, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", company_id)
    .or(`cash_cash_drawer_id.eq.${cash_drawer_id},cash_drawer_id.eq.${cash_drawer_id}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const normalized = (movements || []).map(normalizeMovement);

  const cashIn = normalized
    .filter((movement) => movement.normalized_type === "CASH_IN")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const cashOut = normalized
    .filter((movement) => movement.normalized_type === "CASH_OUT")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const net = cashIn - cashOut;

  return {
    cash_in: cashIn,
    cash_out: cashOut,
    net,
    movements: normalized,

    meta: {
      company_id,
      cash_drawer_id,
      total_records: normalized.length,
      generated_at: new Date().toISOString(),
    },
  };
}