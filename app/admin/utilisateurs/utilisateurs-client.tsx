"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Eye,
  Pause,
  Play,
  Search,
  Trash2,
  Users,
  Zap,
  XCircle,
} from "lucide-react";

import {
  deleteUserAction,
  deleteUsersBulkAction,
  reactivateUserAction,
  suspendUserAction,
} from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserInfoModal } from "./user-info-modal";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  created_at: string;
  suspended?: boolean;
  salles_count?: number;
  demandes_count?: number;
  stripe_account_id?: string | null;
};

type Props = {
  users: UserRow[];
  highlightUserId?: string | null;
  stats: {
    total: number;
    actifs: number;
    owners: number;
    nouveaux7j: number;
  };
};

function formatType(type: string) {
  switch (type) {
    case "owner":
      return "Propriétaire";
    case "admin":
      return "Admin";
    default:
      return "Locataire";
  }
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatInscription(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`;
  return `il y a ${Math.floor(diffDays / 365)} an(s)`;
}

function getStatusBadge(suspended: boolean | undefined) {
  if (suspended) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        Suspendu
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" />
      Actif
    </span>
  );
}

function getTypeBadge(type: string, sallesCount?: number) {
  if (type === "admin") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Admin
      </span>
    );
  }
  if (type === "owner" || (sallesCount ?? 0) > 0) {
    return (
      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
        Propriétaire
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      Locataire
    </span>
  );
}

const shortId = (id: string) => `#${id.slice(0, 5)}`;

export function UtilisateursClient({ users, stats, highlightUserId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspendre" | "reactiver" | "supprimer";
    user: UserRow;
  } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<{
    userIds: string[];
    count: number;
  } | null>(null);

  useEffect(() => {
    if (highlightUserId && users.length > 0) {
      const user = users.find((u) => u.id === highlightUserId);
      if (user) {
        setViewUser(user);
        setViewOpen(true);
      }
    }
  }, [highlightUserId, users]);

  const [actionPending, setActionPending] = useState(false);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) ??
          false) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchType =
        typeFilter === "all" || u.user_type === typeFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "actif" && !u.suspended) ||
        (statusFilter === "suspendu" && u.suspended);
      return matchSearch && matchType && matchStatus;
    });
  }, [users, search, typeFilter, statusFilter]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((u) => u.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionPending(true);
    try {
      if (confirmAction.type === "supprimer") {
        const res = await deleteUserAction(confirmAction.user.id);
        if (res.success) {
          setConfirmAction(null);
          setSelectedIds(new Set());
          router.refresh();
        }
      } else if (confirmAction.type === "suspendre") {
        const res = await suspendUserAction(confirmAction.user.id);
        if (res.success) {
          setConfirmAction(null);
          router.refresh();
        }
      } else {
        const res = await reactivateUserAction(confirmAction.user.id);
        if (res.success) {
          setConfirmAction(null);
          router.refresh();
        }
      }
    } finally {
      setActionPending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirmBulkDelete) return;
    setActionPending(true);
    try {
      const res = await deleteUsersBulkAction(confirmBulkDelete.userIds);
      if (res.success) {
        setConfirmBulkDelete(null);
        setSelectedIds(new Set());
        router.refresh();
      }
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-black">
          <Users className="h-7 w-7 text-slate-600" />
          Utilisateurs
        </h1>
        <p className="mt-1 text-slate-600">
          Gérez et surveillez les comptes de la plateforme
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Nom / Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous</option>
              <option value="seeker">Locataire</option>
              <option value="owner">Propriétaire</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <Button className="bg-blue-600 hover:bg-blue-700">Filtrer</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-slate-600">Utilisateurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black">{stats.actifs}</p>
              <p className="text-sm text-slate-600">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100">
              <Building2 className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black">{stats.owners}</p>
              <p className="text-sm text-slate-600">Propriétaires</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <Zap className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black">
                {stats.nouveaux7j}
              </p>
              <p className="text-sm text-slate-600">Nouveaux (7j)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Sélectionner tout
              </label>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-slate-600">
                    {selectedIds.size} utilisateur{selectedIds.size > 1 ? "s" : ""} sélectionné
                    {selectedIds.size > 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfirmBulkDelete({
                        userIds: Array.from(selectedIds),
                        count: selectedIds.size,
                      })
                    }
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Tout désélectionner
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {filtered.map((u) => (
              <article key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-black">{u.full_name || "—"}</p>
                    <p className="truncate text-sm text-slate-600">{u.email}</p>
                    <p className="text-xs text-slate-500">ID: {shortId(u.id)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {getTypeBadge(u.user_type, u.salles_count)}
                  {getStatusBadge(u.suspended)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Inscrit le {formatDate(u.created_at)} ({formatInscription(u.created_at)})
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewUser(u);
                      setViewOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        type: u.suspended ? "reactiver" : "suspendre",
                        user: u,
                      })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title={u.suspended ? "Réactiver" : "Suspendre le profil"}
                  >
                    {u.suspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        type: "supprimer",
                        user: u,
                      })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-red-100 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Inscription</th>
                  <th className="px-4 py-3">Activité</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleOne(u.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-black">
                            {u.full_name || "—"}
                          </p>
                          <p className="text-xs text-slate-500">ID: {shortId(u.id)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(u.user_type, u.salles_count)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">
                        {formatDate(u.created_at)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatInscription(u.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-500">—</p>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(u.suspended)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setViewUser(u);
                            setViewOpen(true);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              type: u.suspended ? "reactiver" : "suspendre",
                              user: u,
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title={
                            u.suspended ? "Réactiver" : "Suspendre le profil"
                          }
                        >
                          {u.suspended ? (
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
                              user: u,
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-red-100 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              Aucun utilisateur ne correspond aux critères.
            </div>
          )}
        </CardContent>
      </Card>

      <UserInfoModal
        user={viewUser}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewUser(null);
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
                : confirmAction?.type === "suspendre"
                  ? "Suspendre le profil ?"
                  : "Réactiver le profil ?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-600">
            {confirmAction?.type === "supprimer" && (
              <>
                <p>
                  L&apos;utilisateur « {confirmAction.user.full_name || confirmAction.user.email} »
                  sera supprimé définitivement. Cette action est irréversible.
                </p>
                {confirmAction.user.stripe_account_id && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
                    Son compte Stripe Connect restera enregistré côté Stripe pour
                    l&apos;historique et les obligations légales.
                  </p>
                )}
              </>
            )}
            {confirmAction?.type === "suspendre" && (
              <p>
                Les annonces de « {confirmAction.user.full_name || confirmAction.user.email} » ne
                seront plus actives sur le site.
              </p>
            )}
            {confirmAction?.type === "reactiver" && (
              <p>
                Les annonces de « {confirmAction.user.full_name || confirmAction.user.email} » seront
                de nouveau visibles sur le site.
              </p>
            )}
          </div>
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
                  : confirmAction?.type === "suspendre"
                    ? "Suspendre"
                    : "Réactiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmBulkDelete}
        onOpenChange={(open) => !open && setConfirmBulkDelete(null)}
      >
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>Supprimer {confirmBulkDelete?.count ?? 0} utilisateur(s) ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              {confirmBulkDelete?.count === 1
                ? "Cet utilisateur sera supprimé définitivement. Cette action est irréversible."
                : `${confirmBulkDelete?.count ?? 0} utilisateurs seront supprimés définitivement. Cette action est irréversible.`}
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmBulkDelete(null)}
              disabled={actionPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={actionPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionPending ? "En cours..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
