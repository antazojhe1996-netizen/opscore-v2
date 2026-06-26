const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);

    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }

    if (!full.endsWith("route.ts")) continue;

    let text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");

    const usesSupabase = /\bsupabase\s*\./.test(text);
    const hasSupabaseImport =
      /from\s+["']@\/lib\/supabase-server["']/.test(text) ||
      /from\s+["']@\/lib\/supabase["']/.test(text);

    if (!usesSupabase || hasSupabaseImport) continue;

    text = text.trimStart();

    const nextServerImport = text.match(/^import\s+\{[^}]*NextResponse[^}]*\}\s+from\s+["']next\/server["'];?\s*\r?\n/);

    if (nextServerImport) {
      text = text.replace(
        nextServerImport[0],
        nextServerImport[0] + 'import { supabaseServer as supabase } from "@/lib/supabase-server";\n'
      );
    } else {
      text = 'import { supabaseServer as supabase } from "@/lib/supabase-server";\n' + text;
    }

    fs.writeFileSync(full, text);
    console.log("API FIXED:", full);
  }
}

walk("./app/api");