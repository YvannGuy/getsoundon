import Link from "next/link";
import { AddSalleAutoOpen } from "@/components/proprietaire/add-salle-modal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  LayoutGrid,
  Package,
  PlusCircle,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";

import { ConnectLoginButton } from "@/components/paiement/connect-login-button";
import { ConnectOnboardingButton } from "@/components/paiement/connect-onboarding-button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

function providerNetEurFromRow(row: {
  total_price?: number | string;
  provider_net_eur?: number | string | null;
}): number {
  const fromCol =
    row.provider_net_eur != null && row.provider_net_eur !== ""
      ? Number(row.provider_net_eur)
      : NaN;
  if (Number.isFinite(fromCol) && fromCol > 0) return fromCol;
  const gross = Number(row.total_price ?? 0);
  try {
    return computeGsBookingPaymentSplit(gross).providerNetEur;
  } catch {
    return 0;
  }
}

export default async function ProprietaireDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const openAddAnnonce = params?.openAddAnnonce === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const endDateSince = new Date();
  endDateSince.setDate(endDateSince.getDate() - 30);
  const endDateSinceStr = endDateSince.toISOString().slice(0, 10);

  const [
    { data: profile },
    { count: pendingCount },
    { count: acceptedCount },
    { data: completed30Rows },
    { data: payoutPendingRows },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from("profiles").select("stripe_account_id, first_name, full_name").eq("id", user.id).single(),
    admin
      .from("gs_bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", user.id)
      .eq("status", "pending")
      .not("stripe_payment_intent_id", "is", null),
    admin
      .from("gs_bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", user.id)
      .eq("status", "accepted")
      .not("stripe_payment_intent_id", "is", null),
    admin
      .from("gs_bookings")
      .select("total_price, provider_net_eur")
      .eq("provider_id", user.id)
      .eq("status", "completed")
      .gte("end_date", endDateSinceStr),
    admin
      .from("gs_bookings")
      .select("provider_net_eur, total_price, payout_due_at")
      .eq("provider_id", user.id)
      .not("stripe_payment_intent_id", "is", null)
      .in("status", ["accepted", "completed"])
      .in("payout_status", ["pending", "scheduled"])
      .limit(500),
    admin
      .from("gs_bookings")
      .select("id, listing_id, total_price, status, created_at")
      .eq("provider_id", user.id)
      .not("stripe_payment_intent_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const annoncesActives =
    (
      await admin
        .from("gs_listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_active", true)
    ).count ?? 0;

  const completed30 = (completed30Rows ?? []) as Array<{
    total_price?: number | string;
    provider_net_eur?: number | string | null;
  }>;
  const completed30Count = completed30.length;
  const netTermine30 = completed30.reduce((s, b) => s + providerNetEurFromRow(b), 0);

  const payoutRows = (payoutPendingRows ?? []) as Array<{
    provider_net_eur?: number | string | null;
    total_price?: number | string;
    payout_due_at: string | null;
  }>;
  let gainsEnAttente = 0;
  let prochainVirement: Date | null = null;
  const nowMs = Date.now();
  for (const row of payoutRows) {
    gainsEnAttente += providerNetEurFromRow(row);
    if (row.payout_due_at) {
      const d = new Date(row.payout_due_at);
      if (!Number.isNaN(d.getTime()) && d.getTime() > nowMs) {
        if (!prochainVirement || d.getTime() < prochainVirement.getTime()) {
          prochainVirement = d;
        }
      }
    }
  }

  const recent = (recentBookings ?? []) as Array<{
    id: string;
    listing_id: string;
    total_price?: number;
    status?: string;
    created_at: string;
  }>;
  const listingIds = [...new Set(recent.map((b) => b.listing_id))];
  let listingTitles: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await admin
      .from("gs_listings")
      .select("id, title")
      .in("id", listingIds);
    for (const l of (listings ?? []) as Array<{ id: string; title: string }>) {
      listingTitles[l.id] = l.title;
    }
  }

  const hasStripe = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;
  const demandesEnAttente = pendingCount ?? 0;
  const locationsEnCours = acceptedCount ?? 0;

  const kpis = [
    {
      label: "Annonces en ligne",
      value: String(annoncesActives),
      icon: LayoutGrid,
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
    },
    {
      label: "Demandes à répondre",
      value: String(demandesEnAttente),
      icon: Clock,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
    },
    {
      label: "Locations confirmées",
      value: String(locationsEnCours),
      icon: Package,
      color: "text-sky-700",
      bgColor: "bg-sky-100",
    },
    {
      label: "Locations terminées · 30 j.",
      value: String(completed30Count),
      sub: `Net ~ ${Math.round(netTermine30)} €`,
      icon: CheckCircle2,
      color: "text-slate-700",
      bgColor: "bg-slate-100",
    },
    {
      label: "Gains en attente de virement",
      value: `${Math.round(gainsEnAttente)} €`,
      sub: prochainVirement
        ? `Prochain : ${format(prochainVirement, "d MMM yyyy", { locale: fr })}`
        : gainsEnAttente > 0
          ? "Échéance selon fin de location"
          : undefined,
      icon: Wallet,
      color: "text-amber-800",
      bgColor: "bg-amber-50",
    },
  ];

  const quickActions = [
    {
      title: "Ajouter une annonce",
      description: "Publier du matériel sur le catalogue",
      href: "/proprietaire/ajouter-annonce",
      icon: PlusCircle,
    },
    {
      title: "Mes annonces",
      description: "Statut, visibilité, réglages",
      href: "/proprietaire/annonces",
      icon: LayoutGrid,
    },
    {
      title: "Mes commandes",
      description: "Liste, calendrier, check-in / check-out",
      href: "/proprietaire/commandes",
      icon: Package,
    },
    {
      title: "Livraisons & retraits",
      description: "Logistique des locations",
      href: "/proprietaire/logistique",
      icon: Truck,
    },
    {
      title: "Paiements",
      description: "Stripe Connect, moyens de paiement",
      href: "/proprietaire/paiement",
      icon: CreditCard,
    },
    {
      title: "Factures",
      description: "PDF générés automatiquement",
      href: "/proprietaire/contrat",
      icon: Receipt,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <AddSalleAutoOpen initialOpen={openAddAnnonce} />

      {/* 1. En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Tableau de bord</h1>
        <p className="mt-1 text-slate-500">
          Annonces catalogue, réservations reçues, paiements et factures.
        </p>
      </div>

      {/* 2. KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-3 p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${m.bgColor}`}>
                  <Icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums text-black">{m.value}</p>
                  <p className="text-sm text-slate-500">{m.label}</p>
                  {m.sub ? <p className="mt-1 text-xs text-slate-500">{m.sub}</p> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. À traiter */}
      {(demandesEnAttente > 0 || !hasStripe) && (
        <div className="mt-6 space-y-3">
          {demandesEnAttente > 0 ? (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-950">
                <span className="font-semibold">{demandesEnAttente}</span>{" "}
                {demandesEnAttente === 1
                  ? "demande de réservation attend votre réponse."
                  : "demandes de réservation attendent votre réponse."}
              </p>
              <Link
                href="/proprietaire/commandes?status=pending"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-gs-orange px-4 text-sm font-medium text-white transition hover:brightness-95"
              >
                Répondre aux demandes
              </Link>
            </div>
          ) : null}

          {!hasStripe ? (
            <div
              id="recevoir-paiements"
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gs-orange/10">
                  <Banknote className="h-5 w-5 text-gs-orange" />
                </div>
                <div>
                  <p className="font-semibold text-black">Activer les paiements</p>
                  <p className="text-sm text-slate-600">
                    Sans Stripe Connect, vous ne pouvez pas encaisser les réservations catalogue.
                  </p>
                </div>
              </div>
              <ConnectOnboardingButton className="shrink-0 bg-gs-orange hover:brightness-95">
                Configurer Stripe
              </ConnectOnboardingButton>
            </div>
          ) : null}
        </div>
      )}

      {/* Stripe connecté : accès rapide (hors grille KPI) */}
      {hasStripe ? (
        <Card className="mt-6 border-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-black">Paiements activés</p>
                <p className="text-sm text-slate-600">Virements et relevés dans votre espace Stripe.</p>
              </div>
            </div>
            <ConnectLoginButton hasStripeAccount={true} className="shrink-0">
              Ouvrir Stripe
            </ConnectLoginButton>
          </CardContent>
        </Card>
      ) : null}

      {/* 4. Actions rapides */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-black">Actions rapides</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} className="group block">
                <Card className="h-full border-0 shadow-sm transition group-hover:shadow-md">
                  <CardContent className="flex gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-black">{a.title}</p>
                      <p className="text-sm text-slate-500">{a.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Activité récente (léger) */}
      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Dernière activité</CardTitle>
          <Link
            href="/proprietaire/commandes"
            className="text-sm font-medium text-black hover:underline"
          >
            Tout voir →
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Aucune réservation payée pour l’instant. Les nouvelles commandes apparaîtront ici.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/proprietaire/materiel/${row.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 transition hover:bg-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-black">
                        {listingTitles[row.listing_id] ?? "Location catalogue"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {BOOKING_STATUS_LABEL[row.status ?? ""] ?? row.status ?? "—"} ·{" "}
                        {format(new Date(row.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-black">{Number(row.total_price ?? 0)} €</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
