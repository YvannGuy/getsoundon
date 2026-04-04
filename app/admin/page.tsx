import Link from "next/link";
import { Package, Users, Headphones, Ban, Settings, FileText, ClipboardList, Megaphone, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";

function toNumber(n: number | string | null | undefined): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [
    { count: newUsers7 },
    { count: openIncidents },
    { count: pendingCancels },
    { count: activeListings },
    { data: bookings30Raw },
    { data: payoutsWaitingRaw },
    { count: ownersWithoutStripe },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("gs_bookings").select("id", { count: "exact", head: true }).eq("incident_status", "open"),
    admin
      .from("gs_booking_cancellation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.from("gs_listings").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("gs_bookings")
      .select("checkout_total_eur, total_price, service_fee_eur", { count: "exact" })
      .gte("created_at", thirtyDaysAgo)
      .not("stripe_payment_intent_id", "is", null),
    admin
      .from("gs_bookings")
      .select("id, provider_net_eur, checkout_total_eur, total_price, incident_status, payout_status, end_date")
      .not("stripe_payment_intent_id", "is", null)
      .or("payout_status.is.null,payout_status.eq.pending,payout_status.eq.scheduled")
      .or("incident_status.is.null,incident_status.eq.dismissed,incident_status.eq.resolved"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_type", "owner")
      .is("stripe_account_id", null),
  ]);

  // Volume & commission 30j
  const bookings30 = (bookings30Raw ?? []) as Array<{
    checkout_total_eur: number | string | null;
    total_price: number | string | null;
    service_fee_eur: number | string | null;
  }>;
  const volume30 = bookings30.reduce((sum, b) => sum + toNumber(b.checkout_total_eur ?? b.total_price), 0);
  const commission30 = bookings30.reduce((sum, b) => sum + toNumber(b.service_fee_eur), 0);

  // Réservations en cours : statut pending/accepted et fin >= aujourd'hui
  const { count: bookingsInProgress } = await admin
    .from("gs_bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "accepted"])
    .gte("end_date", nowIso);

  // Gains en attente (payout pending/scheduled/null et pas d’incident open)
  const payoutsWaiting = (payoutsWaitingRaw ?? []) as Array<{
    provider_net_eur: number | string | null;
    checkout_total_eur: number | string | null;
    total_price: number | string | null;
  }>;
  const gainsAttente = payoutsWaiting.reduce((sum, b) => {
    if (b.provider_net_eur != null && b.provider_net_eur !== "") return sum + toNumber(b.provider_net_eur);
    const gross = toNumber(b.checkout_total_eur ?? b.total_price);
    return sum + computeGsBookingPaymentSplit(gross).providerNetEur;
  }, 0);

  let conciergeNew = 0;
  try {
    const { count } = await admin
      .from("concierge_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    conciergeNew = count ?? 0;
  } catch {
    /* optional table */
  }

  const links = [
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, hint: "Comptes et suspension" },
    { href: "/admin/annonces-materiel", label: "Annonces", icon: Megaphone, hint: "Catalogue matériel" },
    { href: "/admin/reservations-materiel", label: "Réservations", icon: ClipboardList, hint: "Vue centrale bookings" },
    {
      href: "/admin/incidents-materiel",
      label: "Incidents matériel",
      icon: Package,
      hint: "Litiges sur réservations matériel",
    },
    { href: "/admin/materiel-annulations", label: "Annulations matériel", icon: Ban, hint: "Demandes locataires" },
    { href: "/admin/factures", label: "Factures", icon: FileText, hint: "PDF réservations matériel" },
    { href: "/admin/paiements-virements", label: "Paiements & virements", icon: Wallet, hint: "Flux financiers prestataires" },
    { href: "/admin/parametres", label: "Paramètres", icon: Settings, hint: "Plateforme" },
  ];

  return (
    <div className="space-y-6 p-4 pb-24 md:space-y-8 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Dashboard admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pilotage GetSoundOn : utilisateurs, annonces, réservations, incidents/annulations, factures et flux financiers.
          Stripe Dashboard reste la source de vérité pour les détails Connect.
        </p>
      </div>

      {/* KPI Activité / business */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activité / business</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Annonces actives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{activeListings ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Réservations en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{bookingsInProgress ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Volume brut (30 j.)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{volume30.toFixed(2)} €</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Commission plateforme (30 j.)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{commission30.toFixed(2)} €</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Ops / risque */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ops / risque</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Incidents ouverts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{openIncidents ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Annulations en attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{pendingCancels ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Virements en attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{gainsAttente.toFixed(2)} €</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Prestataires sans paiements activés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black">{ownersWithoutStripe ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">À traiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              Incidents ouverts : <span className="font-semibold text-black">{openIncidents ?? 0}</span>
            </p>
            <p>
              Annulations en attente : <span className="font-semibold text-black">{pendingCancels ?? 0}</span>
            </p>
            <p>
              Virements en attente : <span className="font-semibold text-black">{gainsAttente.toFixed(2)} €</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Accès rapides</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map(({ href, label, icon: Icon, hint }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <Icon className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-semibold text-black">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
