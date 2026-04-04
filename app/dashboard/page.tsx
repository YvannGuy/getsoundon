import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchModalButton } from "@/components/search/search-modal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count: bookings30 } = await supabase
    .from("gs_bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-landing-heading text-2xl font-bold text-gs-dark">Locataire · Tableau de bord</h1>
        <p className="font-landing-body mt-1 text-slate-600">
          Suivez vos locations matériel sur GetSoundOn
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100">
              <Package className="h-6 w-6 text-sky-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black">{bookings30 ?? 0}</p>
              <p className="text-sm text-slate-500">Réservations matériel (30 derniers jours)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col justify-center gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gs-orange/10">
                <Package className="h-6 w-6 text-gs-orange" />
              </div>
              <div>
                <p className="font-semibold text-black">Locations matériel</p>
                <p className="text-sm text-slate-500">Échanges et détail de chaque réservation</p>
              </div>
            </div>
            <Link
              href="/dashboard/materiel"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-gs-orange px-4 text-sm font-medium text-white transition hover:brightness-95"
            >
              Ouvrir
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pb-2">
          <CardTitle className="font-landing-heading text-lg text-gs-dark">Catalogue</CardTitle>
          <Link href="/catalogue" className="text-sm font-medium text-black hover:underline">
            Parcourir le catalogue →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm text-slate-600">
              Trouvez du matériel événementiel et lancez une réservation depuis le catalogue public.
            </p>
            <SearchModalButton>
              <Button variant="outline" size="sm" className="mt-3">
                Rechercher du matériel
              </Button>
            </SearchModalButton>
            <div className="relative mt-6 h-32 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <Image src="/img.png" alt="" fill className="object-cover opacity-80" sizes="448px" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Messagerie matériel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm text-slate-600">
              Les échanges liés à vos <strong>locations matériel</strong> se font depuis{" "}
              <strong>Mes locations matériel</strong>.
            </p>
            <Link
              href="/dashboard/materiel"
              className="mt-4 text-sm font-medium text-gs-orange hover:underline"
            >
              Ouvrir Mes locations matériel →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
