import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      user_name: userName,
      module,
      action,
      description,
      severity,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
    });

    if (error) {
      console.log("CREATE AUDIT LOG ERROR:", error);
    }
  } catch (err) {
    console.log("CREATE AUDIT LOG FAILED:", err);
  }
}