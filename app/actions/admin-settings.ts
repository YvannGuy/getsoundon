"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** `pass` est lu pour compatibilité / futur UI ; l’enregistrement depuis l’admin ne touche pas à cette clé. */
const DEFAULT_SETTINGS = {
  pass: {
    price_24h: 499,
    price_48h: 999,
    price_abonnement: 1999,
    demandes_gratuites: 2,
    pass_24h_enabled: true,
    pass_48h_enabled: true,
    abonnement_enabled: true,
  },
  validation: {
    validation_manuelle: true,
    mode_publication: "manual" as "manual" | "auto",
  },
  commission: {
    fixed_fee_cents: 1500,
    ponctuel: true,
    mensuel: false,
  },
};

export type PlatformSettings = typeof DEFAULT_SETTINGS;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Accès refusé." };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";

  if (!isAdminByEnv && !isAdminByProfile) {
    return { ok: false as const, error: "Accès refusé." };
  }
  return { ok: true as const };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .select("key, value");

    if (error || !data || data.length === 0) return DEFAULT_SETTINGS;

    const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    data.forEach((row: { key: string; value: Record<string, unknown> }) => {
      if (row.key in settings && row.value) {
        settings[row.key] = { ...settings[row.key], ...row.value };
      }
    });
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function savePlatformSettingsAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createAdminClient();

  /* P0 : ne pas réécrire la clé `pass` depuis ce formulaire — pas d’UI pass ; évite les réécritures fantômes. */

  const validation = {
    validation_manuelle: formData.get("validation_manuelle") === "on",
    mode_publication: (formData.get("validation_mode") as "manual" | "auto") || "manual",
  };

  const fixedFeeRaw = parseFloat(String(formData.get("commission_fixed_fee_eur") ?? "15"));
  const commission = {
    fixed_fee_cents: Math.max(0, Math.round((Number.isFinite(fixedFeeRaw) ? fixedFeeRaw : 15) * 100)),
    ponctuel: formData.get("commission_ponctuel") === "on",
    mensuel: formData.get("commission_mensuel") === "on",
  };

  try {
    for (const [key, value] of Object.entries({
      validation,
      commission,
    })) {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) return { error: error.message };
    }
  } catch (e) {
    return { error: "Table platform_settings manquante. Exécutez la migration supabase-platform-settings.sql" };
  }

  revalidatePath("/admin/parametres");
  return { success: true };
}

export async function addAdminAction(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ user_type: "admin" })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/parametres");
  return { success: true };
}

export async function removeAdminAction(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: "seeker" })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/parametres");
  return { success: true };
}

