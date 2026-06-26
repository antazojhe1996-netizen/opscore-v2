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
    const hasSupabaseImport =
      /from\s+["']@\/lib\/supabase["']/.test(text) ||
      /from\s+["']@\/lib\/supabase-client["']/.test(text) ||
      /from\s+["']@\/lib\/supabase-server["']/.test(text);

    if (!usesSupabase || hasSupabaseImport) continue;

    text = text.trimStart();
    text = 'import { supabaseServer as supabase } from "@/lib/supabase-server";\n' + text;

    fs.writeFileSync(full, text);
    console.log("APP LIB SUPABASE FIXED:", full);
  }
}

walk("./app/lib");