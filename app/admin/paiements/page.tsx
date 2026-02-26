import { createAdminClient } from "@/lib/supabase/admin";
import { PaiementsClient } from "./paiements-client";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

type TransactionRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  offer_id: string | null;
  product_type: string;
  amount: number;
  status: string;
  reference: string | null;
  created_at: string;
};

type PaymentStats = {
  revenue30: number;
  reservationPaid30: number;
  reservationPending30: number;
  refunded30: number;
  failed7: number;
  successRate30: number;
  successCount30: number;
  attempts30: number;
};

export default async function AdminPaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();

  const [{ data: payments }, { data: profiles }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, user_id, offer_id, amount, product_type, status, stripe_session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, email, full_name").limit(500),
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
      offer_id: p.offer_id ?? null,
      product_type: p.product_type ?? "autre",
      amount: p.amount ?? 0,
      status: p.status ?? "pending",
      reference: p.stripe_session_id ?? null,
      created_at: p.created_at,
    };
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tx30 = transactions.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);
  const tx7 = transactions.filter((t) => new Date(t.created_at) >= sevenDaysAgo);
  const failed7 = tx7.filter((t) => t.status === "failed");
  const isPaidOrActive = (t: { status: string }) => t.status === "paid" || t.status === "active";
  const revenue30 = tx30.filter(isPaidOrActive).reduce((s, t) => s + t.amount, 0);
  const reservationTx30 = tx30.filter((t) => t.product_type === "reservation");
  const reservationPaid30 = reservationTx30.filter((t) => isPaidOrActive(t)).length;
  const reservationPending30 = reservationTx30.filter((t) => t.status === "pending").length;
  const refunded30 = reservationTx30.filter((t) => t.status === "refunded").length;
  const successRate30 = reservationTx30.length > 0 ? (reservationPaid30 / reservationTx30.length) * 100 : 0;

  const stats: PaymentStats = {
    revenue30,
    reservationPaid30,
    reservationPending30,
    refunded30,
    failed7: failed7.length,
    successRate30,
    successCount30: reservationPaid30,
    attempts30: reservationTx30.length,
  };

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const paginatedTx = transactions.slice(from, from + PAGE_SIZE);

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
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
