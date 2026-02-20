import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSettings } from "@/app/actions/admin-settings";

/** Retourne true si l'utilisateur a un pass actif (24h, 48h ou abonnement) */
export async function hasAccessToBrowseOthers(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = createAdminClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("product_type, created_at")
    .eq("user_id", userId)
    .eq("status", "paid")
    .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
    .order("created_at", { ascending: false });

  const now = new Date();
  return (payments ?? []).some((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });
}

/** Retourne true si l'utilisateur peut contacter les propriétaires (pass actif ou demandes gratuites restantes) */
export async function hasAccessToContact(
  userId: string | null,
  settings: PlatformSettings
): Promise<boolean> {
  if (!userId) return false;
  const result = await checkCanCreateDemande(userId, settings);
  return result.allowed;
}

export type PassCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "pass_required"; message: string };

export async function checkCanCreateDemande(
  seekerId: string,
  settings: PlatformSettings
): Promise<PassCheckResult> {
  const supabase = createAdminClient();
  const pass = settings.pass;

  const { count: demandesCount } = await supabase
    .from("demandes")
    .select("*", { count: "exact", head: true })
    .eq("seeker_id", seekerId);

  const total = demandesCount ?? 0;

  if (total < pass.demandes_gratuites) {
    return { allowed: true };
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("product_type, created_at")
    .eq("user_id", seekerId)
    .eq("status", "paid")
    .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
    .order("created_at", { ascending: false });

  const now = new Date();
  const hasValidPass = (payments ?? []).some((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });

  if (hasValidPass) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "pass_required",
    message: `Vos ${pass.demandes_gratuites} demandes gratuites sont épuisées. Vous devez acquérir un Pass 24h, 48h ou un abonnement pour continuer.`,
  };
}
