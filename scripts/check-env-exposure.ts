/**
 * Détecte des motifs dangereux : secrets ou service role exposés via NEXT_PUBLIC_*.
 * Usage : npx tsx scripts/check-env-exposure.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** NEXT_PUBLIC_SUPABASE_URL est légitime ; interdire surtout service_role / secrets en public. */
const BAD_NEXT_PUBLIC = [
  /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|WEBHOOK|STRIPE_SK|PRIVATE_KEY)/i,
  /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/i,
];

const CODE_ROOTS = ["app", "components", "lib"].map((d) => path.join(ROOT, d));
const ROOT_FILES = ["proxy.ts", "middleware.ts"].map((f) => path.join(ROOT, f));

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
    const p = path.join(dir, name);
    if (ent.isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

function main() {
  const issues: string[] = [];
  const files: string[] = [];
  for (const d of CODE_ROOTS) files.push(...walkFiles(d));
  for (const f of ROOT_FILES) {
    if (fs.existsSync(f)) files.push(f);
  }
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const re of BAD_NEXT_PUBLIC) {
      if (re.test(content)) {
        issues.push(`${rel}: motif suspect ${re}`);
      }
    }
  }
  if (issues.length) {
    console.error("[check-env-exposure] Échec :\n" + issues.join("\n"));
    process.exit(1);
  }
  console.log("[check-env-exposure] OK");
}

main();
