/**
 * Script pour créer le bucket Supabase "contrats" destiné aux contrats de réservation.
 * Exécuter une seule fois: node scripts/init-contract-storage.mjs
 *
 * Prérequis: SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const BUCKET_NAME = "contrats";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Erreur: définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(`Bucket "${BUCKET_NAME}" existe déjà.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: ["application/pdf"],
  });

  if (error) {
    console.error("Erreur lors de la création du bucket:", error.message);
    process.exit(1);
  }

  console.log(`Bucket "${BUCKET_NAME}" créé avec succès.`);
}

main();
