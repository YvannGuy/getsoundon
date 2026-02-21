import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/app/actions/admin-settings";

const now = new Date();

function hasValidPaidPass(payments: { product_type: string; created_at: string }[]): boolean {
  return (payments ?? []).some((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });
}

export type TrialStats = {
  totalUsersOnTrial: number;
  organisateursOnTrial: number;
  proprietairesOnTrial: number;
  totalClicksRemaining: number;
  organisateursClicksRemaining: number;
  proprietairesClicksRemaining: number;
  usersWithClicksLeft: Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    user_type: string | null;
    used: number;
    total: number;
    remaining: number;
  }>;
};

export async function getAdminTrialStats(): Promise<TrialStats> {
  const supabase = createAdminClient();
  const settings = await getPlatformSettings();
  const freeTotal = settings.pass.demandes_gratuites;

  const [
    { data: profiles },
    { data: demandesBySeeker },
    { data: payments },
    { data: salleViews },
    { data: salles },
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, user_type"),
    supabase.from("demandes").select("seeker_id").not("seeker_id", "is", null),
    supabase
      .from("payments")
      .select("user_id, product_type, created_at")
      .eq("status", "paid")
      .in("product_type", ["pass_24h", "pass_48h", "abonnement"]),
    supabase.from("salle_views").select("viewer_id, salle_id"),
    supabase.from("salles").select("id, owner_id"),
  ]);

  const seekerDemandesCount = new Map<string, number>();
  (demandesBySeeker ?? []).forEach((d) => {
    const sid = (d as { seeker_id: string }).seeker_id;
    if (sid) seekerDemandesCount.set(sid, (seekerDemandesCount.get(sid) ?? 0) + 1);
  });

  const userPayments = new Map<string, { product_type: string; created_at: string }[]>();
  (payments ?? []).forEach((p) => {
    const uid = (p as { user_id: string }).user_id;
    if (!userPayments.has(uid)) userPayments.set(uid, []);
    userPayments.get(uid)!.push({
      product_type: (p as { product_type: string }).product_type,
      created_at: (p as { created_at: string }).created_at,
    });
  });

  const salleOwnerMap = new Map((salles ?? []).map((s) => [(s as { id: string }).id, (s as { owner_id: string }).owner_id]));
  const ownerDistinctViews = new Map<string, Set<string>>();
  (salleViews ?? []).forEach((v) => {
    const viewerId = (v as { viewer_id: string | null }).viewer_id;
    const salleId = (v as { salle_id: string }).salle_id;
    if (!viewerId) return;
    const ownerId = salleOwnerMap.get(salleId);
    if (ownerId && ownerId !== viewerId) {
      if (!ownerDistinctViews.has(viewerId)) ownerDistinctViews.set(viewerId, new Set());
      ownerDistinctViews.get(viewerId)!.add(salleId);
    }
  });

  let organisateursOnTrial = 0;
  let proprietairesOnTrial = 0;
  let organisateursClicksRemaining = 0;
  let proprietairesClicksRemaining = 0;
  const usersWithClicksLeft: TrialStats["usersWithClicksLeft"] = [];

  (profiles ?? []).forEach((p) => {
    const id = (p as { id: string }).id;
    const userType = (p as { user_type: string | null }).user_type;
    const paidList = userPayments.get(id) ?? [];
    const hasPaid = hasValidPaidPass(paidList);

    if (userType === "seeker") {
      const used = seekerDemandesCount.get(id) ?? 0;
      const remaining = Math.max(0, freeTotal - used);
      const onTrial = used < freeTotal && !hasPaid;
      if (onTrial) {
        organisateursOnTrial++;
        organisateursClicksRemaining += remaining;
        usersWithClicksLeft.push({
          id,
          email: (p as { email: string | null }).email,
          full_name: (p as { full_name: string | null }).full_name,
          user_type: userType,
          used,
          total: freeTotal,
          remaining,
        });
      }
    } else if (userType === "owner") {
      const viewedSalles = ownerDistinctViews.get(id);
      const usedCount = viewedSalles?.size ?? 0;
      const remaining = Math.max(0, freeTotal - usedCount);
      const onTrial = usedCount < freeTotal && !hasPaid;
      if (onTrial) {
        proprietairesOnTrial++;
        proprietairesClicksRemaining += remaining;
        usersWithClicksLeft.push({
          id,
          email: (p as { email: string | null }).email,
          full_name: (p as { full_name: string | null }).full_name,
          user_type: userType,
          used: usedCount,
          total: freeTotal,
          remaining,
        });
      }
    }
  });

  return {
    totalUsersOnTrial: organisateursOnTrial + proprietairesOnTrial,
    organisateursOnTrial,
    proprietairesOnTrial,
    totalClicksRemaining: organisateursClicksRemaining + proprietairesClicksRemaining,
    organisateursClicksRemaining,
    proprietairesClicksRemaining,
    usersWithClicksLeft: usersWithClicksLeft.sort((a, b) => b.remaining - a.remaining),
  };
}
