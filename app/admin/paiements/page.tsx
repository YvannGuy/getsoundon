import { createAdminClient } from "@/lib/supabase/admin";
import { PaiementsClient } from "./paiements-client";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

type TransactionRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  product_type: string;
  amount: number;
  status: string;
  reference: string | null;
  created_at: string;
};

type DepositClaimRow = {
  id: string;
  salle_name: string;
  owner_name: string;
  seeker_name: string;
  deposit_amount_cents: number;
  claim_amount_cents: number;
  claim_reason: string | null;
  claim_requested_at: string | null;
};

export default async function AdminPaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();

  const [{ data: payments }, { data: profiles }, { data: depositClaims }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, user_id, amount, product_type, status, stripe_session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, email, full_name").limit(500),
    supabase
      .from("offers")
      .select(
        "id, salle_id, owner_id, seeker_id, deposit_amount_cents, deposit_claim_amount_cents, deposit_claim_reason, deposit_claim_requested_at, deposit_hold_status"
      )
      .eq("deposit_hold_status", "claim_requested")
      .order("deposit_claim_requested_at", { ascending: false })
      .limit(200),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
  );

  const transactions: TransactionRow[] = (payments ?? []).map((p) => {
    const profile = profileMap.get(p.user_id);
    return {
      id: p.id,
      user_id: p.user_id,
      user_name: profile?.full_name ?? null,
      user_email: profile?.email ?? "",
      product_type: p.product_type ?? "autre",
      amount: p.amount ?? 0,
      status: p.status ?? "pending",
      reference: p.stripe_session_id ?? null,
      created_at: p.created_at,
    };
  });

  const offerRows = (depositClaims ?? []) as {
    id: string;
    salle_id: string;
    owner_id: string;
    seeker_id: string;
    deposit_amount_cents: number;
    deposit_claim_amount_cents: number;
    deposit_claim_reason: string | null;
    deposit_claim_requested_at: string | null;
  }[];
  const offerSalleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const offerProfileIds = [
    ...new Set(offerRows.flatMap((o) => [o.owner_id, o.seeker_id])),
  ];

  const [{ data: sallesForClaims }, { data: profilesForClaims }] = await Promise.all([
    offerSalleIds.length > 0
      ? supabase.from("salles").select("id, name").in("id", offerSalleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    offerProfileIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", offerProfileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  const salleClaimMap = new Map((sallesForClaims ?? []).map((s) => [s.id, s.name]));
  const profileClaimMap = new Map(
    (profilesForClaims ?? []).map((p) => [p.id, p.full_name || p.email || "—"])
  );

  const claimsRows: DepositClaimRow[] = offerRows.map((o) => ({
    id: o.id,
    salle_name: salleClaimMap.get(o.salle_id) ?? "Salle",
    owner_name: profileClaimMap.get(o.owner_id) ?? "Propriétaire",
    seeker_name: profileClaimMap.get(o.seeker_id) ?? "Locataire",
    deposit_amount_cents: o.deposit_amount_cents ?? 0,
    claim_amount_cents: o.deposit_claim_amount_cents ?? 0,
    claim_reason: o.deposit_claim_reason,
    claim_requested_at: o.deposit_claim_requested_at,
  }));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tx30 = transactions.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);
  const tx7 = transactions.filter((t) => new Date(t.created_at) >= sevenDaysAgo);
  const failed7 = tx7.filter((t) => t.status === "failed");
  const isPaidOrActive = (t: { status: string }) => t.status === "paid" || t.status === "active";
  const revenue30 = tx30.filter(isPaidOrActive).reduce((s, t) => s + t.amount, 0);
  const pass24h = tx30.filter((t) => t.product_type === "pass_24h" && t.status === "paid").length;
  const pass48h = tx30.filter((t) => t.product_type === "pass_48h" && t.status === "paid").length;
  const abonnements = tx30.filter((t) => t.product_type === "abonnement" && isPaidOrActive(t)).length;
  const totalPaid = tx30.filter(isPaidOrActive).length;
  const totalAttempts = tx30.length;
  const conversionRate = totalAttempts > 0 ? (totalPaid / totalAttempts) * 100 : 0;

  const stats = {
    revenue30,
    pass24h,
    pass48h,
    abonnements,
    failed: failed7.length,
    conversionRate,
  };

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const paginatedTx = transactions.slice(from, from + PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <PaiementsClient transactions={paginatedTx} stats={stats} depositClaims={claimsRows} />
      <Pagination
        baseUrl="/admin/paiements"
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={transactions.length}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
