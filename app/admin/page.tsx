import Link from "next/link";
import { Building2, Clock, Euro, Mail, TrendingUp, UserCheck, Users } from "lucide-react";

import { validateSalleFormAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

const OWNER_RESPONDED_STATUSES = new Set(["accepted", "refused", "reschedule_proposed"]);

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingCount },
    { count: activeCount },
    { count: visites7jCount },
    { data: visites30j },
    { data: recentSalles },
    { data: recentProfiles },
    { data: reservationPayments },
    { count: ownersCount },
    { count: seekersCount },
    { data: approvedSallesOwners },
    { data: recentVisitsRows },
  ] = await Promise.all([
    supabase.from("salles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("salles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("demandes_visite").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase
      .from("demandes_visite")
      .select("id, status, seeker_id, created_at")
      .gte("created_at", monthAgo)
      .order("created_at", { ascending: true }),
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
    supabase
      .from("payments")
      .select("id, user_id, offer_id, amount, status, created_at")
      .eq("product_type", "reservation")
      .in("status", ["paid", "active"])
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "owner"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "seeker"),
    supabase.from("salles").select("owner_id").eq("status", "approved"),
    supabase
      .from("demandes_visite")
      .select("id, salle_id, seeker_id, status, date_visite, heure_debut, heure_fin, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const visites30 = visites30j ?? [];
  const visites7 = visites7jCount ?? 0;
  const avgVisitesPerDay = visites7 > 0 ? Math.round((visites7 / 7) * 10) / 10 : 0;
  const responded30 = visites30.filter((v) => OWNER_RESPONDED_STATUSES.has(v.status ?? "")).length;
  const accepted30 = visites30.filter((v) => v.status === "accepted").length;
  const ownerResponseRate30 = visites30.length > 0 ? Math.round((responded30 / visites30.length) * 100) : 0;
  const visitAcceptRate30 = visites30.length > 0 ? Math.round((accepted30 / visites30.length) * 100) : 0;

  const demandesParJour = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dayStart = d.toISOString().slice(0, 10);
    return visites30.filter((x) => x.created_at?.startsWith(dayStart)).length;
  });
  const maxDemandes = Math.max(...demandesParJour, 1);

  const payments = reservationPayments ?? [];
  const payments30 = payments.filter((p) => new Date(p.created_at) >= new Date(monthAgo));
  const revenue30 = payments30.reduce((s, p) => s + (p.amount ?? 0), 0);
  const reservationsPaid30 = payments30.length;

  const ownersWithActiveListings = new Set(
    (approvedSallesOwners ?? [])
      .map((s) => s.owner_id)
      .filter(Boolean)
  ).size;

  const seekersActifs30 = new Set(
    visites30
      .map((v) => v.seeker_id)
      .filter(Boolean)
  ).size;

  const recentVisits = recentVisitsRows ?? [];
  const recentVisitSalleIds = [...new Set(recentVisits.map((v) => v.salle_id).filter(Boolean))];
  const recentVisitSeekerIds = [...new Set(recentVisits.map((v) => v.seeker_id).filter(Boolean))];
  const [{ data: recentVisitSalles }, { data: recentVisitSeekers }] = await Promise.all([
    recentVisitSalleIds.length > 0
      ? supabase.from("salles").select("id, name, city").in("id", recentVisitSalleIds)
      : { data: [] },
    recentVisitSeekerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", recentVisitSeekerIds)
      : { data: [] },
  ]);
  const recentVisitSalleMap = new Map((recentVisitSalles ?? []).map((s) => [s.id, s]));
  const recentVisitSeekerMap = new Map((recentVisitSeekers ?? []).map((p) => [p.id, p]));

  const paymentOfferIds = [...new Set(payments.slice(0, 5).map((p) => p.offer_id).filter(Boolean))];
  const { data: paymentOffers } =
    paymentOfferIds.length > 0
      ? await supabase.from("offers").select("id, owner_id").in("id", paymentOfferIds)
      : { data: [] };
  const ownerIdsForPayments = [...new Set((paymentOffers ?? []).map((o) => o.owner_id).filter(Boolean))];
  const { data: paymentOwners } =
    ownerIdsForPayments.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIdsForPayments)
      : { data: [] };
  const paymentOfferMap = new Map((paymentOffers ?? []).map((o) => [o.id, o]));
  const paymentOwnerMap = new Map((paymentOwners ?? []).map((p) => [p.id, p]));

  const formatAgo = (date: string) => {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    const j = Math.floor(h / 24);
    return `Il y a ${j}j`;
  };

  const getRoleLabel = (userType: string | null) => {
    if (userType === "owner") return "Propriétaire";
    if (userType === "seeker") return "Locataire";
    return "—";
  };

  const getVisitStatusLabel = (status: string | null) => {
    if (status === "accepted") return "Acceptée";
    if (status === "refused") return "Refusée";
    if (status === "reschedule_proposed") return "Reprogrammation proposée";
    return "En attente";
  };

  return (
    <div className="space-y-6 p-4 pb-24 md:space-y-8 md:p-8 md:pb-8">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-black md:text-2xl">Dashboard admin</h1>
        <p className="text-sm text-slate-600">
          Vue plateforme harmonisée avec les parcours locataire et propriétaire.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Annonces en attente</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{pendingCount ?? 0}</p>
            <p className="text-xs text-amber-600">Action requise</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Demandes de visite (7j)</CardTitle>
            <Mail className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{visites7}</p>
            <p className="text-xs text-slate-500">{avgVisitesPerDay} / jour en moyenne</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Revenu réservations (30j)</CardTitle>
            <Euro className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">
              {(revenue30 / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-slate-500">{reservationsPaid30} réservations payées</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Taux de réponse owner (30j)</CardTitle>
            <UserCheck className="h-5 w-5 text-sky-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{ownerResponseRate30}%</p>
            <p className="text-xs text-slate-500">{responded30} / {visites30.length} demandes traitées</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Annonces actives</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{activeCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Locataires actifs (30j)</CardTitle>
            <Users className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{seekersActifs30}</p>
            <p className="text-xs text-slate-500">sur {seekersCount ?? 0} locataires inscrits</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Owners avec annonce active</CardTitle>
            <Building2 className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{ownersWithActiveListings}</p>
            <p className="text-xs text-slate-500">sur {ownersCount ?? 0} propriétaires inscrits</p>
          </CardContent>
        </Card>

        <Card className="relative bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Taux d&apos;acceptation visite (30j)</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{visitAcceptRate30}%</p>
            <p className="text-xs text-slate-500">{accepted30} demandes acceptées</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demandes de visite par jour (30 derniers jours)</CardTitle>
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
            <CardTitle className="text-base">Traitement des visites (30 jours)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: visites30.length > 0 ? `${Math.min(100, Math.round((accepted30 / visites30.length) * 100))}%` : "0%",
                }}
              />
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-sky-500"
                style={{
                  width: visites30.length > 0 ? `${Math.min(100, Math.round((responded30 / visites30.length) * 100))}%` : "0%",
                }}
              />
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p>Acceptées: {accepted30}</p>
              <p>Répondues (acceptées + refusées + reproposées): {responded30}</p>
              <p>Total demandes: {visites30.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Demandes de visite récentes</CardTitle>
            <Link href="/admin/demandes">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentVisits.length ? (
              <p className="text-sm text-slate-500">Aucune demande récente</p>
            ) : (
              <ul className="space-y-3">
                {recentVisits.map((v) => {
                  const salle = v.salle_id ? recentVisitSalleMap.get(v.salle_id) : undefined;
                  const seeker = v.seeker_id ? recentVisitSeekerMap.get(v.seeker_id) : undefined;
                  const dateLabel = v.date_visite ? new Date(v.date_visite).toLocaleDateString("fr-FR") : "Date non définie";
                  return (
                    <li key={v.id} className="rounded-lg border border-slate-100 p-3">
                      <p className="font-medium text-black">{salle?.name ?? "Salle"}</p>
                      <p className="text-xs text-slate-500">
                        {seeker?.full_name || seeker?.email || "Locataire"} • {dateLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {getVisitStatusLabel(v.status)} • {formatAgo(v.created_at)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Paiements réservation récents</CardTitle>
            <Link href="/admin/paiements">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!payments.length ? (
              <p className="text-sm text-slate-500">Aucun paiement réservation récent</p>
            ) : (
              <ul className="space-y-3">
                {payments.slice(0, 5).map((p) => {
                  const offer = p.offer_id ? paymentOfferMap.get(p.offer_id) : undefined;
                  const owner = offer?.owner_id ? paymentOwnerMap.get(offer.owner_id) : undefined;
                  return (
                    <li key={p.id} className="rounded-lg border border-slate-100 p-3">
                      <p className="font-medium text-black">
                        {((p.amount ?? 0) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                      </p>
                      <p className="text-xs text-slate-500">
                        Proprio: {owner?.full_name || owner?.email || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{formatAgo(p.created_at)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
  );
}
