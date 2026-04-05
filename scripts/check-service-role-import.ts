/**
 * Interdit : import du client admin Supabase dans du code sous components/ ou fichiers "use client".
 * Usage : npx tsx scripts/check-service-role-import.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ADMIN_IMPORT = /from\s+["']@\/lib\/supabase\/admin["']|createAdminClient/;

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
  const components = path.join(ROOT, "components");
  for (const file of walkFiles(components)) {
    const content = fs.readFileSync(file, "utf8");
    if (ADMIN_IMPORT.test(content)) {
      issues.push(`${path.relative(ROOT, file)}: import admin / createAdminClient dans components/`);
    }
  }

  const app = path.join(ROOT, "app");
  for (const file of walkFiles(app)) {
    const content = fs.readFileSync(file, "utf8");
    const isClient = /^["']use client["']/m.test(content);
    if (isClient && ADMIN_IMPORT.test(content)) {
      issues.push(`${path.relative(ROOT, file)}: createAdminClient / admin dans fichier use client`);
    }
  }

  if (issues.length) {
    console.error("[check-service-role-import] Échec :\n" + issues.join("\n"));
    process.exit(1);
  }
  console.log("[check-service-role-import] OK");
}

main();
