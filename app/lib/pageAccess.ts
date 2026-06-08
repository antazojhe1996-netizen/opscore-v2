import { supabase } from "@/app/lib/supabase";

export type AccessResult = {
  allowed: boolean;
  reason?: string;
};

export async function canAccessPage(moduleKey: string): Promise<AccessResult> {
  if (typeof window === "undefined") {
    return { allowed: false, reason: "Browser session unavailable." };
  }

  const roleId = localStorage.getItem("opscore_current_role_id");
  const employeeId = localStorage.getItem("opscore_current_employee_id");

  if (!roleId || !employeeId) {
    return { allowed: false, reason: "No active OPSCORE session." };
  }

  const { data, error } = await supabase
    .from("role_permissions")
    .select("can_view")
    .eq("role_id", roleId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (error) {
    console.log("PAGE ACCESS ERROR:", error.message);
    return { allowed: false, reason: "Permission check failed." };
  }

  if (!data?.can_view) {
    return { allowed: false, reason: "You do not have access to this page." };
  }

  return { allowed: true };
}