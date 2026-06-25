import { createClient } from "@supabase/supabase-js";

/**
 * SERVER SUPABASE CLIENT
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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