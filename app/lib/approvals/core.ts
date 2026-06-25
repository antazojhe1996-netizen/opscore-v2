import { createClient } from "@supabase/supabase-js";
import { cashIn, cashOut } from "../cash/cash-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * =========================
 * SAFE PAYLOAD PARSER
 * =========================
 */
function getPayload(approval: any) {
  if (!approval?.request_payload) return {};

  if (typeof approval.request_payload === "string") {
    try {
      return JSON.parse(approval.request_payload);
    } catch {
      return {};
    }
  }

  return approval.request_payload;
}

/**
 * =========================
 * CREATE APPROVAL
 * =========================
 */
export async function createApproval(data: any) {
  const { data: approval, error } = await supabase
    .from("approval_requests")
    .insert({
      request_type: data.type,
      module: data.module || "CASH",
      title: data.title || `${data.type} - ${data.category}`,
      company_id: data.company_id,

      category: data.category,
      amount: data.amount,
      payment_method: data.payment_method,
      requested_by: data.requested_by,
      status: "PENDING",

      request_payload: data,
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
    data: approval,
  };
}

/**
 * =========================
 * APPROVE APPROVAL (CASH SYNC)
 * =========================
 */
export async function approveApproval(id: string, approvedBy?: string) {
  const { data: approval, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !approval) {
    return {
      success: false,
      error: "Approval not found",
    };
  }

  if (approval.status !== "PENDING") {
    return {
      success: false,
      error: "Already processed",
    };
  }

  const payload = getPayload(approval);

  let movement;

  try {
    if (approval.request_type === "CASH_IN") {
      movement = await cashIn({
        company_id: approval.company_id,
        cash_drawer_id: payload.cash_drawer_id,
        amount: approval.amount,
        category: approval.category,
        payment_method: approval.payment_method,
        reference_no: approval.id,
        created_by: approval.requested_by,
      });
    } else {
      movement = await cashOut({
        company_id: approval.company_id,
        cash_drawer_id: payload.cash_drawer_id,
        amount: approval.amount,
        category: approval.category,
        payment_method: approval.payment_method,
        reference_no: approval.id,
        created_by: approval.requested_by,
      });
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Cash engine failed",
    };
  }

  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: "APPROVED",
      approved_by: approvedBy || null,
    })
    .eq("id", id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  return {
    success: true,
    data: {
      approval_id: id,
      movement,
    },
  };
}

/**
 * =========================
 * REJECT APPROVAL
 * =========================
 */
export async function rejectApproval(id: string, approvedBy?: string) {
  const { data: approval, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !approval) {
    return {
      success: false,
      error: "Approval not found",
    };
  }

  if (approval.status !== "PENDING") {
    return {
      success: false,
      error: "Already processed",
    };
  }

  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: "REJECTED",
      approved_by: approvedBy || null,
    })
    .eq("id", id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  return {
    success: true,
    data: {
      approval_id: id,
      status: "REJECTED",
    },
  };
}


