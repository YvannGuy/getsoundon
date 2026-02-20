"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Clock,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteSalleAction,
  getSalleForAdminAction,
  validateSalleAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientPagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Salle } from "@/lib/types/salle";
import { AnnonceEditModal } from "./annonce-edit-modal";
import { AnnoncePreviewModal } from "./annonce-preview-modal";

type SalleRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  price_per_day: number;
  images: string[];
  status: string;
  views_count: number;
  demandes_count: number;
  owner?: { full_name: string | null; email: string | null };
};

type Props = {
  salles: SalleRow[];
  stats: { active: number; pending: number; rejected: number };
  highlightSalleId?: string;
};

function formatCity(city: string, address: string) {
  const postal = address?.match(/\d{5}/)?.[0];
  return postal ? `${city} ${postal}` : city;
}

export function AnnoncesClient({ salles, stats, highlightSalleId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [villeFilter, setVilleFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [previewSalle, setPreviewSalle] = useState<Salle | null>(null);
  const [previewOpen, setPreviewOpen] = useState(!!highlightSalleId);
  const [editSalle, setEditSalle] = useState<Salle | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "desactiver" | "reactiver" | "supprimer";
    salle: SalleRow;
  } | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const handleVoir = async (s: SalleRow) => {
    const res = await getSalleForAdminAction(s.id);
    if (res.salle) {
      setPreviewSalle(res.salle);
      setPreviewOpen(true);
    }
  };

  useEffect(() => {
    if (highlightSalleId) {
      getSalleForAdminAction(highlightSalleId).then((res) => {
        if (res.salle) {
          setPreviewSalle(res.salle);
          setPreviewOpen(true);
        }
      });
    }
  }, [highlightSalleId]);

  const handleModifier = async (s: SalleRow) => {
    const res = await getSalleForAdminAction(s.id);
    if (res.salle) {
      setEditSalle(res.salle);
      setEditOpen(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionPending(true);
    if (confirmAction.type === "supprimer") {
      const res = await deleteSalleAction(confirmAction.salle.id);
      if (res.success) {
        setConfirmAction(null);
        router.refresh();
      }
    } else {
      const status =
        confirmAction.type === "reactiver" ? "approved" : "rejected";
      const fd = new FormData();
      fd.append("salleId", confirmAction.salle.id);
      fd.append("status", status);
      const res = await validateSalleAction(fd);
      if (res?.success) {
        setConfirmAction(null);
        router.refresh();
      }
    }
    setActionPending(false);
  };

  const villes = useMemo(() => {
    const set = new Set(salles.map((s) => s.city));
    return Array.from(set).sort();
  }, [salles]);

  const owners = useMemo(() => {
    const set = new Set(salles.map((s) => s.owner?.full_name || s.owner?.email || "").filter(Boolean));
    return Array.from(set).sort();
  }, [salles]);

  const ADMIN_PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    return salles.filter((s) => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchVille = villeFilter === "all" || s.city === villeFilter;
      const matchOwner =
        ownerFilter === "all" ||
        (s.owner?.full_name === ownerFilter || s.owner?.email === ownerFilter);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchVille && matchOwner && matchStatus;
    });
  }, [salles, search, villeFilter, ownerFilter, statusFilter]);

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / ADMIN_PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const from = (safePage - 1) * ADMIN_PAGE_SIZE;
  const paginatedFiltered = filtered.slice(from, from + ADMIN_PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, villeFilter, ownerFilter, statusFilter]);

  const allSelected = paginatedFiltered.length > 0 && selectedIds.size === paginatedFiltered.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedFiltered.map((s) => s.id)));
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Active
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          En validation
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Désactivée
      </span>
    );
  };

  const shortId = (id: string) => `#${id.slice(0, 5)}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Building2 className="h-7 w-7 text-slate-600" />
          Annonces
        </h1>
        <p className="mt-1 text-slate-600">Gérez et surveillez les annonces de la plateforme</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
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
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous propriétaires</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="approved">Active</option>
              <option value="pending">En validation</option>
              <option value="rejected">Désactivée</option>
            </select>
            <Button className="bg-blue-600 hover:bg-blue-700">Filtrer</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              <p className="text-sm text-slate-600">Annonces actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-sm text-slate-600">En validation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
              <Pause className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
              <p className="text-sm text-slate-600">Désactivées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              Sélectionner tout
            </label>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled title="À venir">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle annonce
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3">Aperçu</th>
                  <th className="px-4 py-3">Salle</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Propriétaire</th>
                  <th className="px-4 py-3">Capacité</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Vues</th>
                  <th className="px-4 py-3">Demandes</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFiltered.map((s) => {
                  const img = Array.isArray(s.images) && s.images[0] ? s.images[0] : "/img.png";
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative h-12 w-16 overflow-hidden rounded bg-slate-100">
                          <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{shortId(s.id)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{formatCity(s.city, s.address)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                            {(s.owner?.full_name || s.owner?.email || "?")[0].toUpperCase()}
                          </div>
                          <p className="truncate max-w-[120px] text-sm text-slate-700">
                            {s.owner?.full_name || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{s.capacity} places</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">€{s.price_per_day} /jour</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">
                          {s.views_count.toLocaleString("fr-FR")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{s.demandes_count}</p>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleVoir(s)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Prévisualiser"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModifier(s)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type:
                                  s.status === "rejected" ? "reactiver" : "desactiver",
                                salle: s,
                              })
                            }
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            title={
                              s.status === "rejected"
                                ? "Réactiver"
                                : "Désactiver"
                            }
                          >
                            {s.status === "rejected" ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: "supprimer",
                                salle: s,
                              })
                            }
                            className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <div className="py-12 text-center text-slate-500">
              Aucune annonce ne correspond aux critères.
            </div>
          )}
          <ClientPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <AnnoncePreviewModal
        salle={previewSalle}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <AnnonceEditModal
        salle={editSalle}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditSalle(null);
        }}
      />

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "supprimer"
                ? "Supprimer définitivement ?"
                : confirmAction?.type === "desactiver"
                  ? "Désactiver l'annonce ?"
                  : "Réactiver l'annonce ?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {confirmAction?.type === "supprimer" && (
              <>
                L&apos;annonce « {confirmAction.salle.name} » sera supprimée
                définitivement. Cette action est irréversible.
              </>
            )}
            {confirmAction?.type === "desactiver" && (
              <>
                L&apos;annonce « {confirmAction.salle.name} » disparaîtra du site
                pour les visiteurs.
              </>
            )}
            {confirmAction?.type === "reactiver" && (
              <>
                L&apos;annonce « {confirmAction.salle.name} » sera de nouveau
                visible sur le site.
              </>
            )}
          </p>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={actionPending}
              className={
                confirmAction?.type === "supprimer"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {actionPending
                ? "En cours..."
                : confirmAction?.type === "supprimer"
                  ? "Supprimer"
                  : confirmAction?.type === "desactiver"
                    ? "Désactiver"
                    : "Réactiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
