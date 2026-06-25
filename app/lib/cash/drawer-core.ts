import { supabase } from '@/lib/supabase';
import { computeDrawerVariance } from "./variance-engine";



/**
 * =========================
 * OPEN DRAWER
 * =========================
 */

export async function openCashDrawer(payload: any) {
  const { company_id, holder_name, opening_float } = payload;

  if (!company_id || !holder_name) {
    return {
      success: false,
      error: "Missing company_id or holder_name",
    };
  }

  const existingResult = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("company_id", company_id)
    .eq("status", "OPEN")
    .maybeSingle();

  if (existingResult.data) {
    return {
      success: false,
      error: "Open drawer already exists",
    };
  }

  const insertResult = await supabase
    .from("cash_drawers")
    .insert({
      company_id,
      holder_name,
      opening_float: Number(opening_float || 0),
      actual_cash: Number(opening_float || 0),
      status: "OPEN",
      opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertResult.error) {
    return {
      success: false,
      error: insertResult.error.message,
    };
  }

  return {
    success: true,
    data: insertResult.data,
  };
}

/**
 * =========================
 * CLOSE DRAWER
 * =========================
 */

export async function closeCashDrawer(payload: any) {
  const { drawer_id, actual_cash } = payload;

  if (!drawer_id) {
    return { success: false, error: "Missing drawer_id" };
  }

  const drawerResult = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("id", drawer_id)
    .single();

  if (drawerResult.error || !drawerResult.data) {
    return {
      success: false,
      error: "Drawer not found",
    };
  }

  const drawer = drawerResult.data;

  if (drawer.status !== "OPEN") {
    return {
      success: false,
      error: "Drawer already closed",
    };
  }

  const movementsResult = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("cash_cash_drawer_id", drawer_id)
    .eq("company_id", drawer.company_id);

  const movements = movementsResult.data || [];

  const variance = computeDrawerVariance({
    opening_float: drawer.opening_float,
    movements,
    actual_cash: Number(actual_cash || 0),
  });

  const updateResult = await supabase
    .from("cash_drawers")
    .update({
      actual_cash: Number(actual_cash || 0),
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      expected_cash: variance.expected_cash,
      variance: variance.variance,
      variance_status: variance.status,
    })
    .eq("id", drawer_id)
    .select()
    .single();

  if (updateResult.error) {
    return {
      success: false,
      error: updateResult.error.message,
    };
  }

  return {
    success: true,
    data: updateResult.data,
    intelligence: variance,
  };
}

/**
 * =========================
 * GET OPEN DRAWERS
 * =========================
 */

export async function getOpenCashDrawers(companyId: string) {
  const result = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false });

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
      data: [],
    };
  }

  return {
    success: true,
    data: result.data || [],
  };
}



