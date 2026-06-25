import { supabaseServer } from "@/lib/supabase-server";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "release";

export type RolePermission = {
  id: string;
  role_id: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_release: boolean;
};

const currentUserKey = "opscore_current_user";

export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem(currentUserKey);

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
}

export async function getCurrentRoleId() {
  const user = getCurrentUser();

  if (!user?.role_id) return null;

  return user.role_id as string;
}

export async function getRolePermissions(roleId?: string | null) {
  const finalRoleId = roleId || (await getCurrentRoleId());

  if (!finalRoleId) return [];

  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", finalRoleId);

  if (error) {
    console.log("GET ROLE PERMISSIONS ERROR:", error.message);
    return [];
  }

  return (data || []) as RolePermission[];
}

export async function getPermission(
  moduleKey: string,
  roleId?: string | null
) {
  const finalRoleId = roleId || (await getCurrentRoleId());

  if (!finalRoleId) return null;

  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", finalRoleId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (error) {
    console.log("GET PERMISSION ERROR:", error.message);
    return null;
  }

  return data as RolePermission | null;
}

export async function hasPermission(
  moduleKey: string,
  action: PermissionAction = "view",
  roleId?: string | null
) {
  const permission = await getPermission(moduleKey, roleId);

  if (!permission) return false;

  if (action === "view") return Boolean(permission.can_view);
  if (action === "create") return Boolean(permission.can_create);
  if (action === "edit") return Boolean(permission.can_edit);
  if (action === "delete") return Boolean(permission.can_delete);
  if (action === "approve") return Boolean(permission.can_approve);
  if (action === "release") return Boolean(permission.can_release);

  return false;
}

export async function canView(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "view", roleId);
}

export async function canCreate(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "create", roleId);
}

export async function canEdit(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "edit", roleId);
}

export async function canDelete(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "delete", roleId);
}

export async function canApprove(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "approve", roleId);
}

export async function canRelease(moduleKey: string, roleId?: string | null) {
  return hasPermission(moduleKey, "release", roleId);
}




