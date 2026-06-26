const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);

    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }

    if (!full.endsWith(".ts") && !full.endsWith(".tsx")) continue;

    let text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");

    const usesSupabase = /\bsupabase\s*\./.test(text);
    if (!usesSupabase) continue;

    const hasSupabaseVariable =
      /import\s+\{\s*supabaseServer\s+as\s+supabase\s*\}/.test(text) ||
      /import\s+\{\s*supabaseClient\s+as\s+supabase\s*\}/.test(text) ||
      /import\s+\{\s*supabase\s*\}/.test(text) ||
      /\bconst\s+supabase\s*=/.test(text);

    if (hasSupabaseVariable) continue;

    text = text.trimStart();
    text = 'import { supabaseServer as supabase } from "@/lib/supabase-server";\n' + text;

    fs.writeFileSync(full, text);
    console.log("ALIAS FIXED:", full);
  }
}

walk("./app");
walk("./lib");