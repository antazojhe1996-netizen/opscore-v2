type AuditLogInput = {
  userId?: string | null;
  userName?: string | null;
  module: string;
  action: string;
  description: string;
  severity?: "info" | "warning" | "critical";
  recordId?: string | null;
  oldValue?: any;
  newValue?: any;
};

export async function createAuditLog({
  userId = null,
  userName = null,
  module,
  action,
  description,
  severity = "info",
  recordId = null,
  oldValue = null,
  newValue = null,
}: AuditLogInput) {
  try {
    await fetch("/api/audit/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        userName,
        module,
        action,
        description,
        severity,
        recordId,
        oldValue,
        newValue,
      }),
    });
  } catch (error) {
    console.log("AUDIT FETCH ERROR:", error);
  }
}