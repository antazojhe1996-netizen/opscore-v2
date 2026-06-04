import { supabase } from "@/app/lib/supabase";

export const getCurrentUserAccess = async () => {
  const currentEmployeeId =
    typeof window !== "undefined"
      ? localStorage.getItem("opscore_current_employee_id")
      : null;

  if (!currentEmployeeId) {
    return {
      employee: null,
      role: null,
      permissions: [],
    };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("*, system_roles(*)")
    .eq("id", currentEmployeeId)
    .maybeSingle();

  if (!employee?.system_role_id) {
    return {
      employee,
      role: null,
      permissions: [],
    };
  }

  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", employee.system_role_id);

  return {
    employee,
    role: employee.system_roles,
    permissions: permissions || [],
  };
};

export const hasPermission = (
  permissions: any[],
  moduleKey: string,
  action: string = "can_view"
) => {
  return permissions.some(
    (permission) =>
      permission.module_key === moduleKey &&
      permission[action] === true
  );
};