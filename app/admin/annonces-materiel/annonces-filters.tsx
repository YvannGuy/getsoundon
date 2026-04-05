"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initial: {
    status: string;
    date_from: string;
    date_to: string;
    search: string;
  };
};

export function AdminAnnoncesFilters({ initial }: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="page" value="1" />
      <p className="text-sm font-medium text-slate-700">Filtres</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-slate-500">
            Statut
          </label>
          <select
            id="f-status"
            name="status"
            defaultValue={initial.status}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Toutes</option>
            <option value="pending">En attente (modération)</option>
            <option value="online">En ligne</option>
            <option value="rejected">Refusées</option>
            <option value="hidden">Masquées (validées, hors catalogue)</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-500">
            Créée à partir du
          </label>
          <Input id="f-from" name="date_from" type="date" defaultValue={initial.date_from} className="h-9" />
        </div>

        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-500">
            Créée jusqu’au
          </label>
          <Input id="f-to" name="date_to" type="date" defaultValue={initial.date_to} className="h-9" />
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
          <label htmlFor="f-search" className="mb-1 block text-xs font-medium text-slate-500">
            Recherche (titre / prestataire / email)
          </label>
          <Input
            id="f-search"
            name="search"
            defaultValue={initial.search}
            placeholder="Titre annonce, nom ou email prestataire"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
          Appliquer
        </Button>
        <Link
          href="/admin/annonces-materiel"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
