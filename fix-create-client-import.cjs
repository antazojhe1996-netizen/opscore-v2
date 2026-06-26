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

    const usesCreateClient = /\bcreateClient\s*\(/.test(text);
    const hasCreateClientImport = /import\s+\{\s*createClient\s*\}\s+from\s+["']@supabase\/supabase-js["'];?/.test(text);

    if (!usesCreateClient || hasCreateClientImport) continue;

    text = text.trimStart();
    text = 'import { createClient } from "@supabase/supabase-js";\n' + text;

    fs.writeFileSync(full, text);
    console.log("CREATECLIENT FIXED:", full);
  }
}

walk("./app");
walk("./lib");