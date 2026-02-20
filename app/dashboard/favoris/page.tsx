import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SearchModalButton } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";
import { rowToSalle } from "@/lib/types/salle";
import type { Salle } from "@/lib/types/salle";
import { Heart, MapPin, Users } from "lucide-react";

const PAGE_SIZE = 12;

type SortOption = "ville" | "capacite" | "budget";

function sortSalles(salles: Salle[], sort: SortOption): Salle[] {
  const copy = [...salles];
  switch (sort) {
    case "ville":
      return copy.sort((a, b) => a.city.localeCompare(b.city));
    case "capacite":
      return copy.sort((a, b) => b.capacity - a.capacity);
    case "budget":
      return copy.sort((a, b) => a.pricePerDay - b.pricePerDay);
    default:
      return copy;
  }
}

export default async function FavorisPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { sort: sortParam, page: pageParam } = await searchParams;
  const sort: SortOption =
    sortParam === "ville" || sortParam === "capacite" || sortParam === "budget" ? sortParam : "ville";

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
    allSalles = sortSalles(allSalles, sort);
  }

  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(allSalles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const salles = allSalles.slice(from, from + PAGE_SIZE);
  const sortQuery = `&sort=${sort}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes favoris</h1>
          <p className="mt-1 text-slate-600">Salles enregistrées</p>
        </div>
        {allSalles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/favoris?sort=ville"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                sort === "ville"
                  ? "bg-[#6366f1] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Trier par ville
            </Link>
            <Link
              href="/dashboard/favoris?sort=capacite"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                sort === "capacite"
                  ? "bg-[#6366f1] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Capacité
            </Link>
            <Link
              href="/dashboard/favoris?sort=budget"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                sort === "budget"
                  ? "bg-[#6366f1] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Budget
            </Link>
          </div>
        )}
      </div>

      {salles.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Aucune salle sauvegardée</p>
          <p className="mt-2 text-sm text-slate-500">
            Parcourez les annonces et cliquez sur &quot;Sauvegarder&quot; pour les retrouver ici.
          </p>
          <SearchModalButton>
            <Button variant="outline" className="mt-6">
              Rechercher une salle
            </Button>
          </SearchModalButton>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {salles.map((salle) => (
              <div
                key={salle.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] bg-slate-100">
                  <Image
                    src={Array.isArray(salle.images) && salle.images[0] ? String(salle.images[0]) : "/img.png"}
                    alt={salle.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-sm">
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{salle.name}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{salle.city}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{salle.capacity} personnes</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {salle.pricePerDay} € / jour
                  </p>
                  <Link href={`/salles/${salle.slug}`} className="mt-4 block">
                    <Button className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                      Voir la salle
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            baseUrl="/dashboard/favoris"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={allSalles.length}
            pageSize={PAGE_SIZE}
            queryParams={sortQuery}
          />
        </>
      )}
    </div>
  );
}
