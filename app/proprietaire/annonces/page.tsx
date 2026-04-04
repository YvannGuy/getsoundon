import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  sound: "Sono",
  dj: "DJ",
  lighting: "Lumière",
  services: "Services",
};

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  price_per_day: number | string | null;
  is_active: boolean | null;
  created_at: string;
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProprietaireAnnoncesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = typeof params.listingStatus === "string" ? params.listingStatus : "online";

  const { user } = await getUserOrNull();
  if (!user) redirect("/auth");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("gs_listings")
    .select("id, title, category, location, price_per_day, is_active, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (rows ?? []) as ListingRow[];

  const filtered = listings.filter((l) => {
    if (status === "online") return l.is_active === true;
    if (status === "pending") return l.is_active === null || typeof l.is_active === "undefined";
    if (status === "expired") return l.is_active === false;
    return true;
  });

  const heading =
    status === "pending"
      ? "Annonces en attente"
      : status === "expired"
        ? "Annonces expirées"
        : "Annonces en ligne";
  const emptyText =
    status === "pending"
      ? "Aucune annonce en attente pour l’instant."
      : status === "expired"
        ? "Aucune annonce expirée."
        : "Aucune annonce en ligne pour l’instant.";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">{heading}</h1>
          <p className="mt-1 text-slate-500">Filtré par statut : {heading.toLowerCase()}.</p>
        </div>
        <Link
          href="/proprietaire/ajouter-annonce"
          className="rounded-xl bg-gs-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Ajouter une annonce
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
          <p>{emptyText}</p>
          <Link href="/proprietaire/ajouter-annonce" className="mt-3 inline-block font-semibold text-gs-orange hover:underline">
            Ajouter une annonce
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const active = r.is_active === true;
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-black">{r.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {Number(r.price_per_day ?? 0) > 0 ? `${Number(r.price_per_day)} € / jour` : "Tarif sur demande"}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {active ? "Visible catalogue" : status === "pending" ? "En attente" : "Expirée / masquée"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/items/${r.id}`}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Voir la fiche
                  </Link>
                  <Link
                    href={`/proprietaire/materiel/listing/${r.id}/reglages`}
                    className="rounded-lg bg-gs-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                  >
                    Réglages & caution
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
