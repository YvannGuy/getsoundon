/**
 * Heuristique : localStorage utilisé avec des clés suggestives (tokens, session brute).
 * Usage : npx tsx scripts/check-localstorage-sensitive.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components"].map((d) => path.join(ROOT, d));

const SENSITIVE_KEY = /localStorage\.(setItem|getItem)\s*\(\s*['"]([^'"]*)['"]/g;
const BAD_KEYS =
  /token|secret|session|password|refresh|jwt|bearer|apikey|api_key|service_role/i;

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function main() {
  const issues: string[] = [];
  for (const root of SCAN) {
    for (const file of walkFiles(root)) {
      const content = fs.readFileSync(file, "utf8");
      if (!content.includes("localStorage")) continue;
      let m: RegExpExecArray | null;
      const re = new RegExp(SENSITIVE_KEY.source, "gi");
      while ((m = re.exec(content)) !== null) {
        const key = m[2] ?? "";
        if (BAD_KEYS.test(key)) {
          issues.push(`${path.relative(ROOT, file)}: localStorage clé suspecte "${key}"`);
        }
      }
    }
  }
  if (issues.length) {
    console.error("[check-localstorage-sensitive] À vérifier :\n" + issues.join("\n"));
    process.exit(1);
  }
  console.log("[check-localstorage-sensitive] OK");
}

main();
