import { supabaseServer as supabase } from "@/lib/supabase-server";
import { computeDrawerVariance } from "./variance-engine";

/**
 * =========================
 * DRAWER CORE V3
 * =========================
 * Source of truth for cash drawer lifecycle.
 *
 * Responsibilities:
 * - Open drawer
 * - Close drawer
 * - Read open drawers
 * - Compute close variance using variance-engine
 *
 * This file owns cash_drawers lifecycle only.
 * It does NOT create finance_cash_movements.
 */

type DrawerCoreResult =
  | {
      success: true;
      data: any;
      intelligence?: any;
    }
  | {
      success: false;
      error: string;
      data?: any;
      intelligence?: any;
    };

const normalizeStatus = (value: any) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getDrawerId = (payload: any) =>
  payload.drawer_id ||
  payload.cash_drawer_id ||
  payload.cash_cash_drawer_id ||
  payload.id ||
  null;

const getOpeningFloat = (payload: any) => Number(payload.opening_float || 0);

const getActualCash = (payload: any) =>
  Number(payload.actual_cash ?? payload.closing_cash ?? payload.cash_count ?? 0);

const getHolderName = (payload: any) =>
  String(
    payload.holder_name ||
      payload.cashier_name ||
      payload.employee_name ||
      payload.opened_by ||
      "",
  ).trim();

async function getOpenDrawerByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "OPEN")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

async function getDrawerById(drawerId: string) {
  const { data, error } = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("id", drawerId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Drawer not found");
  }

  return data;
}

async function getDrawerMovements(drawer: any) {
  const { data, error } = await supabase
    .from("finance_cash_movements")
    .select("*")
    .eq("company_id", drawer.company_id)
    .or(`cash_cash_drawer_id.eq.${drawer.id},cash_drawer_id.eq.${drawer.id}`);

  if (error) throw new Error(error.message);

  return data || [];
}

/**
 * =========================
 * OPEN DRAWER
 * =========================
 */
export async function openCashDrawer(payload: any): Promise<DrawerCoreResult> {
  try {
    const companyId = payload.company_id;
    const holderName = getHolderName(payload);
    const openingFloat = getOpeningFloat(payload);

    if (!companyId || !holderName) {
      return {
        success: false,
        error: "Missing company_id or holder_name",
      };
    }

    const existing = await getOpenDrawerByCompany(companyId);

    if (existing) {
      return {
        success: false,
        error: "Open drawer already exists",
        data: existing,
      };
    }

    const { data, error } = await supabase
      .from("cash_drawers")
      .insert({
        company_id: companyId,
        holder_name: holderName,
        opening_float: openingFloat,
        actual_cash: openingFloat,
        expected_cash: openingFloat,
        variance: 0,
        variance_status: "OK",
        status: "OPEN",
        opened_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Open drawer failed",
    };
  }
}

/**
 * =========================
 * CLOSE DRAWER
 * =========================
 */
export async function closeCashDrawer(payload: any): Promise<DrawerCoreResult> {
  try {
    const drawerId = getDrawerId(payload);
    const actualCash = getActualCash(payload);

    if (!drawerId) {
      return {
        success: false,
        error: "Missing drawer_id",
      };
    }

    const drawer = await getDrawerById(drawerId);

    if (normalizeStatus(drawer.status) !== "OPEN") {
      return {
        success: false,
        error: "Drawer already closed",
        data: drawer,
      };
    }

    const movements = await getDrawerMovements(drawer);

    const variance = computeDrawerVariance({
      opening_float: drawer.opening_float,
      movements,
      actual_cash: actualCash,
    });

    const { data, error } = await supabase
      .from("cash_drawers")
      .update({
        actual_cash: actualCash,
        expected_cash: variance.expected_cash,
        variance: variance.variance,
        variance_status: variance.status,
        status: "CLOSED",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", drawerId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        intelligence: variance,
      };
    }

    return {
      success: true,
      data,
      intelligence: variance,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Close drawer failed",
    };
  }
}

/**
 * =========================
 * GET OPEN DRAWERS
 * =========================
 */
export async function getOpenCashDrawers(companyId: string): Promise<DrawerCoreResult> {
  if (!companyId) {
    return {
      success: false,
      error: "Missing company_id",
      data: [],
    };
  }

  const { data, error } = await supabase
    .from("cash_drawers")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false });

  if (error) {
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }

  return {
    success: true,
    data: data || [],
  };
}