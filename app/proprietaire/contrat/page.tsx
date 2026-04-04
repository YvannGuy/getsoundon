import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProprietaireFacturesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoices } = await admin
    .from("gs_invoices")
    .select("id, booking_id, invoice_number, invoice_url, invoice_generated_at, invoice_total_eur, currency")
    .eq("provider_id", user.id)
    .order("invoice_generated_at", { ascending: false })
    .limit(50);

  const list = (invoices ?? []).map((inv) => inv as {
    id: string;
    booking_id: string;
    invoice_number: string;
    invoice_url: string;
    invoice_generated_at: string;
    invoice_total_eur: number | null;
    currency?: string | null;
  });

  const withSigned = await Promise.all(
    list.map(async (inv) => {
      const { data: signed } = await admin.storage.from("invoices").createSignedUrl(inv.invoice_url, 60 * 60 * 24);
      return { ...inv, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Factures</h1>
      <p className="mt-2 text-slate-500">
        Les factures finales sont générées automatiquement à la fin des réservations (événement terminé, payout payé, sans
        incident).
      </p>

      {withSigned.length === 0 ? (
        <Card className="mt-8 border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-16 w-16 text-slate-300" />
            <p className="max-w-md text-slate-600">
              Aucune facture n’est disponible pour le moment. Les documents apparaîtront ici lorsque les réservations
              seront terminées et virées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Factures générées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {withSigned.map((inv) => (
                <article key={inv.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-black">{inv.invoice_number}</p>
                  <p className="text-sm text-slate-600">
                    Émise le {new Date(inv.invoice_generated_at).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-sm text-slate-600">Réservation : {inv.booking_id}</p>
                  <p className="text-sm font-semibold text-black">
                    {(inv.invoice_total_eur ?? 0).toFixed(2)} {inv.currency ?? "EUR"}
                  </p>
                  {inv.signedUrl ? (
                    <a
                      href={inv.signedUrl}
                      className="mt-2 inline-flex items-center text-sm font-semibold text-gs-orange underline-offset-2 hover:underline"
                    >
                      Télécharger
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">Lien indisponible</p>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden -mx-4 overflow-x-auto sm:mx-0 md:block">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3">Facture</th>
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Réservation</th>
                    <th className="pb-3 pr-3">Montant</th>
                    <th className="pb-3">Lien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withSigned.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pr-3 text-sm font-semibold text-slate-800">{inv.invoice_number}</td>
                      <td className="py-3 pr-3 text-sm text-slate-600">
                        {new Date(inv.invoice_generated_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-600">{inv.booking_id}</td>
                      <td className="py-3 pr-3 text-sm font-semibold text-slate-800">
                        {(inv.invoice_total_eur ?? 0).toFixed(2)} {inv.currency ?? "EUR"}
                      </td>
                      <td className="py-3 text-sm">
                        {inv.signedUrl ? (
                          <a
                            href={inv.signedUrl}
                            className="font-semibold text-gs-orange underline-offset-2 hover:underline"
                          >
                            Télécharger
                          </a>
                        ) : (
                          <span className="text-slate-400">Indispo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
