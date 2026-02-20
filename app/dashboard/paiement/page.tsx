import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CreditCard, Infinity, Lock, Zap } from "lucide-react";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { PassCheckoutButton } from "@/components/pass-checkout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

export default async function PaiementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const settings = await getPlatformSettings();
  const pass = settings.pass;

  const [{ count: demandesCount }, { data: payments }] = await Promise.all([
    supabase.from("demandes").select("id", { count: "exact", head: true }).eq("seeker_id", user.id),
    supabase
      .from("payments")
      .select("id, product_type, amount, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const freeUsed = demandesCount ?? 0;
  const freeTotal = pass.demandes_gratuites;
  const paidList = (payments ?? []).filter((p) => p.status === "paid");
  const activePass = hasActivePass(paidList, freeUsed, freeTotal);

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
      name: "Abonnement",
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
      <h1 className="text-2xl font-bold text-slate-900">Paiement</h1>
      <p className="mt-2 text-slate-500">Gérez votre accès et vos transactions</p>

      {/* Mon accès */}
      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Mon accès
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePass ? (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
              <span className="text-emerald-700 font-medium">
                {freeUsed < freeTotal
                  ? `${freeTotal - freeUsed} demande${freeTotal - freeUsed > 1 ? "s" : ""} gratuite${freeTotal - freeUsed > 1 ? "s" : ""} restante${freeTotal - freeUsed > 1 ? "s" : ""}`
                  : "Accès actif"}
              </span>
              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Actif
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-4">
                <span className="font-medium text-slate-700">Accès limité</span>
                <span className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Inactif
                </span>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Vous avez atteint vos demandes offertes. Activez un Pass pour continuer à envoyer des demandes
                    illimitées aux propriétaires de salles.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Les Pass permettent d&apos;envoyer des demandes illimitées
                  </p>
                </div>
              </div>
              <PassCheckoutButton passType="pass_24h" className="mt-4 bg-[#6366f1] hover:bg-[#4f46e5]">
                Choisir un Pass
              </PassCheckoutButton>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pass & abonnements */}
      <h2 className="mt-10 text-lg font-semibold text-slate-900">Pass & abonnements</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`relative flex h-full flex-col border-0 shadow-sm ${(plan as { highlighted?: boolean }).highlighted ? "ring-1 ring-[#6366f1]" : ""}`}
            >
              {(plan as { highlighted?: boolean }).highlighted && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#6366f1] px-3 py-0.5 text-xs font-medium text-white">
                  Offre recommandée
                </div>
              )}
              <CardHeader className="shrink-0 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0 text-[#6366f1]" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {plan.price} €
                  {plan.priceSuffix && (
                    <span className="text-base font-normal text-slate-500">{plan.priceSuffix}</span>
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
                    className={`w-full ${(plan as { highlighted?: boolean }).highlighted ? "bg-[#6366f1] hover:bg-[#4f46e5]" : ""}`}
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Moyen de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Aucune carte enregistrée</p>
            <p className="mt-1 text-xs text-slate-400">
              Votre carte sera demandée lors de votre prochain achat de Pass. La gestion des moyens de paiement sera
              disponible prochainement.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled title="Bientôt disponible">
                Modifier
              </Button>
              <Button variant="outline" size="sm" disabled title="Bientôt disponible">
                + Ajouter une carte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card className="mt-10 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Historique</CardTitle>
          <Link href="/dashboard/paiement/historique" className="text-sm font-medium text-[#6366f1] hover:underline">
            Voir tout →
          </Link>
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
