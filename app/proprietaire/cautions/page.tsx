import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield } from "lucide-react";

import { DepositHoldActions } from "@/components/paiement/deposit-hold-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  none: "Aucune caution",
  authorized: "Empreinte active",
  claim_requested: "Demande de retenue en revue",
  released: "Empreinte libérée",
  captured: "Caution capturée",
  failed: "Empreinte échouée",
  expired: "Empreinte expirée",
};

export const dynamic = "force-dynamic";

export default async function ProprietaireCautionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();
  const { data: paidOffersWithDeposit } = await adminSupabase
    .from("offers")
    .select(
      "id, seeker_id, salle_id, amount_cents, deposit_amount_cents, deposit_hold_status, created_at, status"
    )
    .eq("owner_id", user.id)
    .eq("status", "paid")
    .gt("deposit_amount_cents", 0)
    .order("created_at", { ascending: false })
    .limit(100);

  const seekerIds = [
    ...new Set((paidOffersWithDeposit ?? []).map((o) => (o as { seeker_id: string }).seeker_id)),
  ];
  const salleIds = [
    ...new Set((paidOffersWithDeposit ?? []).map((o) => (o as { salle_id: string }).salle_id)),
  ];
  const [{ data: seekerProfiles }, { data: salles }] = await Promise.all([
    seekerIds.length > 0
      ? adminSupabase.from("profiles").select("id, full_name").in("id", seekerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    salleIds.length > 0
      ? adminSupabase.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const seekerMap = new Map((seekerProfiles ?? []).map((p) => [p.id, p.full_name ?? "Locataire"]));
  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Cautions</h1>
      <p className="mt-2 text-slate-500">
        Gérez les empreintes de caution de vos réservations payées.
      </p>

      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Gestion des cautions
          </CardTitle>
          <CardDescription>
            Déclarez un dommage (demande de retenue) ou libérez l&apos;empreinte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(paidOffersWithDeposit?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Aucune caution à gérer pour le moment.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Salle</th>
                    <th className="pb-3 pr-3">Locataire</th>
                    <th className="pb-3 pr-3">Caution</th>
                    <th className="pb-3 pr-3">Statut</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(paidOffersWithDeposit ?? []).map((o) => {
                    const row = o as {
                      id: string;
                      created_at: string;
                      seeker_id: string;
                      salle_id: string;
                      deposit_amount_cents: number;
                      deposit_hold_status: string;
                    };
                    return (
                      <tr key={row.id}>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {format(new Date(row.created_at), "d MMM yyyy", { locale: fr })}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {salleMap.get(row.salle_id) ?? "Salle"}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {seekerMap.get(row.seeker_id) ?? "Locataire"}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {(row.deposit_amount_cents / 100).toFixed(2)} €
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {DEPOSIT_STATUS_LABEL[row.deposit_hold_status] ?? row.deposit_hold_status}
                        </td>
                        <td className="py-3">
                          <DepositHoldActions
                            offerId={row.id}
                            holdStatus={row.deposit_hold_status}
                            depositAmountCents={row.deposit_amount_cents}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
