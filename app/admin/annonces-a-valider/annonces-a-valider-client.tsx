"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Clock,
  Eye,
  MapPin,
  Search,
  X,
} from "lucide-react";

import { validateSalleAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SalleWithOwner = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  price_per_day: number;
  description: string | null;
  images: string[];
  features: unknown;
  conditions: unknown;
  created_at: string;
  owner?: { full_name: string | null; email: string | null };
};

type Props = {
  salles: SalleWithOwner[];
  highlightSalleId?: string;
};

function formatDateShort(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return { day: "Aujourd'hui", time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
  if (diffDays === 1) return { day: "Hier", time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
  return { day: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
}


export function AnnoncesAValiderClient({ salles, highlightSalleId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [villeFilter, setVilleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(highlightSalleId ?? null);

  const villes = useMemo(() => {
    const set = new Set(salles.map((s) => s.city));
    return Array.from(set).sort();
  }, [salles]);

  const filtered = useMemo(() => {
    return salles.filter((s) => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchVille = villeFilter === "all" || s.city === villeFilter;
      return matchSearch && matchVille;
    });
  }, [salles, search, villeFilter]);

  const selected = selectedId ? filtered.find((s) => s.id === selectedId) : null;

  const featuresList = (s: SalleWithOwner) => {
    const f = s.features as { label?: string }[] | undefined;
    return Array.isArray(f) ? f.map((x) => x.label ?? "").filter(Boolean) : [];
  };

  const conditionsList = (s: SalleWithOwner) => {
    const c = s.conditions as { label?: string }[] | undefined;
    return Array.isArray(c) ? c.map((x) => x.label ?? "").filter(Boolean) : [];
  };

  return (
    <div className="flex gap-0">
      <div className="min-w-0 flex-1">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Clock className="h-7 w-7 text-amber-500" />
            Annonces à valider
          </h1>
          <p className="mt-1 text-slate-600">Examinez et validez les nouvelles annonces</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Nom de la salle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={villeFilter}
            onChange={(e) => setVilleFilter(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
          >
            <option value="all">Toutes les villes</option>
            {villes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-500">
            Toutes les dates
          </div>
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-500">
            Tous les scores
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <Clock className="h-4 w-4" />
            {filtered.length} annonce(s) en attente de validation
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.append("status", "approved");
              filtered.forEach((s) => fd.append("salleIds", s.id));
              startTransition(() =>
                validateSalleAction(fd).then(() => router.refresh())
              );
            }}
          >
            <Button
              type="submit"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
              disabled={filtered.length === 0 || isPending}
            >
              {isPending ? "En cours..." : "Tout valider"}
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <th className="px-4 py-3">Salle</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Propriétaire</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const img = Array.isArray(s.images) && s.images[0] ? s.images[0] : "/img.png";
                const { day, time } = formatDateShort(s.created_at);
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 transition hover:bg-slate-50 ${selectedId === s.id ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                          <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.capacity} places</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{s.city}</p>
                      <p className="truncate max-w-[100px] text-xs text-slate-500">
                        {s.address?.match(/\d{5}/)?.[0] ?? s.city}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                          {(s.owner?.full_name || s.owner?.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {s.owner?.full_name || "—"}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[120px]">
                            {s.owner?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{day}</p>
                      <p className="text-xs text-slate-500">{time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        En attente
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fd = new FormData();
                            fd.append("salleId", s.id);
                            fd.append("status", "approved");
                            startTransition(() =>
                              validateSalleAction(fd).then(() => router.refresh())
                            );
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
                          title="Valider"
                          disabled={isPending}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fd = new FormData();
                            fd.append("salleId", s.id);
                            fd.append("status", "rejected");
                            startTransition(() =>
                              validateSalleAction(fd).then(() => router.refresh())
                            );
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600"
                          title="Refuser"
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <Card className="mt-6">
            <CardContent className="py-12 text-center text-slate-600">
              Aucune annonce ne correspond aux critères.
            </CardContent>
          </Card>
        )}
      </div>

      {selected && (
        <aside className="hidden w-[380px] shrink-0 border-l border-slate-200 bg-white lg:block">
          <div className="sticky top-0 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Prévisualisation</h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={Array.isArray(selected.images) && selected.images[0] ? selected.images[0] : "/img.png"}
                  alt={selected.name}
                  fill
                  className="object-cover"
                  sizes="380px"
                />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />
                {selected.address}, {selected.city}
              </p>
              <div className="mt-4 flex gap-4">
                <div>
                  <p className="text-xs text-slate-500">Capacité</p>
                  <p className="font-medium text-slate-700">{selected.capacity} places</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prix</p>
                  <p className="font-medium text-slate-700">€{selected.price_per_day}/jour</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {selected.description || "Aucune description."}
              </p>
              {featuresList(selected).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700">Caractéristiques</h4>
                  <ul className="mt-2 space-y-1">
                    {featuresList(selected).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {conditionsList(selected).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700">Conditions</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {conditionsList(selected).join(". ")}
                  </p>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("salleId", selected.id);
                    fd.append("status", "approved");
                    startTransition(() =>
                      validateSalleAction(fd).then(() => router.refresh())
                    );
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Valider l&apos;annonce
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("salleId", selected.id);
                    fd.append("status", "rejected");
                    startTransition(() =>
                      validateSalleAction(fd).then(() => router.refresh())
                    );
                  }}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Refuser
                </Button>
              </div>
              <Link
                href={`/salles/${selected.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-sm text-blue-600 hover:underline"
              >
                Voir l&apos;annonce complète →
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* Preview mobile: modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSelectedId(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-semibold">Prévisualisation</h3>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={Array.isArray(selected.images) && selected.images[0] ? selected.images[0] : "/img.png"}
                  alt={selected.name}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />
                {selected.address}, {selected.city}
              </p>
              <p className="mt-4 text-sm text-slate-600">{selected.description || "Aucune description."}</p>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("salleId", selected.id);
                    fd.append("status", "approved");
                    startTransition(() =>
                      validateSalleAction(fd).then(() => router.refresh())
                    );
                  }}
                  className="w-full bg-emerald-600"
                  disabled={isPending}
                >
                  Valider
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("salleId", selected.id);
                    fd.append("status", "rejected");
                    startTransition(() =>
                      validateSalleAction(fd).then(() => router.refresh())
                    );
                  }}
                  className="border-red-200 text-red-600"
                  disabled={isPending}
                >
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
