"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();

  const pass = {
    price_24h: Math.round(parseFloat(String(formData.get("pass_price_24h") ?? 4.99)) * 100),
    price_48h: Math.round(parseFloat(String(formData.get("pass_price_48h") ?? 9.99)) * 100),
    price_abonnement: Math.round(parseFloat(String(formData.get("pass_price_abonnement") ?? 19.99)) * 100),
    demandes_gratuites: parseInt(String(formData.get("pass_demandes_gratuites") ?? "2"), 10),
    pass_24h_enabled: formData.get("pass_24h_enabled") === "on",
    pass_48h_enabled: formData.get("pass_48h_enabled") === "on",
    abonnement_enabled: formData.get("pass_abonnement_enabled") === "on",
  };

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
      pass,
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
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: "seeker" })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/parametres");
  return { success: true };
}

export async function deleteAllSallesAction() {
  const supabase = createAdminClient();
  const { data: ids } = await supabase.from("salles").select("id");
  if (ids && ids.length > 0) {
    const { error } = await supabase.from("salles").delete().in("id", ids.map((r) => r.id));
    if (error) return { error: error.message };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/annonces");
  return { success: true };
}
