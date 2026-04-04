"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initial: {
    numero: string;
    status: string;
    date_from: string;
    date_to: string;
    booking_id: string;
    prestataire: string;
    client: string;
  };
};

export function AdminFacturesFilters({ initial }: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="page" value="1" />
      <p className="text-sm font-medium text-slate-700">Filtres</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label htmlFor="f-numero" className="mb-1 block text-xs font-medium text-slate-500">
            N° facture
          </label>
          <Input
            id="f-numero"
            name="numero"
            defaultValue={initial.numero}
            placeholder="Ex. GS-202604-…"
            className="h-9"
          />
        </div>
        <div>
          <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-slate-500">
            Statut
          </label>
          <select
            id="f-status"
            name="status"
            defaultValue={initial.status || "all"}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Tous</option>
            <option value="issued">Émise</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-500">
            Émise à partir du
          </label>
          <Input id="f-from" name="date_from" type="date" defaultValue={initial.date_from} className="h-9" />
        </div>
        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-500">
            Émise jusqu’au
          </label>
          <Input id="f-to" name="date_to" type="date" defaultValue={initial.date_to} className="h-9" />
        </div>
        <div>
          <label htmlFor="f-booking" className="mb-1 block text-xs font-medium text-slate-500">
            Réservation (UUID)
          </label>
          <Input
            id="f-booking"
            name="booking_id"
            defaultValue={initial.booking_id}
            placeholder="UUID complet"
            className="h-9 font-mono text-xs"
          />
        </div>
        <div>
          <label htmlFor="f-presta" className="mb-1 block text-xs font-medium text-slate-500">
            Prestataire (nom ou e-mail)
          </label>
          <Input id="f-presta" name="prestataire" defaultValue={initial.prestataire} className="h-9" />
        </div>
        <div>
          <label htmlFor="f-client" className="mb-1 block text-xs font-medium text-slate-500">
            Client (nom ou e-mail)
          </label>
          <Input id="f-client" name="client" defaultValue={initial.client} className="h-9" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
          Appliquer
        </Button>
        <Link
          href="/admin/factures"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
