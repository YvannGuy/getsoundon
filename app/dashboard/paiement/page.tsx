import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, Crown, Gift, Infinity, Lock, Zap } from "lucide-react";

import { activateTrialAction, getTrialActivated } from "@/app/actions/trial";
import { getPaymentMethods } from "@/app/actions/stripe-portal";
import { getPlatformSettings } from "@/app/actions/admin-settings";
import { PassCheckoutButton } from "@/components/pass-checkout-button";
import { PortalButton } from "@/components/paiement/portal-button";
import { TrialActivatedPopup } from "@/components/paiement/trial-activated-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const PRODUCT_LABEL: Record<string, string> = {
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement mensuel",
  reservation: "Réservation",
  autre: "Autre",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payé",
  active: "Actif",
  canceled: "Annulé",
  pending: "En cours",
  failed: "Échoué",
  refunded: "Remboursé",
};

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-600",
  active: "text-emerald-600",
  canceled: "text-slate-500",
  pending: "text-amber-600",
  failed: "text-red-600",
  refunded: "text-slate-500",
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

function hasActivePass(
  payments: { product_type: string; created_at: string }[],
  freeUsed: number,
  freeTotal: number
): boolean {
  if (freeUsed < freeTotal) return true;
  const now = new Date();
  return (payments ?? []).some((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });
}

function hasPaidPass(
  payments: { product_type: string; created_at: string }[],
  freeUsed: number,
  freeTotal: number
): boolean {
  if (freeUsed < freeTotal) return false;
  const now = new Date();
  return (payments ?? []).some((p) => {
    if (p.product_type === "abonnement") return true;
    const created = new Date(p.created_at);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (p.product_type === "pass_24h") return hoursAgo < 24;
    if (p.product_type === "pass_48h") return hoursAgo < 48;
    return false;
  });
}

export default async function PaiementPage({
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

  const settings = await getPlatformSettings();
  const pass = settings.pass;

  const [{ count: demandesCount }, { data: payments }, { data: profile }, paymentMethods, trialActivated] =
    await Promise.all([
      supabase.from("demandes").select("id", { count: "exact", head: true }).eq("seeker_id", user.id),
      supabase
        .from("payments")
        .select("id, product_type, amount, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["paid", "active", "canceled"])
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("stripe_customer_id, free_pass_credits").eq("id", user.id).single(),
      getPaymentMethods(user.id),
      getTrialActivated(user.id),
    ]);

  const freeUsed = demandesCount ?? 0;
  const freePassCredits = (profile as { free_pass_credits?: number | null })?.free_pass_credits ?? 0;
  const freeTotal = pass.demandes_gratuites + freePassCredits;
  const paidList = (payments ?? []).filter((p) => p.status === "paid" || p.status === "active");
  const activePass = hasActivePass(paidList, freeUsed, freeTotal);
  const hasPaid = hasPaidPass(paidList, freeUsed, freeTotal);
  const isTrialActive = freeUsed < freeTotal && !hasPaid;
  const trialJustActivated = params.trial === "1";

  const plans = [
    {
      id: "pass_24h" as const,
      name: "Pass 24h",
      description: "Accès illimité pendant 24 heures",
      price: pass.price_24h / 100,
      features: ["Demandes illimitées", "Messagerie complète", "Support prioritaire"],
      icon: Zap,
      enabled: pass.pass_24h_enabled,
    },
    {
      id: "pass_48h" as const,
      name: "Pass 48h",
      description: "Accès illimité pendant 48 heures",
      price: pass.price_48h / 100,
      features: ["Demandes illimitées", "Messagerie complète", "Support prioritaire", "Économie de 35%"],
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
      features: ["Demandes illimitées", "Messagerie complète", "Support prioritaire", "Résiliation à tout moment"],
      icon: Infinity,
      enabled: pass.abonnement_enabled,
    },
  ].filter((p) => p.enabled);

  const recentPayments = (payments ?? []).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <TrialActivatedPopup
        show={!!trialJustActivated && isTrialActive}
        freeTotal={freeTotal}
        userType="seeker"
        basePath="/dashboard/paiement"
      />
      <h1 className="text-2xl font-bold text-black">Paiement</h1>
      <p className="mt-2 text-slate-500">Gérez votre accès et vos transactions</p>

      {/* Bannière essai venant d'être activé */}
      {trialJustActivated && isTrialActive && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
          <Gift className="h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Votre essai est activé !</p>
            <p className="mt-1 text-sm text-emerald-700">
              Vous disposez de {freeTotal - freeUsed} demande{freeTotal - freeUsed > 1 ? "s" : ""} pour découvrir la plateforme. Envoyez vos demandes aux propriétaires
              pour vérifier les disponibilités.
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
                    Bénéficiez de demandes gratuites pour découvrir la plateforme
                  </p>
                </div>
              </div>
              <Link href="/dashboard/paiement?trial=1" className="sm:ml-auto">
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
                  {freeTotal - freeUsed} demande{freeTotal - freeUsed > 1 ? "s" : ""} restante{freeTotal - freeUsed > 1 ? "s" : ""}
                </p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800">
                Essai
              </span>
            </div>
          ) : activePass ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
              <Zap className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-800">Pass actif</span>
                <p className="mt-0.5 text-sm text-emerald-700">Vous pouvez envoyer des demandes illimitées aux propriétaires</p>
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
                  Vous n&apos;avez plus de demandes restantes. Choisissez un Pass pour continuer à contacter les propriétaires.
                </p>
              </div>
              <Link href="#pass-abonnements" className="ml-auto">
                <Button className="bg-[#213398] hover:bg-[#1a2980]">Voir les offres</Button>
              </Link>
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
                    <span className="text-base font-normal text-slate-500">{plan.priceSuffix}</span>
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
            <PortalButton
              hasStripeCustomer={true}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
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
              <p className="text-xs text-slate-500">
                Pour ajouter, modifier ou supprimer une carte, utilisez le portail sécurisé Stripe.
              </p>
              <PortalButton hasStripeCustomer={!!profile?.stripe_customer_id} size="sm">
                Ouvrir l&apos;espace gestion
              </PortalButton>
            </div>
          ) : profile?.stripe_customer_id ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Aucune carte enregistrée</p>
              <p className="mt-1 text-xs text-slate-400">
                Effectuez un achat de Pass pour enregistrer votre carte. Elle sera réutilisable pour vos prochains achats.
              </p>
              <PortalButton
                hasStripeCustomer={true}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Ouvrir l&apos;espace gestion Stripe
              </PortalButton>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Aucune carte enregistrée</p>
              <p className="mt-1 text-xs text-slate-400">
                Votre carte sera demandée lors de votre prochain achat de Pass (ci-dessus) et sera enregistrée pour vos futurs achats.
              </p>
            </div>
          )}
          {profile?.stripe_customer_id && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">
                <strong>Abonnement ?</strong> Utilisez l&apos;espace gestion Stripe pour annuler, suspendre ou modifier votre abonnement, et gérer vos factures.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
