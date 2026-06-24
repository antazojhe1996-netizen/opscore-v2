/**
 * OPSCORE CORE CONTRACT
 * SINGLE SOURCE OF TRUTH RULES
 */

export const OPSCORE_CONTRACT = {
  // =========================
  // APPROVAL SYSTEM
  // =========================
  approval: {
    idField: "id", // UUID ONLY
    linkField: "source_document_id",
    forbiddenFields: [
      "approval_request_id",
      "reference_id",
      "movement_link_id",
    ],
  },

  // =========================
  // CASH MOVEMENTS
  // =========================
  cash: {
    requiredLinkField: "source_document_id",
    allowedIdType: "uuid",
  },

  // =========================
  // EXPENSES
  // =========================
  expense: {
    requiredLinkField: "source_document_id",
  },
};

/**
 * HARD VALIDATION (STOP BAD DATA EARLY)
 */
export const assertValidApprovalId = (id: any) => {
  if (!id) throw new Error("Missing approval id");

  const isUUID =
    typeof id === "string" &&
    id.includes("-") &&
    id.length > 20;

  if (!isUUID) {
    throw new Error(`INVALID APPROVAL ID (must be UUID): ${id}`);
  }

  return id;
};

/**
 * FORCE CLEAN LINKING
 */
export const getSourceDocumentId = (request: any) => {
  return request?.id || null;
};