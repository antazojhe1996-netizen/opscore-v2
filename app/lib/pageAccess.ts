import { supabase } from "@/app/lib/supabase";

export const getPageAccess = async (
  moduleKey: string
) => {
  const currentEmployeeId =
    localStorage.getItem(
      "opscore_current_employee_id"
    );

  if (!currentEmployeeId) {
    return false;
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("system_role_id")
    .eq("id", currentEmployeeId)
    .single();

  if (!employee?.system_role_id) {
    return false;
  }

  const { data } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", employee.system_role_id)
    .eq("module_key", moduleKey)
    .single();

  return data?.can_view === true;
};