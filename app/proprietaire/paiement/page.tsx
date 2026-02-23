import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, CreditCard, Crown, Gift, Infinity, Lock, Zap } from "lucide-react";

import { activateTrialAction, getTrialActivated } from "@/app/actions/trial";
import { getPaymentMethods } from "@/app/actions/stripe-portal";
import { getPlatformSettings } from "@/app/actions/admin-settings";
import { ConnectLoginButton } from "@/components/paiement/connect-login-button";
import { ConnectOnboardingButton } from "@/components/paiement/connect-onboarding-button";
import { PassCheckoutButton } from "@/components/pass-checkout-button";
import { PortalButton } from "@/components/paiement/portal-button";
import { TrialActivatedPopup } from "@/components/paiement/trial-activated-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBrowseAccess } from "@/lib/pass-utils";

const PRODUCT_LABEL: Record<string, string> = {
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement mensuel",
  reservation: "Réservation",
  autre: "Autre",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payé",
  pending: "En cours",
  failed: "Échoué",
  refunded: "Remboursé",
  active: "Actif",
  canceled: "Annulé",
};

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-600",
  pending: "text-amber-600",
  failed: "text-red-600",
  refunded: "text-slate-500",
  active: "text-emerald-600",
  canceled: "text-slate-500",
};

