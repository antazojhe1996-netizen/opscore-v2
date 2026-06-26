import { supabaseServer as supabase } from "@/lib/supabase-server";
/**
 * SERVER SUPABASE CLIENT
 */


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
