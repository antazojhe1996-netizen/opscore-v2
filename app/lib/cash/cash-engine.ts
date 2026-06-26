import { supabaseServer as supabase } from "@/lib/supabase-server";
export async function cashIn(payload: any) {
  return insertMovement(payload, "CASH_IN");
}

export async function cashOut(payload: any) {
  return insertMovement(payload, "CASH_OUT");
}

async function insertMovement(payload: any, type: string) {
  const { data, error } = await supabase
    .from("finance_cash_movements")
    .insert({
      company_id: payload.company_id,
      cash_drawer_id: payload.cash_drawer_id,

      amount: Number(payload.amount || 0),
      category: payload.category || null,
      payment_method: payload.payment_method || "CASH",

      reference_no: payload.reference_no || null,
      created_by: payload.created_by || null,

      type,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
