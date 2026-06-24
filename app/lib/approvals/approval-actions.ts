import { supabase } from "@/app/lib/supabase";
import { createAuditLog } from "@/app/lib/audit";

export const normalizeWorkflowKey = (value: any) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

export const getApprovalPayload = (request: any) => {
  if (!request?.request_payload) return {};
  if (typeof request.request_payload === "string") {
    try {
      return JSON.parse(request.request_payload);
    } catch {
      return {};
    }
  }
  return request.request_payload || {};
};

// =========================
// CLEAN VERSION ONLY
// NO STRING MARKERS
// =========================
export const cleanRemarks = (remarks: any) =>
  String(remarks || "Approved movement").trim();