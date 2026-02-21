import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSettings } from "@/app/actions/admin-settings";
import { getOwnerOtherSallesViewCount } from "@/app/actions/salle-views";

function hasValidPaidPass(payments: { product_type: string; created_at: string }[]): boolean {
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

/** Infos d'accès pour propriétaire (consultation des autres annonces) */
export type OwnerBrowseResult = {
  allowed: boolean;
  freeUsed: number;
  freeTotal: number;
  hasPaidPass: boolean;
  activePass: { product_type: string; created_at: string } | null;
};

/** Retourne true si l'utilisateur peut consulter les annonces des autres (pass actif ou 3 consultations gratuites pour owners) */
export async function hasAccessToBrowseOthers(
  userId: string | null,
  options?: { forOwner?: boolean; settings?: PlatformSettings }
): Promise<boolean> {
  if (!userId) return false;
  const supabase = createAdminClient();
  const settings = options?.settings ?? (await import("@/app/actions/admin-settings").then((m) => m.getPlatformSettings()));
  const freeTotal = settings?.pass?.demandes_gratuites ?? 2;

  const paidOrActive = ["paid", "active"];

  if (options?.forOwner) {
    const [otherViewsCount, { data: payments }, { data: profile }] = await Promise.all([
      getOwnerOtherSallesViewCount(userId),
      supabase
        .from("payments")
        .select("product_type, created_at, status")
        .eq("user_id", userId)
        .in("status", paidOrActive)
        .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("trial_activated_at").eq("id", userId).maybeSingle(),
    ]);
    const trialActivated = !!(profile as { trial_activated_at: string | null } | null)?.trial_activated_at;
    if (trialActivated && otherViewsCount < freeTotal) return true;
    return hasValidPaidPass(payments ?? []);
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("product_type, created_at, status")
    .eq("user_id", userId)
    .in("status", paidOrActive)
    .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
    .order("created_at", { ascending: false });

  return hasValidPaidPass(payments ?? []);
}

/** Détails pour l'affichage propriétaire (essai, pass) */
export async function getOwnerBrowseAccess(userId: string): Promise<OwnerBrowseResult> {
  const supabase = createAdminClient();
  const settings = await import("@/app/actions/admin-settings").then((m) => m.getPlatformSettings());
  const freeTotal = settings.pass.demandes_gratuites;

  const paidOrActive = ["paid", "active"];
  const [freeUsed, { data: payments }, { data: profile }] = await Promise.all([
    getOwnerOtherSallesViewCount(userId),
    supabase
      .from("payments")
      .select("product_type, created_at, status")
      .eq("user_id", userId)
      .in("status", paidOrActive)
      .in("product_type", ["pass_24h", "pass_48h", "abonnement"])
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("trial_activated_at").eq("id", userId).maybeSingle(),
  ]);

  const paidList = payments ?? [];
  const hasPaid = hasValidPaidPass(paidList);
  const trialActivated = !!(profile as { trial_activated_at: string | null } | null)?.trial_activated_at;
  const allowed = hasPaid || (trialActivated && freeUsed < freeTotal);

  const now = new Date();
  const activePass = (paidList ?? []).find((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  }) ?? null;

  return {
    allowed,
    freeUsed,
    freeTotal,
    hasPaidPass: hasPaid,
    activePass,
  };
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

  const [{ count: demandesCount }, { data: profile }] = await Promise.all([
    supabase.from("demandes").select("*", { count: "exact", head: true }).eq("seeker_id", seekerId),
    supabase.from("profiles").select("trial_activated_at").eq("id", seekerId).maybeSingle(),
  ]);

  const total = demandesCount ?? 0;
  const trialActivated = !!(profile as { trial_activated_at: string | null } | null)?.trial_activated_at;

  if (total < pass.demandes_gratuites && trialActivated) {
    return { allowed: true };
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("product_type, created_at, status")
    .eq("user_id", seekerId)
    .in("status", ["paid", "active"])
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
