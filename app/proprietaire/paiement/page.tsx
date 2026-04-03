import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote } from "lucide-react";

import { ConnectLoginButton } from "@/components/paiement/connect-login-button";
import { ConnectOnboardingButton } from "@/components/paiement/connect-onboarding-button";
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

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  canceled: "bg-slate-100 text-slate-600",
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

  const [{ data: payments }, { data: profile }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, product_type, amount, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("stripe_account_id").eq("id", user.id).single(),
  ]);

  const recentPayments = (payments ?? []).slice(0, 5);
  const hasConnectAccount = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;
  const params = await searchParams;
  const connectSuccess = params.connect === "success";
  const connectRefresh = params.connect === "refresh";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Paiement</h1>
      <p className="mt-2 text-slate-500">Recevez les paiements de vos réservations et consultez l&apos;historique</p>

      {/* Recevoir les paiements (Stripe Connect) */}
      <Card id="recevoir-paiements" className="mt-8 border-0 shadow-sm scroll-mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5" />
            Recevoir les paiements
          </CardTitle>
          <CardDescription>
            {hasConnectAccount
              ? "Les encaissements passent par Stripe ; ouvrez votre espace connecté pour suivre les virements."
              : "Pour recevoir les paiements des réservations sur GetSoundOn, activez votre espace Stripe (compte connecté). Les frais plateforme sont configurables par l'administration."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectSuccess && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <Banknote className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">Paiements activés !</p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Vous pouvez encaisser les paiements liés aux réservations catalogue (matériel).
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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gs-orange/10">
                  <Banknote className="h-6 w-6 text-gs-orange" />
                </div>
                <div>
                  <p className="font-semibold text-black">Activez les paiements</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Connectez votre identité et votre IBAN pour recevoir les réservations. Stripe sécurise vos données.
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
