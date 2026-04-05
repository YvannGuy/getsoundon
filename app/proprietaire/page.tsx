import Image from "next/image";
import Link from "next/link";
import { AddSalleAutoOpen } from "@/components/proprietaire/add-salle-modal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, Inbox, LayoutGrid } from "lucide-react";

import { ConnectLoginButton } from "@/components/paiement/connect-login-button";
import { ConnectOnboardingButton } from "@/components/paiement/connect-onboarding-button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type ListingImageRow = { url: string; is_cover?: boolean; position?: number };

function pickCoverUrl(images: ListingImageRow[] | null | undefined): string {
  if (!images?.length) return "/img.png";
  const cover = images.find((i) => i.is_cover);
  if (cover?.url) return cover.url;
  return [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? "/img.png";
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

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
  const since30Iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: profile }, { data: listingsData }, { data: bookings30 }, { data: recentBookings }] =
    await Promise.all([
      supabase.from("profiles").select("stripe_account_id, first_name, full_name").eq("id", user.id).single(),
      admin
        .from("gs_listings")
        .select("id, title, location, is_active, created_at, gs_listing_images ( url, is_cover, position )")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("gs_bookings")
        .select("total_price, provider_net_eur")
        .eq("provider_id", user.id)
        .not("stripe_payment_intent_id", "is", null)
        .gte("created_at", since30Iso),
      admin
        .from("gs_bookings")
        .select("id, total_price, status, created_at, stripe_payment_intent_id")
        .eq("provider_id", user.id)
        .not("stripe_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const listings = (listingsData ?? []) as Array<{
    id: string;
    title: string;
    location: string | null;
    is_active: boolean | null;
    created_at: string;
    gs_listing_images: ListingImageRow[] | null;
  }>;

  const revenu30 = (bookings30 ?? []).reduce((sum, b) => {
    const row = b as { total_price?: number | string; provider_net_eur?: number | string | null };
    const fromCol = row.provider_net_eur != null && row.provider_net_eur !== "" ? Number(row.provider_net_eur) : NaN;
    if (Number.isFinite(fromCol) && fromCol > 0) return sum + fromCol;
    const gross = Number(row.total_price ?? 0);
    try {
      return sum + computeGsBookingPaymentSplit(gross).providerNetEur;
    } catch {
      return sum;
    }
  }, 0);
  const annoncesCount = listings.length;
  const annoncesActives = listings.filter((l) => l.is_active === true).length;

  const metrics = [
    {
      label: "Annonces catalogue",
      value: String(annoncesCount),
      icon: LayoutGrid,
      color: "text-black",
      bgColor: "bg-gs-orange/10",
    },
    {
      label: "Visibles sur le catalogue",
      value: String(annoncesActives),
      icon: Inbox,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      label: "Volume net prestataire (30 j., après commission)",
      value: `${revenu30.toFixed(0)} €`,
      icon: Banknote,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <AddSalleAutoOpen initialOpen={openAddAnnonce} />
      <div className="mb-8">
        <h1 className="font-landing-heading text-2xl font-bold text-gs-dark">Prestataire · Tableau de bord</h1>
        <p className="font-landing-body mt-1 text-slate-600">Annonces catalogue, réservations matériel et paiements</p>
      </div>

      <Card id="recevoir-paiements" className="mt-6 border-0 shadow-sm scroll-mt-24">
        <CardContent className="p-5">
          {(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Banknote className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Paiements activés</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Gérez vos paiements et vos transferts depuis votre espace Stripe.
                  </p>
                </div>
              </div>
              <ConnectLoginButton hasStripeAccount={true} className="shrink-0">
                Ouvrir l&apos;espace Stripe
              </ConnectLoginButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gs-orange/10">
                  <Banknote className="h-6 w-6 text-gs-orange" />
                </div>
                <div>
                  <p className="font-semibold text-black">Recevoir les paiements</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Pour encaisser les réservations catalogue, activez Stripe Connect.
                  </p>
                </div>
              </div>
              <ConnectOnboardingButton className="shrink-0 bg-gs-orange hover:brightness-95">
                Activer les paiements
              </ConnectOnboardingButton>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bgColor}`}>
                  <Icon className={`h-6 w-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black">{m.value}</p>
                  <p className="text-sm text-slate-500">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-landing-heading text-lg text-gs-dark">Mes annonces</CardTitle>
            <Link href="/proprietaire/annonces" className="text-sm font-medium text-black hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <Inbox className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-slate-500">Aucune annonce pour le moment</p>
                <Link
                  href="/proprietaire/ajouter-annonce"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-gs-orange px-3 text-sm font-medium text-white transition hover:brightness-95"
                >
                  Ajouter une annonce
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {listings.slice(0, 4).map((l) => (
                  <div key={l.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="relative h-32">
                      <Image src={pickCoverUrl(l.gs_listing_images)} alt={l.title} fill className="object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-black">{l.title}</p>
                      <p className="text-sm text-slate-500">{l.location ?? "—"}</p>
                      <span
                        className={`mt-2 inline-block text-sm font-medium ${
                          l.is_active ? "text-emerald-600" : "text-slate-500"
                        }`}
                      >
                        {l.is_active ? "Visible catalogue" : "Masquée"}
                      </span>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/proprietaire/materiel/listing/${l.id}/reglages`} className="flex-1">
                          <Button size="sm" className="w-full bg-gs-orange hover:brightness-95">
                            Réglages
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-landing-heading text-lg text-gs-dark">Dernières réservations payées</CardTitle>
            <Link href="/proprietaire/materiel" className="text-sm font-medium text-black hover:underline">
              Réservations →
            </Link>
          </CardHeader>
          <CardContent>
            {(recentBookings ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <Banknote className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-slate-500">Aucune réservation payée récente</p>
                <Link href="/proprietaire/materiel" className="mt-3">
                  <Button size="sm" className="bg-gs-orange hover:brightness-95">
                    Ouvrir les réservations matériel
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentBookings ?? []).map((b) => {
                  const row = b as { id: string; total_price?: number; status?: string; created_at: string };
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-black">
                          {BOOKING_STATUS_LABEL[row.status ?? ""] ?? row.status ?? "—"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(row.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-black">{Number(row.total_price ?? 0)} €</p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/proprietaire/paiement"
                  className="mt-2 block text-center text-sm font-medium text-gs-orange hover:underline"
                >
                  Paiements & Stripe →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-landing-heading text-lg text-gs-dark">Réservations matériel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="max-w-md text-slate-600">
              Demandes, check-in/out, cautions, incidents et messagerie pour vos réservations catalogue.
            </p>
            <Link
              href="/proprietaire/materiel"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-gs-orange px-4 text-sm font-medium text-white transition hover:brightness-95"
            >
              Ouvrir les réservations matériel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
