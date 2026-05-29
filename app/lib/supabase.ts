import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fnwtypyamolrhlmcdthg.supabase.co";
const supabaseKey = "sb_publishable_xt4ZTUmSACIonAz0J57cGA_--0GaATF";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);