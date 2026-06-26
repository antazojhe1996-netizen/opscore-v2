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

    const normalized = full.replaceAll("\\", "/");
    if (normalized.includes("/app/api/")) continue;
    if (normalized.includes("/app/lib/")) continue;

    let text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");

    const hadClient = text.includes('"use client"') || text.includes("'use client'");
    const usesClientFeature =
      /useState|useEffect|useMemo|useRef|useRouter|onClick|onChange|onSubmit|styled-jsx|ssr:\s*false/.test(text);

    const usesSupabase =
      /supabase\./.test(text) ||
      /from\s+["']@\/lib\/supabase["']/.test(text) ||
      /from\s+["']@\/lib\/supabase-client["']/.test(text);

    text = text
      .replace(/^\s*["']use client["'];?\s*\r?\n/gm, "")
      .replace(/^\s*import\s+\{\s*supabase\s*\}\s+from\s+["']@\/lib\/supabase["'];?\s*\r?\n/gm, "")
      .replace(/^\s*import\s+\{\s*supabaseClient\s+as\s+supabase\s*\}\s+from\s+["']@\/lib\/supabase-client["'];?\s*\r?\n/gm, "");

    text = text.trimStart();

    const isLayout = /\/layout\.tsx$/.test(normalized);
    const isManifest = /\/manifest\.ts$/.test(normalized);

    if (!isLayout && !isManifest && (hadClient || usesClientFeature)) {
      let header = `"use client";\n\n`;
      if (usesSupabase) {
        header += `import { supabaseClient as supabase } from "@/lib/supabase-client";\n`;
      }
      text = header + text;
    }

    fs.writeFileSync(full, text);
    console.log("CLEANED:", full);
  }
}

walk("./app");
walk("./components");