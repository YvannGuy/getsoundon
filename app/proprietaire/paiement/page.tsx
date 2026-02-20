import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CreditCard, Infinity, Lock, Zap } from "lucide-react";

import { getPaymentMethods } from "@/app/actions/stripe-portal";
import { getPlatformSettings } from "@/app/actions/admin-settings";
import { PassCheckoutButton } from "@/components/pass-checkout-button";
import { PortalButton } from "@/components/paiement/portal-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasAccessToBrowseOthers } from "@/lib/pass-utils";

const PRODUCT_LABEL: Record<string, string> = {
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement mensuel",
  autre: "Autre",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payé",
  pending: "En cours",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-600",
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

export default async function ProprietairePaiementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [settings, { data: payments }, { data: profile }, paymentMethods, canBrowse] =
    await Promise.all([
      getPlatformSettings(),
      supabase
        .from("payments")
        .select("id, product_type, amount, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single(),
      getPaymentMethods(user.id),
      hasAccessToBrowseOthers(user.id),
    ]);

  const pass = settings.pass;
  const paidList = (payments ?? []).filter((p) => p.status === "paid");

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
      name: "Abonnement",
      description: "Accès illimité récurrent",
      price: pass.price_abonnement / 100,
      priceSuffix: "/mois",
      features: ["Accès aux annonces", "Recherche illimitée", "Support prioritaire", "Résiliation à tout moment"],
      icon: Infinity,
      enabled: pass.abonnement_enabled,
    },
  ].filter((p) => p.enabled);

  const recentPayments = (payments ?? []).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Paiement</h1>
      <p className="mt-2 text-slate-500">Gérez votre accès pour consulter les annonces des autres propriétaires</p>

      {/* Mon accès */}
      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Mon accès
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canBrowse ? (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
              <Zap className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-800">Pass actif</span>
                <p className="mt-0.5 text-sm text-emerald-700">Vous pouvez consulter les annonces des autres propriétaires</p>
              </div>
              <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800">
                Actif
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-4">
                <AlertTriangle className="h-6 w-6 shrink-0 text-slate-500" />
                <div>
                  <span className="font-semibold text-slate-700">Accès limité</span>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Activez un Pass pour consulter les annonces des autres propriétaires
                  </p>
                </div>
                <span className="rounded-full bg-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Inactif
                </span>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Sans Pass, vous ne pouvez consulter que vos propres annonces. Activez un Pass pour découvrir les salles des autres propriétaires.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Pass 24h, 48h ou abonnement selon vos besoins
                  </p>
                </div>
              </div>
              <PassCheckoutButton passType="pass_24h" returnBase="/proprietaire/paiement" className="mt-4 bg-[#213398] hover:bg-[#1a2980]">
                Choisir un Pass
              </PassCheckoutButton>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pass & abonnements */}
      <h2 className="mt-10 text-lg font-semibold text-black">Pass & abonnements</h2>
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
