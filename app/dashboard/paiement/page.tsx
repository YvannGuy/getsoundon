import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard } from "lucide-react";

import { getPaymentMethods } from "@/app/actions/stripe-portal";
import { PortalButton } from "@/components/paiement/portal-button";
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

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  canceled: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
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

export default async function PaiementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: payments }, { data: profile }, paymentMethods] = await Promise.all([
    supabase
      .from("payments")
      .select("id, product_type, amount, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["paid", "active", "canceled"])
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single(),
    getPaymentMethods(user.id),
  ]);

  const recentPayments = (payments ?? []).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Paiement</h1>
      <p className="mt-2 text-slate-500">Gérez vos moyens de paiement et vos transactions</p>

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
                Votre carte sera enregistrée lors de votre prochaine réservation.
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
                Votre carte sera demandée lors de votre prochaine réservation.
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
            <>
              <div className="space-y-3 md:hidden">
                {recentPayments.map((p) => (
                  <article key={p.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-black">
                        {PRODUCT_LABEL[p.product_type] ?? p.product_type}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-black">{(p.amount / 100).toFixed(2)} €</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden -mx-4 overflow-x-auto sm:mx-0 md:block">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
