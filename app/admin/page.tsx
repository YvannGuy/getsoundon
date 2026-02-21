import Link from "next/link";
import {
  Building2,
  Clock,
  CreditCard,
  Euro,
  Gift,
  Mail,
  Star,
  TrendingUp,
} from "lucide-react";

import { validateSalleFormAction } from "@/app/actions/admin";
import { getAdminTrialStats } from "@/lib/admin-trial-stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingCount },
    { count: activeCount },
    { count: demandesCount7j },
    { data: payments },
    { data: demandes30j },
    { data: recentSalles },
    { data: recentProfiles },
    trialStats,
  ] = await Promise.all([
    supabase.from("salles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("salles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("demandes").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase
      .from("payments")
      .select("id, user_id, amount, product_type, status, created_at")
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
    supabase
      .from("demandes")
      .select("created_at")
      .gte("created_at", monthAgo),
    supabase
      .from("salles")
      .select("id, name, city, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("id, email, full_name, user_type")
      .order("created_at", { ascending: false })
      .limit(5),
    getAdminTrialStats(),
  ]);

  const paidPayments = (payments ?? []).filter((p) => p.status === "paid");
  const passActifs = paidPayments.length;
  const pass24h = paidPayments.filter((p) => p.product_type === "pass_24h").length;
  const pass48h = paidPayments.filter((p) => p.product_type === "pass_48h").length;
  const passAbonnement = paidPayments.filter((p) => p.product_type === "abonnement").length;
  const revenue30 = paidPayments
    .filter((p) => new Date(p.created_at) >= new Date(monthAgo))
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  const demandesParJour = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dayStart = d.toISOString().slice(0, 10);
    return (demandes30j?.filter((x) => x.created_at?.startsWith(dayStart)) ?? []).length;
  });
  const maxDemandes = Math.max(...demandesParJour, 1);

  const formatAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    const j = Math.floor(h / 24);
    return `Il y a ${j}j`;
  };

  const getRoleLabel = (userType: string | null) => {
    if (userType === "owner") return "Propriétaire";
    if (userType === "seeker") return "Organisateur";
    return "—";
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Annonces en attente
            </CardTitle>
            <Clock className="absolute right-6 top-6 h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{pendingCount ?? 0}</p>
            <p className="text-xs text-amber-600">Action requise</p>
          </CardContent>
        </Card>
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Annonces actives
            </CardTitle>
            <Building2 className="absolute right-6 top-6 h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{activeCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Demandes envoyées (7j)
            </CardTitle>
            <Mail className="absolute right-6 top-6 h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{demandesCount7j ?? 0}</p>
            <p className="text-xs text-slate-500">
              {demandesCount7j ? Math.round((demandesCount7j / 7) * 10) / 10 : 0} par jour en moyenne
            </p>
          </CardContent>
        </Card>
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Revenu (30j)
            </CardTitle>
            <Euro className="absolute right-6 top-6 h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">
              {(revenue30 / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-slate-500">
              {paidPayments.filter((p) => new Date(p.created_at) >= new Date(monthAgo)).length} transactions
            </p>
          </CardContent>
        </Card>
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pass actifs
            </CardTitle>
            <Star className="absolute right-6 top-6 h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{passActifs}</p>
            <p className="text-xs text-slate-500">
              {pass24h} Pass 24h, {pass48h} Pass 48h, {passAbonnement} Abonnement
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-teal-500 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pass gratuit
            </CardTitle>
            <Gift className="absolute right-6 top-6 h-5 w-5 text-teal-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{trialStats.totalUsersOnTrial}</p>
            <p className="text-xs text-slate-500">
              {trialStats.organisateursOnTrial} organisateurs, {trialStats.proprietairesOnTrial} propriétaires • {trialStats.totalClicksRemaining} clics restants
            </p>
          </CardContent>
        </Card>
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Taux de réponse propriétaires
            </CardTitle>
            <TrendingUp className="absolute right-6 top-6 h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">—</p>
            <p className="text-xs text-slate-500">À calculer</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demandes par jour (30 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <svg viewBox="0 0 300 120" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="demandesGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="rgb(59 130 246 / 0.3)" />
                    <stop offset="100%" stopColor="rgb(59 130 246 / 0)" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 ${120 - (demandesParJour[0]! / maxDemandes) * 100} ${demandesParJour
                    .map((v, i) => `L ${(i / 29) * 300} ${120 - (v / maxDemandes) * 100}`)
                    .join(" ")} L 300 120 L 0 120 Z`}
                  fill="url(#demandesGrad)"
                />
                <path
                  d={`M 0 ${120 - (demandesParJour[0]! / maxDemandes) * 100} ${demandesParJour
                    .map((v, i) => `L ${(i / 29) * 300} ${120 - (v / maxDemandes) * 100}`)
                    .join(" ")}`}
                  fill="none"
                  stroke="rgb(59 130 246)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Jour 1</span>
              <span>Jour 30</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Revenus par jour (30 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex h-48 items-center justify-center text-sm text-slate-500">
              À configurer (Stripe)
            </p>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Jour 1</span>
              <span>Jour 30</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dernières annonces soumises</CardTitle>
            <Link href="/admin/annonces-a-valider">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentSalles?.length ? (
              <p className="text-sm text-slate-500">Aucune annonce en attente</p>
            ) : (
              <ul className="space-y-3">
                {recentSalles.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-1 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-black">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.city} • {formatAgo(s.created_at)}</p>
                    </div>
                    <form action={validateSalleFormAction} className="shrink-0">
                      <input type="hidden" name="salleId" value={s.id} />
                      <input type="hidden" name="status" value="approved" />
                      <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600">
                        Valider
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Paiements récents</CardTitle>
            <Link href="/admin/paiements">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!paidPayments.length ? (
              <p className="text-sm text-slate-500">Aucun paiement récent</p>
            ) : (
              <ul className="space-y-3">
                {paidPayments.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                  >
                    <div>
                      <p className="font-medium text-black">
                        {(p.amount ?? 0) / 100} €
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.product_type === "pass_24h" ? "Pass 24h" : p.product_type === "pass_48h" ? "Pass 48h" : "Abonnement"} • {formatAgo(p.created_at)}
                      </p>
                    </div>
                    <Link href={`/admin/paiements?paymentId=${p.id}`}>
                      <Button variant="ghost" size="sm">
                        Voir
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Nouveaux utilisateurs</CardTitle>
            <Link href="/admin/utilisateurs">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentProfiles?.length ? (
              <p className="text-sm text-slate-500">Aucun utilisateur récent</p>
            ) : (
              <ul className="space-y-4">
                {recentProfiles.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                      {(p.full_name || p.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-black">
                        {p.full_name || "—"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{p.email}</p>
                    </div>
                    <span className="text-xs text-slate-500">{getRoleLabel(p.user_type)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
