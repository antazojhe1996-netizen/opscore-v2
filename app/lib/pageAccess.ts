import { supabase } from '@/lib/supabase';
import { supabaseServer } from "@/lib/supabase-server";

export type AccessResult = {
  allowed: boolean;
  reason?: string;
};

const systemUserIdKey = "opscore_current_system_user_id";
const companyIdKey = "opscore_current_company_id";
const roleIdKey = "opscore_current_role_id";

export async function canAccessPage(moduleKey: string): Promise<AccessResult> {
  if (typeof window === "undefined") {
    return { allowed: false, reason: "Browser session unavailable." };
  }

  const systemUserId = localStorage.getItem(systemUserIdKey);
  const companyId = localStorage.getItem(companyIdKey);
  const roleId = localStorage.getItem(roleIdKey);

  if (!systemUserId || !companyId || !roleId) {
    return { allowed: false, reason: "No active OPSCORE session." };
  }

  const { data: companyUser, error: companyUserError } = await supabase
    .from("company_users")
    .select("id, role_id, is_active")
    .eq("user_id", systemUserId)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (companyUserError) {
    console.log("COMPANY USER ACCESS ERROR:", companyUserError.message);
    return { allowed: false, reason: "Company access check failed." };
  }

  if (!companyUser?.role_id) {
    return { allowed: false, reason: "No active company role found." };
  }

  const activeRoleId = companyUser.role_id || roleId;

  const { data, error } = await supabase
    .from("role_permissions")
    .select("can_view")
    .eq("role_id", activeRoleId)
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




