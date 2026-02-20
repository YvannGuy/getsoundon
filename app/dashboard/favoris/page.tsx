import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rowToSalle } from "@/lib/types/salle";
import type { Salle } from "@/lib/types/salle";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Heart } from "lucide-react";

const PAGE_SIZE = 12;

export default async function FavorisPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-slate-500">Connectez-vous pour voir vos favoris.</p>
      </div>
    );
  }

  const { data: favoriRows } = await supabase
    .from("favoris")
    .select("salle_id")
    .eq("user_id", user.id);

  const salleIds = (favoriRows ?? []).map((r) => r.salle_id);
  let allSalles: Salle[] = [];

  if (salleIds.length > 0) {
    const { data: salleRows } = await supabase
      .from("salles")
      .select("*")
      .in("id", salleIds)
      .eq("status", "approved");
    allSalles = (salleRows ?? []).map((r) =>
      rowToSalle(r as Parameters<typeof rowToSalle>[0])
    );
    allSalles.sort((a, b) => a.name.localeCompare(b.name));
  }

  const pageParam = (await searchParams).page;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const totalPages = Math.ceil(allSalles.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const salles = allSalles.slice(from, from + PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Mes salles sauvegardées</h1>
      <p className="mt-2 text-slate-600">
        Retrouvez ici les salles que vous avez mises en favoris.
      </p>

      {salles.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Aucune salle sauvegardée</p>
          <p className="mt-2 text-sm text-slate-500">
            Parcourez les annonces et cliquez sur &quot;Sauvegarder&quot; pour les retrouver ici.
          </p>
          <Link href="/rechercher">
            <Button variant="outline" className="mt-6">
              Rechercher une salle
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {salles.map((salle) => (
              <Link
                key={salle.id}
                href={`/salles/${salle.slug}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] bg-slate-100">
                  <Image
                    src={salle.images[0] ?? "/img.png"}
                    alt={salle.name}
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-sm">
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#304256]">{salle.name}</h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {salle.city} • Jusqu&apos;à {salle.capacity} personnes
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#2d435a]">
                    À partir de {salle.pricePerDay} € / jour
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            baseUrl="/dashboard/favoris"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={allSalles.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
}
