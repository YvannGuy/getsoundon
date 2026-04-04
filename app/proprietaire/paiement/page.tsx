import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote } from "lucide-react";

import { ConnectLoginButton } from "@/components/paiement/connect-login-button";
import { ConnectOnboardingButton } from "@/components/paiement/connect-onboarding-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";

export const dynamic = "force-dynamic";

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

  const [{ data: profile }, { data: bookings }] = await Promise.all([
    supabase.from("profiles").select("stripe_account_id").eq("id", user.id).single(),
    createAdminClient()
      .from("gs_bookings")
      .select(
        "id, listing_id, start_date, end_date, status, total_price, checkout_total_eur, service_fee_eur, payout_status, stripe_payment_intent_id, incident_status, updated_at"
      )
      .eq("provider_id", user.id)
      .not("stripe_payment_intent_id", "is", null)
      .order("end_date", { ascending: false })
      .limit(50),
  ]);

  const hasConnectAccount = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;

  const bookingRows = (bookings ?? []) as Array<{
    id: string;
    listing_id: string | null;
    start_date: string;
    end_date: string;
    status: string;
    total_price: number | string | null;
    checkout_total_eur?: number | string | null;
    service_fee_eur?: number | string | null;
    payout_status: string | null;
    stripe_payment_intent_id: string | null;
    incident_status: string | null;
    updated_at?: string | null;
  }>;

  const pendingPayouts = bookingRows.filter(
    (b) =>
      b.stripe_payment_intent_id &&
      (b.payout_status === null || b.payout_status === "pending") &&
      b.incident_status !== "open" &&
      (b.status === "accepted" || b.status === "completed")
  );
  const paidPayouts = bookingRows
    .filter((b) => b.payout_status === "paid")
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  const formatEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

  const sumNet = (rows: typeof bookingRows) =>
    rows.reduce((sum, r) => {
      const gross = Number(r.checkout_total_eur ?? r.total_price ?? 0);
      if (!Number.isFinite(gross)) return sum;
      try {
        return sum + computeGsBookingPaymentSplit(gross).providerNetEur;
      } catch {
        return sum;
      }
    }, 0);

  const gainsEnAttente = sumNet(pendingPayouts);

  const nextPayoutDate =
    pendingPayouts.length > 0
      ? addDays(
          pendingPayouts
            .map((r) => new Date(r.end_date))
            .sort((a, b) => a.getTime() - b.getTime())[0],
          2
        )
      : null;

  const lastPaid = paidPayouts[0] ?? null;
  const lastPaidAmount = lastPaid ? sumNet([lastPaid]) : 0;

  const historyPaid = paidPayouts.slice(0, 8);
  const waitingList = pendingPayouts.slice(0, 8);
  const params = await searchParams;
  const connectSuccess = params.connect === "success";
  const connectRefresh = params.connect === "refresh";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Paiements</h1>
      <p className="mt-2 text-slate-500">
        Encaissements Stripe Connect pour vos réservations matériel. Virements automatiques J+2 après fin d&apos;événement
        (hors incidents/caution).
      </p>

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

      {/* Synthèse paiements */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Gains en attente</CardTitle>
            <CardDescription>Réservations payées mais pas encore virées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-black">{formatEur(gainsEnAttente)}</p>
            <p className="text-sm text-slate-500">
              Virement automatique J+2 après fin d&apos;événement, sauf incident ou caution bloquée.
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Prochain virement</CardTitle>
            <CardDescription>Estimation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayouts.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun virement prévu.</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-black">{formatEur(gainsEnAttente)}</p>
                <p className="text-sm text-slate-600">
                  {nextPayoutDate
                    ? `Envoi estimé autour du ${format(nextPayoutDate, "d MMM yyyy", { locale: fr })}`
                    : "Envoi automatique après validation et délai de sécurité."}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Dernier virement</CardTitle>
            <CardDescription>Dernier paiement envoyé</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastPaid ? (
              <>
                <p className="text-2xl font-bold text-black">{formatEur(lastPaidAmount)}</p>
                <p className="text-sm text-slate-600">
                  Événement du {format(new Date(lastPaid.end_date), "d MMM yyyy", { locale: fr })}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Aucun virement envoyé pour l’instant.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Réservations en attente de libération */}
      <Card className="mt-10 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Réservations en attente de libération</CardTitle>
          <CardDescription>
            Montants payés qui seront virés automatiquement après le délai J+2 (hors incidents).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waitingList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Aucune réservation en attente de virement.</p>
          ) : (
            <div className="space-y-3 md:hidden">
              {waitingList.map((b) => {
                const gross = Number(b.total_price ?? 0);
                const net = computeGsBookingPaymentSplit(gross).providerNetEur;
                const eta = addDays(new Date(b.end_date), 2);
                return (
                  <article key={b.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-black">{formatEur(net)}</p>
                    <p className="text-sm text-slate-600">
                      Fin le {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-xs text-slate-500">Virement estimé vers le {format(eta, "d MMM yyyy", { locale: fr })}</p>
                  </article>
                );
              })}
            </div>
          )}

          {waitingList.length > 0 && (
            <div className="hidden -mx-4 overflow-x-auto sm:mx-0 md:block">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">Fin</th>
                    <th className="pb-3 pr-3">Montant net</th>
                    <th className="pb-3 pr-3">Statut</th>
                    <th className="pb-3">Virement estimé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waitingList.map((b) => {
                    const net = computeGsBookingPaymentSplit(Number(b.total_price ?? 0)).providerNetEur;
                    const eta = addDays(new Date(b.end_date), 2);
                    return (
                      <tr key={b.id}>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                        </td>
                        <td className="py-3 pr-3 text-sm font-semibold text-slate-800">{formatEur(net)}</td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {b.status === "accepted" ? "Réservation en cours" : "Terminée"}
                        </td>
                        <td className="py-3 text-sm text-slate-600">{format(eta, "d MMM yyyy", { locale: fr })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des virements */}
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Historique des virements</CardTitle>
          <CardDescription>Virements déjà envoyés (réservations payées)</CardDescription>
        </CardHeader>
        <CardContent>
          {historyPaid.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Aucun virement envoyé pour l’instant.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {historyPaid.map((b) => {
                  const net = computeGsBookingPaymentSplit(Number(b.total_price ?? 0)).providerNetEur;
                  return (
                    <article key={b.id} className="rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-black">{formatEur(net)}</p>
                      <p className="text-sm text-slate-600">
                        Événement du {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </article>
                  );
                })}
              </div>
              <div className="hidden -mx-4 overflow-x-auto sm:mx-0 md:block">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="pb-3 pr-3">Fin</th>
                      <th className="pb-3 pr-3">Montant net</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyPaid.map((b) => {
                      const net = computeGsBookingPaymentSplit(Number(b.total_price ?? 0)).providerNetEur;
                      return (
                        <tr key={b.id}>
                          <td className="py-3 pr-3 text-sm text-slate-600">
                            {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                          </td>
                          <td className="py-3 pr-3 text-sm font-semibold text-slate-800">{formatEur(net)}</td>
                          <td className="py-3 text-sm font-medium text-emerald-700">Virement envoyé</td>
                        </tr>
                      );
                    })}
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
