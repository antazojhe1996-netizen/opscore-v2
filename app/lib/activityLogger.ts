import { supabase } from "@/app/lib/supabase";

export const logActivity = async (
  module: string,
  action: string,
  details: string = "",
  userName: string = "System"
) => {
  try {
    const { error } = await supabase
      .from("activity_logs")
      .insert([
        {
          module,
          action,
          user_name: userName,
          details,
        },
      ]);

    if (error) {
      console.log("ACTIVITY LOG ERROR:", error);
    }
  } catch (err) {
    console.log("ACTIVITY LOGGER FAILED:", err);
  }
};

import { supabase } from "@/app/lib/supabase";

export const logActivity = async ({
  module,
  action,
  description,
}: {
  module: string;
  action: string;
  description: string;
}) => {
  try {
    const currentEmployeeId =
      localStorage.getItem("opscore_current_employee_id");

    if (!currentEmployeeId) return;

    const { data: employee } = await supabase
      .from("employees")
      .select(`
        *,
        system_roles (
          role_name
        )
      `)
      .eq("id", currentEmployeeId)
      .single();

    await supabase
      .from("activity_logs")
      .insert({
        employee_id: employee?.id,
        employee_name: `${employee?.first_name || ""} ${employee?.last_name || ""}`,
        role_name: employee?.system_roles?.role_name || "",

        module,
        action,
        description,
      });
  } catch (error) {
    console.log("ACTIVITY LOG ERROR:", error);
  }
};