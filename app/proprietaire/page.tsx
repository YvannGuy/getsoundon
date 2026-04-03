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
import { WelcomeOnboardingBanner } from "@/components/dashboard/welcome-onboarding-banner";
import { createClient } from "@/lib/supabase/server";

const STATUT_SALLE_LABEL: Record<string, string> = {
  approved: "Active",
  pending: "En validation",
  rejected: "Refusée",
};

const STATUT_SALLE_COLOR: Record<string, string> = {
  approved: "text-emerald-600",
  pending: "text-amber-600",
  rejected: "text-red-600",
};

const PRODUCT_LABEL: Record<string, string> = {
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement",
  reservation: "Réservation",
  autre: "Autre",
};

const STATUS_PAIEMENT_LABEL: Record<string, string> = {
  paid: "Payé",
  pending: "En cours",
  active: "Actif",
  failed: "Échoué",
  refunded: "Remboursé",
  canceled: "Annulé",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProprietaireDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const openAddAnnonce = params?.openAddAnnonce === "1";
  /** PDF d’onboarding — renommer le fichier dans /public/pdf quand l’asset GetSoundOn sera prêt */
  const onboardingGuideUrl = "/pdf/salledeculte.com_bien_debuter.pdf";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const since30Iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: sallesData }, { data: profile }, paidOffersRes] = await Promise.all([
    supabase
      .from("salles")
      .select("id, slug, name, city, images, status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("stripe_account_id, first_name, full_name").eq("id", user.id).single(),
    supabase.from("offers").select("id").eq("owner_id", user.id).eq("status", "paid"),
  ]);

  const salles = sallesData ?? [];
  const salleIds = salles.map((s) => s.id);
  const paidOffersData = paidOffersRes.error ? [] : (paidOffersRes.data ?? []);
  const paidOfferIds = paidOffersData.map((o) => (o as { id: string }).id);

  const [recentPayRes, payments30Res] =
    paidOfferIds.length > 0
      ? await Promise.all([
          supabase
            .from("payments")
            .select("id, product_type, amount, status, created_at")
            .in("offer_id", paidOfferIds)
            .eq("product_type", "reservation")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("payments")
            .select("amount, status")
            .in("offer_id", paidOfferIds)
            .eq("product_type", "reservation")
            .in("status", ["paid", "active"])
            .gte("created_at", since30Iso),
        ])
      : [{ data: null, error: null }, { data: null, error: null }];
  const recentPayments = recentPayRes.error ? [] : (recentPayRes.data ?? []);
  const payments30 = payments30Res.error ? [] : (payments30Res.data ?? []);
  const revenuEncaisse30 = (payments30 ?? []).reduce(
    (sum, p) => sum + Number((p as { amount?: number }).amount ?? 0),
    0
  );

  const annoncesCount = salles.length;
  const annoncesActives = salles.filter((s) => s.status === "approved").length;

  const metrics = [
    {
      label: "Annonces (toutes)",
      value: String(annoncesCount),
      icon: LayoutGrid,
      color: "text-black",
      bgColor: "bg-gs-orange/10",
    },
    {
      label: "Annonces actives",
      value: String(annoncesActives),
      icon: Inbox,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      label: "Revenu encaissé (30j, réservations legacy)",
      value: `${(revenuEncaisse30 / 100).toFixed(0)} €`,
      icon: Banknote,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AddSalleAutoOpen initialOpen={openAddAnnonce} />
      <div className="mb-8">
        <h1 className="font-landing-heading text-2xl font-bold text-gs-dark">Prestataire · Tableau de bord</h1>
        <p className="font-landing-body mt-1 text-slate-600">Gérez vos annonces, demandes et réservations de matériel</p>
      </div>

      <WelcomeOnboardingBanner
        userId={user.id}
        dashboard="owner"
        firstName={
          (profile as { first_name?: string | null } | null)?.first_name ??
          ((profile as { full_name?: string | null } | null)?.full_name
            ?.trim()
            .split(/\s+/)
            .filter(Boolean)[0] ?? null)
        }
        videoUrl="https://www.youtube.com/watch?v=ysz5S6PUM-U"
        videoDurationLabel="4:07"
        tourUrl={onboardingGuideUrl}
      />

      {/* Recevoir les paiements / Paiements activés */}
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
                    Pour recevoir les paiements sur GetSoundOn, vous devez activer et configurer votre espace Stripe
                    (compte connecté).
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
            <CardTitle className="font-landing-heading text-lg text-gs-dark">Ajouter une annonce</CardTitle>
            <Link href="/proprietaire/annonces" className="text-sm font-medium text-black hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {salles.length === 0 ? (
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
                {salles.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="relative h-32">
                      <Image
                        src={Array.isArray(s.images) && s.images[0] ? String(s.images[0]) : "/img.png"}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-black">{s.name}</p>
                      <p className="text-sm text-slate-500">{s.city}</p>
                      <span className={`mt-2 inline-block text-sm font-medium ${STATUT_SALLE_COLOR[s.status] ?? "text-slate-600"}`}>
                        • {STATUT_SALLE_LABEL[s.status] ?? s.status}
                      </span>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/proprietaire/annonces?edit=${s.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-gs-orange hover:brightness-95">
                            Gérer l&apos;annonce
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
            <CardTitle className="font-landing-heading text-lg text-gs-dark">Paiements</CardTitle>
            <Link href="/proprietaire/paiement" className="text-sm font-medium text-black hover:underline">
              Voir →
            </Link>
          </CardHeader>
          <CardContent>
            {(recentPayments ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <Banknote className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-slate-500">Aucun paiement pour le moment</p>
                <Link href="/proprietaire/paiement" className="mt-3">
                  <Button size="sm" className="bg-gs-orange hover:brightness-95">
                    Accéder à l&apos;espace paiement
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentPayments ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-black">
                        {PRODUCT_LABEL[(p as { product_type?: string }).product_type ?? ""] ?? (p as { product_type?: string }).product_type ?? "—"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date((p as { created_at: string }).created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-black">
                        {(((p as { amount?: number }).amount ?? 0) / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-emerald-600">
                        {STATUS_PAIEMENT_LABEL[(p as { status?: string }).status ?? ""] ?? (p as { status?: string }).status}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/proprietaire/paiement" className="mt-2 block text-center text-sm font-medium text-gs-orange hover:underline">
                  Voir tout l&apos;historique →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-landing-heading text-lg text-gs-dark">Locations matériel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="max-w-md text-slate-600">
              Gérez les réservations et la messagerie liées au <strong>matériel</strong> depuis l&apos;espace dédié.
            </p>
            <Link
              href="/proprietaire/materiel"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-gs-orange px-4 text-sm font-medium text-white transition hover:brightness-95"
            >
              Ouvrir les locations matériel
            </Link>
            <p className="mt-4 max-w-lg text-xs text-slate-400">
              Un dossier historique (visites lieux / ancien calendrier) peut exister : il reste accessible en URL
              directe pour le support ; il n&apos;est plus mis en avant dans le produit.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
