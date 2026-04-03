/**
 * Crée ou met à jour un utilisateur Supabase Auth pour le login admin (/auth/admin).
 * Prérequis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_PASSWORD dans .env.local
 *
 * Usage: node scripts/bootstrap-admin-auth.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const email =
  (process.env.BOOTSTRAP_ADMIN_EMAIL || "support@getsoundon.com").trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

async function findUserByEmail(admin, targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find(
      (u) => (u.email || "").toLowerCase() === targetEmail
    );
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Erreur: définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local"
    );
    process.exit(1);
  }
  if (!password) {
    console.error(
      "Erreur: définissez BOOTSTRAP_ADMIN_PASSWORD dans .env.local (usage unique, puis supprimez-la)"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error("Échec mise à jour utilisateur:", error.message);
      process.exit(1);
    }
    console.log(`Utilisateur mis à jour: ${email} (id ${existing.id})`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Échec création utilisateur:", error.message);
    process.exit(1);
  }
  console.log(`Utilisateur créé: ${email} (id ${data.user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
