import { supabaseServer as supabase } from "@/lib/supabase-server";
import { executeCashDrawerApprovalAction } from "./approval-actions";

/**
 * =========================
 * APPROVAL CORE
 * =========================
 * Compatibility layer for older imports.
 *
 * Source of truth for execution:
 * approval-actions.ts
 *
 * Rules:
 * - PENDING = no movement
 * - APPROVED = exactly one execution
 * - REJECTED = no execution
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

  return approval.request_payload || {};
}

function normalizeApprovalType(value: any) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isCashExecutableApproval(approval: any) {
  const requestType = normalizeApprovalType(approval?.request_type);
  const moduleName = normalizeApprovalType(approval?.module);

  return (
    moduleName === "CASH" ||
    requestType.includes("CASH") ||
    requestType.includes("EXPENSE") ||
    requestType.includes("REFUND") ||
    requestType.includes("ADJUSTMENT")
  );
}

/**
 * =========================
 * CREATE APPROVAL
 * =========================
 */
export async function createApproval(data: any) {
  const payload = {
    ...data,
    request_payload: undefined,
  };

  const { data: approval, error } = await supabase
    .from("approval_requests")
    .insert({
      request_type: data.type || data.request_type,
      module: data.module || "CASH",
      title:
        data.title ||
        `${data.type || data.request_type || "APPROVAL"} - ${
          data.category || data.source || "Request"
        }`,
      company_id: data.company_id,

      category: data.category || data.source || null,
      amount: Number(data.amount || 0),
      payment_method: data.payment_method || data.payment_type || "Cash",
      requested_by: data.requested_by || data.created_by || null,
      status: "PENDING",

      request_payload: data.request_payload || payload,
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
    data: approval,
  };
}

/**
 * =========================
 * APPROVE APPROVAL
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

  try {
    if (isCashExecutableApproval(approval)) {
      const result = await executeCashDrawerApprovalAction({
        request: approval,
        currentEmployeeName:
          approvedBy ||
          payload.approved_by ||
          payload.current_employee_name ||
          "Approval Center",
        currentEmployeeId:
          payload.current_employee_id ||
          payload.employee_id ||
          null,
        currentSystemUserId:
          payload.current_system_user_id ||
          payload.system_user_id ||
          null,
        companyId:
          approval.company_id ||
          payload.company_id ||
          null,
      });

      return {
        success: true,
        data: {
          approval_id: id,
          ...result,
        },
      };
    }

    const { error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: "APPROVED",
        approved_by: approvedBy || "Approval Center",
        approved_at: new Date().toISOString(),
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
        status: "APPROVED",
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Approval execution failed",
    };
  }
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
      approved_by: approvedBy || "Approval Center",
      rejected_by: approvedBy || "Approval Center",
      rejected_at: new Date().toISOString(),
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