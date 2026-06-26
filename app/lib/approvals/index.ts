/**
 * =========================
 * APPROVAL MODULE PUBLIC API
 * =========================
 * Import from "@/lib/approvals" instead of importing internal files directly.
 *
 * Public entrypoint:
 * UI / API / Engines
 *      ↓
 * "@/lib/approvals"
 *      ↓
 * approval-engine / core
 */

export {
  executeApproval,
  executeCashDrawerApprovalAction,
  getApprovalPayload,
  normalizeWorkflowKey,
} from "./approval-engine";

export type { ApprovalExecutionContext } from "./approval-engine";

export {
  createApproval,
  approveApproval,
  rejectApproval,
} from "./core";