const CARD_BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  diners: "Diners",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export default async function ProprietairePaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const params = await searchParams;
  if (params.trial === "1") {
    await activateTrialAction();
  }

  const [settings, { data: payments }, { data: profile }, paymentMethods, browse, trialActivated, { data: receivedReservations }] =
    await Promise.all([
      getPlatformSettings(),
      supabase
        .from("payments")
        .select("id, product_type, amount, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("stripe_customer_id, stripe_account_id").eq("id", user.id).single(),
      getPaymentMethods(user.id),
      getOwnerBrowseAccess(user.id),
      getTrialActivated(user.id),
      (async () => {
        const adminSupabase = createAdminClient();
        const { data: paidOffers } = await adminSupabase
          .from("offers")
          .select("id")
          .eq("owner_id", user.id)
          .eq("status", "paid");
        const offerIds = (paidOffers ?? []).map((o) => (o as { id: string }).id);
        if (offerIds.length === 0) return { data: [] };
        const { data } = await adminSupabase
          .from("payments")
          .select("id, product_type, amount, status, created_at")
          .in("offer_id", offerIds)
          .eq("product_type", "reservation")
          .order("created_at", { ascending: false });
        return { data: data ?? [] };
      })(),
    ]);

  const pass = settings.pass;
  const isTrialActive = browse.freeUsed < browse.freeTotal && !browse.hasPaidPass;
  const trialJustActivated = params.trial === "1";

  const plans = [
    {
      id: "pass_24h" as const,
      name: "Pass 24h",
      description: "Consultez les annonces des autres propriétaires",
      price: pass.price_24h / 100,
      features: ["Accès aux annonces", "Recherche illimitée", "Support prioritaire"],
      icon: Zap,
      enabled: pass.pass_24h_enabled,
    },
    {
      id: "pass_48h" as const,
      name: "Pass 48h",
      description: "Consultez les annonces des autres propriétaires",
      price: pass.price_48h / 100,
      features: ["Accès aux annonces", "Recherche illimitée", "Support prioritaire", "Économie de 35%"],
      icon: Zap,
      highlighted: true,
      enabled: pass.pass_48h_enabled,
    },
    {
      id: "abonnement" as const,
      name: "Abonnement mensuel",
      description: "Accès illimité récurrent",
      price: pass.price_abonnement / 100,
      priceSuffix: "/mois",
      features: ["Accès aux annonces", "Recherche illimitée", "Support prioritaire", "Résiliation à tout moment"],
      icon: Infinity,
      enabled: pass.abonnement_enabled,
    },
  ].filter((p) => p.enabled);

  const recentPayments = (payments ?? []).slice(0, 5);
  const hasConnectAccount = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;
  const connectSuccess = params.connect === "success";
  const connectRefresh = params.connect === "refresh";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <TrialActivatedPopup
        show={!!trialJustActivated && isTrialActive}
        freeTotal={browse.freeTotal}
        userType="owner"
        basePath="/proprietaire/paiement"
      />
      <h1 className="text-2xl font-bold text-black">Paiement</h1>
      <p className="mt-2 text-slate-500">Gérez votre accès pour consulter les annonces des autres propriétaires</p>

      {trialJustActivated && isTrialActive && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
          <Gift className="h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Votre essai est activé !</p>
            <p className="mt-1 text-sm text-emerald-700">
              Vous disposez de {browse.freeTotal - browse.freeUsed} demande{browse.freeTotal - browse.freeUsed > 1 ? "s" : ""} pour découvrir les annonces des autres propriétaires.
            </p>
          </div>
        </div>
      )}

      {/* Mon accès */}
      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Mon accès
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!trialActivated ? (
            <div className="flex flex-col gap-4 rounded-xl border border-emerald-100 bg-[#F8FDF9] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#D9F7E0]">
                  <Crown className="h-6 w-6 text-[#189D52]" />
                </div>
                <div>
                  <p className="font-semibold text-black">Activez votre essai gratuit</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Bénéficiez de demandes gratuites pour découvrir les annonces des autres propriétaires
                  </p>
                </div>
              </div>
              <Link href="/proprietaire/paiement?trial=1" className="sm:ml-auto">
                <Button className="w-full sm:w-auto bg-[#1A3E92] hover:bg-[#15317a] font-semibold">
                  Activez mon essai gratuit
                </Button>
              </Link>
            </div>
          ) : isTrialActive ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <Gift className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-800">Essai actif</span>
                <p className="mt-0.5 text-sm text-emerald-700">
                  {browse.freeTotal - browse.freeUsed} demande{browse.freeTotal - browse.freeUsed > 1 ? "s" : ""} restante{browse.freeTotal - browse.freeUsed > 1 ? "s" : ""}
                </p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800">
                Essai
              </span>
            </div>
          ) : browse.hasPaidPass ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
              <Zap className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-800">Pass actif</span>
                <p className="mt-0.5 text-sm text-emerald-700">Vous pouvez consulter les annonces des autres propriétaires</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800">
                Actif
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">
              <Crown className="h-6 w-6 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold text-amber-800">Accès bloqué</span>
                <p className="mt-0.5 text-sm text-amber-700">
                  Vous n&apos;avez plus de demandes restantes. Choisissez un Pass pour consulter les annonces des autres propriétaires.
                </p>
              </div>
              <Link href="#pass-abonnements" className="ml-auto">
                <Button className="bg-[#213398] hover:bg-[#1a2980]">Voir les offres</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recevoir les paiements (Stripe Connect) */}
      <Card id="recevoir-paiements" className="mt-8 border-0 shadow-sm scroll-mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5" />
            Recevoir les paiements
          </CardTitle>
          <CardDescription>
            {hasConnectAccount
              ? "Envoyez des offres depuis la messagerie et recevez les paiements des organisateurs."
              : "Connectez votre compte bancaire pour recevoir les paiements des réservations (commission plateforme 10 %)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectSuccess && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <Banknote className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">Paiements activés !</p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Vous pouvez maintenant envoyer des offres aux organisateurs depuis la messagerie.
                </p>
              </div>
            </div>
          )}
          {connectRefresh && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm text-amber-800">
                Le formulaire a expiré ou est incomplet. Cliquez ci-dessous pour continuer l&apos;activation.
              </p>
            </div>
          )}
          {hasConnectAccount ? (
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
                Ouvrir mon espace Stripe
              </ConnectLoginButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#213398]/10">
                  <Banknote className="h-6 w-6 text-[#213398]" />
                </div>
                <div>
                  <p className="font-semibold text-black">Activez les paiements</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Connectez votre identité et votre IBAN pour recevoir les réservations. Stripe sécurise vos données.
                  </p>
                </div>
              </div>
              <ConnectOnboardingButton className="shrink-0 bg-[#213398] hover:bg-[#1a2980]">
                Activer les paiements
              </ConnectOnboardingButton>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pass & abonnements */}
      <h2 id="pass-abonnements" className="mt-10 text-lg font-semibold text-black">Pass & abonnements</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`relative flex h-full flex-col border-0 shadow-sm ${(plan as { highlighted?: boolean }).highlighted ? "ring-1 ring-[#213398]" : ""}`}
            >
              {(plan as { highlighted?: boolean }).highlighted && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#213398] px-3 py-0.5 text-xs font-medium text-white">
                  Offre recommandée
                </div>
              )}
              <CardHeader className="shrink-0 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0 text-black" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
                <p className="text-2xl font-bold tabular-nums text-black">
                  {plan.price} €
                  {plan.priceSuffix && (
                    <span className="ml-1 text-base font-normal text-slate-500">{plan.priceSuffix}</span>
                  )}
                </p>
                {plan.id === "abonnement" && (
                  <p className="mt-1 text-sm text-slate-500">90 € de l&apos;heure</p>
                )}
                <ul className="mt-4 min-h-[7.5rem] space-y-2 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="shrink-0 text-emerald-500">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <PassCheckoutButton
                    passType={plan.id}
                    returnBase="/proprietaire/paiement"
                    className={`w-full ${(plan as { highlighted?: boolean }).highlighted ? "bg-[#213398] hover:bg-[#1a2980]" : ""}`}
                  >
                    Choisir
                  </PassCheckoutButton>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Moyen de paiement */}
      <Card className="mt-10 border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Moyen de paiement
          </CardTitle>
          {profile?.stripe_customer_id && (
            <PortalButton hasStripeCustomer={true} variant="outline" size="sm" className="shrink-0">
              Gérer mes moyens de paiement
            </PortalButton>
          )}
        </CardHeader>
        <CardContent>
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                      <CreditCard className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-black">
                        {CARD_BRAND_LABEL[pm.brand] ?? pm.brand} •••• {pm.last4}
                      </p>
                      <p className="text-sm text-slate-500">
                        Expire {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <PortalButton hasStripeCustomer={!!profile?.stripe_customer_id} size="sm">
                Ouvrir l&apos;espace gestion
              </PortalButton>
            </div>
          ) : profile?.stripe_customer_id ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Aucune carte enregistrée</p>
              <PortalButton hasStripeCustomer={true} variant="outline" size="sm" className="mt-4">
                Ouvrir l&apos;espace gestion Stripe
              </PortalButton>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Aucune carte enregistrée</p>
              <p className="mt-1 text-xs text-slate-400">
                Votre carte sera demandée lors de votre prochain achat de Pass (ci-dessus).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Réservations reçues */}
      {(receivedReservations?.length ?? 0) > 0 && (
        <Card className="mt-10 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" />
              Réservations reçues
            </CardTitle>
            <CardDescription>
              Paiements des organisateurs pour vos offres acceptées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Type</th>
                    <th className="pb-3 pr-3">Montant</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivedReservations!.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {PRODUCT_LABEL[p.product_type] ?? p.product_type}
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {(p.amount / 100).toFixed(2)} €
                      </td>
                      <td className="py-3">
                        <span className={`text-sm font-medium ${STATUS_COLOR[p.status] ?? "text-slate-600"}`}>
                          • {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card className="mt-10 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aucune transaction</p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Type</th>
                    <th className="pb-3 pr-3">Montant</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {PRODUCT_LABEL[p.product_type] ?? p.product_type}
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {(p.amount / 100).toFixed(2)} €
                      </td>
                      <td className="py-3">
                        <span className={`text-sm font-medium ${STATUS_COLOR[p.status] ?? "text-slate-600"}`}>
                          • {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
