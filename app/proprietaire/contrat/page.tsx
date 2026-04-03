import Link from "next/link";
import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProprietaireContratPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Contrats & factures</h1>
      <p className="mt-2 text-slate-500">
        Le flux actif repose sur les <strong>réservations matériel</strong> (catalogue) et Stripe Connect. Les anciens
        PDF d’offres « lieux » ne sont plus générés depuis cet écran.
      </p>

      <Card className="mt-8 border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-16 w-16 text-slate-300" />
          <p className="max-w-md text-slate-600">
            Pour le détail des encaissements et l’espace Stripe, utilisez l’onglet Paiements. Pour une réservation
            précise, ouvrez la fiche dans Locations matériel.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/proprietaire/paiement"
              className="rounded-lg bg-gs-orange px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105"
            >
              Paiements & Stripe
            </Link>
            <Link
              href="/proprietaire/materiel"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Locations matériel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
