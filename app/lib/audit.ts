import { supabase } from '@/lib/supabase';


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
