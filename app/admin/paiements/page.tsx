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

export default async function AdminPaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();

  const [{ data: subscriptions }, { data: profiles }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, status, created_at, stripe_subscription_id")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, email, full_name").limit(500),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
  );

  const transactions: TransactionRow[] = [];

  (subscriptions ?? []).forEach((s) => {
    const profile = profileMap.get(s.user_id);
    const planToProduct: Record<string, string> = {
      basic: "pass_24h",
      pro: "pass_48h",
      premium: "abonnement",
    };
    transactions.push({
      id: s.id,
      user_id: s.user_id,
      user_name: profile?.full_name ?? null,
      user_email: profile?.email ?? "",
      product_type: planToProduct[s.plan_id ?? ""] ?? "abonnement",
      amount: s.plan_id === "pro" ? 4999 : s.plan_id === "premium" ? 9999 : 1999,
      status: s.status === "active" ? "paid" : s.status === "past_due" ? "pending" : "failed",
      reference: s.stripe_subscription_id ?? null,
      created_at: s.created_at,
    });
  });

  transactions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tx30 = transactions.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);
  const tx7 = transactions.filter((t) => new Date(t.created_at) >= sevenDaysAgo);
  const failed7 = tx7.filter((t) => t.status === "failed");
  const revenue30 = tx30.filter((t) => t.status === "paid").reduce((s, t) => s + t.amount, 0);
  const pass24h = tx30.filter((t) => t.product_type === "pass_24h" && t.status === "paid").length;
  const pass48h = tx30.filter((t) => t.product_type === "pass_48h" && t.status === "paid").length;
  const abonnements = tx30.filter((t) => t.product_type === "abonnement" && t.status === "paid").length;
  const totalPaid = tx30.filter((t) => t.status === "paid").length;
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
      <PaiementsClient transactions={paginatedTx} stats={stats} />
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
