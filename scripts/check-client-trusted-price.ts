/**
 * Heuristique : lecture de prix / montant depuis searchParams ou FormData côté client (fichiers use client).
 * À examiner manuellement : le prix de vérité doit venir du serveur.
 * Usage : npx tsx scripts/check-client-trusted-price.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components"].map((d) => path.join(ROOT, d));

const PRICE_READ =
  /searchParams\.get\(\s*['"](price|amount|total|total_price|montant)['"]\s*\)|formData\.get\(\s*['"](price|amount|total|total_price)['"]\s*\)/i;

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function main() {
  const hints: string[] = [];
  for (const root of SCAN) {
    for (const file of walkFiles(root)) {
      const content = fs.readFileSync(file, "utf8");
      if (!/^["']use client["']/m.test(content)) continue;
      if (PRICE_READ.test(content)) {
        hints.push(
          `${path.relative(ROOT, file)}: lecture price/amount côté client — vérifier que le serveur recalcule le montant`,
        );
      }
    }
  }
  if (hints.length) {
    console.warn("[check-client-trusted-price] Revue recommandée :\n" + hints.join("\n"));
    process.exit(1);
  }
  console.log("[check-client-trusted-price] OK (aucun motif use client évident)");
}

main();
