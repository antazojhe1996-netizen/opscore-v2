import { supabase } from '@/lib/supabase';
/**
 * SERVER CLIENT (SAFE)
 */


type CurrentUserAccessResult = {
  systemUser: any | null;
  companyUser: any | null;
  employee: any | null;
  role: any | null;
  permissions: any[];
};

const systemUserIdKey = "opscore_current_system_user_id";
const employeeIdKey = "opscore_current_employee_id";
const companyIdKey = "opscore_current_company_id";
const roleIdKey = "opscore_current_role_id";

export const getCurrentUserAccess =
  async (): Promise<CurrentUserAccessResult> => {
    if (typeof window === "undefined") {
      return {
        systemUser: null,
        companyUser: null,
        employee: null,
        role: null,
        permissions: [],
      };
    }

    const systemUserId = localStorage.getItem(systemUserIdKey);
    const employeeId = localStorage.getItem(employeeIdKey);
    const companyId = localStorage.getItem(companyIdKey);
    const savedRoleId = localStorage.getItem(roleIdKey);

    if (!systemUserId || !companyId) {
      return {
        systemUser: null,
        companyUser: null,
        employee: null,
        role: null,
        permissions: [],
      };
    }

    const { data: systemUser } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", systemUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (!systemUser) {
      return {
        systemUser: null,
        companyUser: null,
        employee: null,
        role: null,
        permissions: [],
      };
    }

    const { data: companyUser } = await supabase
      .from("company_users")
      .select("*")
      .eq("user_id", systemUserId)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();

    const activeRoleId = companyUser?.role_id || savedRoleId;

    let employee = null;

    if (employeeId) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .maybeSingle();

      employee = employeeData || null;
    }

    if (!activeRoleId) {
      return {
        systemUser,
        companyUser: companyUser || null,
        employee,
        role: null,
        permissions: [],
      };
    }

    const { data: role } = await supabase
      .from("system_roles")
      .select("*")
      .eq("id", activeRoleId)
      .maybeSingle();

    const { data: permissions } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", activeRoleId);

    return {
      systemUser,
      companyUser: companyUser || null,
      employee,
      role: role || null,
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
      permission.module_key === moduleKey && permission[action] === true
  );
};
