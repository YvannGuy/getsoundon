"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initial: {
    status: string;
    payout_status: string;
    incident: string;
    date_from: string;
    date_to: string;
    search: string;
  };
};

export function AdminReservationsFilters({ initial }: Props) {
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
            Statut réservation
          </label>
          <select
            id="f-status"
            name="status"
            defaultValue={initial.status}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="accepted">Acceptée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
            <option value="refused">Refusée</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-payout" className="mb-1 block text-xs font-medium text-slate-500">
            Statut payout
          </label>
          <select
            id="f-payout"
            name="payout_status"
            defaultValue={initial.payout_status}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="scheduled">Planifié</option>
            <option value="paid">Payé</option>
            <option value="blocked">Bloqué</option>
            <option value="failed">Échoué</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-incident" className="mb-1 block text-xs font-medium text-slate-500">
            Incident
          </label>
          <select
            id="f-incident"
            name="incident"
            defaultValue={initial.incident}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="open">Incident ouvert</option>
            <option value="none">Aucun incident</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-500">
            Début à partir du
          </label>
          <Input id="f-from" name="date_from" type="date" defaultValue={initial.date_from} className="h-9" />
        </div>

        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-500">
            Début jusqu’au
          </label>
          <Input id="f-to" name="date_to" type="date" defaultValue={initial.date_to} className="h-9" />
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
          <label htmlFor="f-search" className="mb-1 block text-xs font-medium text-slate-500">
            Recherche (client / prestataire / annonce)
          </label>
          <Input
            id="f-search"
            name="search"
            defaultValue={initial.search}
            placeholder="Nom ou e-mail client/prestataire, titre d’annonce"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
          Appliquer
        </Button>
        <Link
          href="/admin/reservations-materiel"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
