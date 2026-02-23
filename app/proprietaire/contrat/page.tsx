import Link from "next/link";
import { FileText } from "lucide-react";

import { ContractUpload } from "@/components/proprietaire/contract-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

async function salleHasContract(salleId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("contrats")
    .download(`salles/${salleId}/modele.pdf`);
  return !error && !!data;
}

export default async function ProprietaireContratPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count: totalCount } = await supabase
    .from("salles")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: salles } = await supabase
    .from("salles")
    .select("id, name, city")
    .eq("owner_id", user.id)
    .order("name")
    .range(from, to);

  const salleContractStatus = await Promise.all(
    (salles ?? []).map(async (s) => ({ salleId: s.id, hasContract: await salleHasContract(s.id) }))
  );
  const contractBySalle = new Map(salleContractStatus.map((x) => [x.salleId, x.hasContract]));
  const sallesAvecContrat = (salles ?? []).filter((s) => contractBySalle.get(s.id));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Contrat & facture</h1>
      <p className="mt-2 text-slate-500">
        Téléchargez votre contrat type en PDF pour chaque salle. L&apos;organisateur le consultera avant de payer.
      </p>

      {sallesAvecContrat.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-slate-700">Vos contrats enregistrés</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {sallesAvecContrat.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {s.name} — {s.city}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!salles || salles.length === 0) ? (
        <Card className="mt-8 border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-16 w-16 text-slate-300" />
            <p className="text-slate-600">Vous n&apos;avez pas encore de salle.</p>
            <Link href="/proprietaire/annonces" className="mt-4 text-sm font-medium text-[#213398] hover:underline">
              Créer une annonce →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-8 space-y-6">
            {[...(salles ?? [])]
              .sort((a, b) => (contractBySalle.get(b.id) ? 1 : 0) - (contractBySalle.get(a.id) ? 1 : 0))
              .map((salle) => (
              <Card key={salle.id} className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    {salle.name}
                  </CardTitle>
                  <CardDescription>
                    {salle.city} — Votre PDF sera affiché à l&apos;organisateur avant le paiement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContractUpload
                    salleId={salle.id}
                    salleName={salle.name}
                    hasContract={contractBySalle.get(salle.id) ?? false}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              baseUrl="/proprietaire/contrat"
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
            />
          )}
        </>
      )}

      <Card className="mt-8 border-0 border-slate-200 bg-slate-50/50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-black">À propos des factures</h3>
          <p className="mt-2 text-sm text-slate-600">
            Après chaque paiement de réservation, une facture est générée automatiquement.
            L&apos;organisateur et vous-même pouvez la télécharger depuis la messagerie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
