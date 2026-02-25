"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Lock,
  Percent,
  RefreshCw,
  Settings,
  Shield,
  UserMinus,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

import {
  addAdminAction,
  removeAdminAction,
  savePlatformSettingsAction,
  type PlatformSettings,
} from "@/app/actions/admin-settings";
import { AdminPageHeaderClient } from "@/components/admin/page-header-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  isOwner: boolean;
};

type NonAdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
};

type Props = {
  settings: PlatformSettings;
  admins: AdminRow[];
  nonAdminUsers: NonAdminUser[];
  stripeConnected: boolean;
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ParametresClient({
  settings,
  admins,
  nonAdminUsers,
  stripeConnected,
}: Props) {
  const router = useRouter();
  const [formState, setFormState] = useState(settings);
  const [pending, setPending] = useState(false);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [addAdminPending, setAddAdminPending] = useState(false);
  const [confirmRemoveAdmin, setConfirmRemoveAdmin] = useState<AdminRow | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setPending(true);
    setSaveError(null);
    const fd = new FormData();
    fd.append("pass_price_24h", String(formState.pass.price_24h / 100));
    fd.append("pass_price_48h", String(formState.pass.price_48h / 100));
    fd.append("pass_price_abonnement", String(formState.pass.price_abonnement / 100));
    fd.append("pass_demandes_gratuites", String(formState.pass.demandes_gratuites));
    fd.append("pass_24h_enabled", formState.pass.pass_24h_enabled ? "on" : "");
    fd.append("pass_48h_enabled", formState.pass.pass_48h_enabled ? "on" : "");
    fd.append("pass_abonnement_enabled", formState.pass.abonnement_enabled ? "on" : "");
    fd.append("validation_manuelle", formState.validation.validation_manuelle ? "on" : "");
    fd.append("validation_mode", formState.validation.mode_publication);
    fd.append("commission_fixed_fee_eur", String((formState.commission.fixed_fee_cents ?? 1500) / 100));
    fd.append("commission_ponctuel", formState.commission.ponctuel ? "on" : "");
    fd.append("commission_mensuel", formState.commission.mensuel ? "on" : "");

    const res = await savePlatformSettingsAction(fd);
    setPending(false);
    if (res.error) setSaveError(res.error);
    else router.refresh();
  };

  const handleAddAdmin = async (userId: string) => {
    setAddAdminError(null);
    setAddAdminPending(true);
    const res = await addAdminAction(userId);
    setAddAdminPending(false);
    if (res.error) setAddAdminError(res.error);
    else {
      setAddAdminModalOpen(false);
      router.refresh();
    }
  };

  const handleRemoveAdmin = async () => {
    const admin = confirmRemoveAdmin;
    if (!admin) return;
    await removeAdminAction(admin.id);
    setConfirmRemoveAdmin(null);
    router.refresh();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeaderClient
        title="Paramètres"
        subtitle="Configuration globale de la plateforme et gestion des accès admin."
        icon={Settings}
      />

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400" />
              Validation annonces
            </CardTitle>
            <p className="text-sm text-slate-500">
              Configuration du processus de validation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-700">
                Activer la validation manuelle des annonces
              </label>
              <Toggle
                checked={formState.validation.validation_manuelle}
                onChange={(v) =>
                  setFormState((s) => ({
                    ...s,
                    validation: { ...s.validation, validation_manuelle: v },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mode de publication</label>
              <div className="mt-2 flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="validation_mode"
                    checked={formState.validation.mode_publication === "manual"}
                    onChange={() =>
                      setFormState((s) => ({
                        ...s,
                        validation: { ...s.validation, mode_publication: "manual" },
                      }))
                    }
                    className="border-slate-300 text-blue-600"
                  />
                  <span className="text-sm">Nécessite validation admin</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="validation_mode"
                    checked={formState.validation.mode_publication === "auto"}
                    onChange={() =>
                      setFormState((s) => ({
                        ...s,
                        validation: { ...s.validation, mode_publication: "auto" },
                      }))
                    }
                    className="border-slate-300 text-blue-600"
                  />
                  <span className="text-sm">Publier automatiquement</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4 text-slate-500" />
              Frais plateforme
            </CardTitle>
            <p className="text-sm text-slate-500">
              Frais appliqués aux paiements Stripe Connect (ponctuel / mensuel)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Montant fixe frais plateforme (€)</label>
              <Input
                type="number"
                min={0}
                max={500}
                step={0.5}
                value={String((formState.commission.fixed_fee_cents ?? 1500) / 100)}
                onChange={(e) =>
                  setFormState((s) => ({
                    ...s,
                    commission: {
                      ...s.commission,
                      fixed_fee_cents: Math.max(
                        0,
                        Math.round((parseFloat(e.target.value || "0") || 0) * 100)
                      ),
                    },
                  }))
                }
                className="mt-1 w-24"
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Appliquer sur événement ponctuel</span>
                <Toggle
                  checked={formState.commission.ponctuel}
                  onChange={(v) =>
                    setFormState((s) => ({
                      ...s,
                      commission: { ...s.commission, ponctuel: v },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Appliquer sur événement mensuel</span>
                <Toggle
                  checked={formState.commission.mensuel}
                  onChange={(v) =>
                    setFormState((s) => ({
                      ...s,
                      commission: { ...s.commission, mensuel: v },
                    }))
                  }
                />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Ponctuel:{" "}
              <span className="font-medium text-slate-800">
                {formState.commission.ponctuel ? "Activé" : "Désactivé"}
              </span>
              {" · "}
              Mensuel:{" "}
              <span className="font-medium text-slate-800">
                {formState.commission.mensuel ? "Activé" : "Désactivé"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-slate-500" />
              Paiements / Stripe
            </CardTitle>
            <p className="text-sm text-slate-500">Configuration des paiements</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeConnected ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="font-medium text-emerald-800">Stripe Connecté</p>
                <p className="text-sm text-emerald-700">Clés API configurées</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-medium text-amber-800">Stripe non configuré</p>
                <p className="text-sm text-amber-700">Configurez STRIPE_SECRET_KEY et NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY dans .env</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open("https://dashboard.stripe.com", "_blank", "noopener")}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Ouvrir Stripe
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open("https://dashboard.stripe.com/apikeys", "_blank", "noopener")}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Reconnecter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-red-500" />
                  Gestion rôles admin
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Gérer les administrateurs de la plateforme. Les admins peuvent se connecter via auth admin.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600"
                onClick={() => {
                  setAddAdminError(null);
                  setAddAdminModalOpen(true);
                }}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Ajouter admin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {admins.map((a) => (
                <article key={a.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{a.full_name || "—"}</p>
                      <p className="truncate text-sm text-slate-600">{a.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{a.role}</p>
                    </div>
                    {a.isOwner ? (
                      <span className="text-xs text-slate-500">Propriétaire</span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setConfirmRemoveAdmin(a)}
                        title="Retirer les droits admin"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-slate-500">
                  <th className="py-2">Admin</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Rôle</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {(a.full_name || a.email || "?")[0].toUpperCase()}
                        </div>
                        <span className="font-medium">{a.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-slate-600">{a.email}</td>
                    <td className="py-3 text-sm">{a.role}</td>
                    <td className="py-3">
                      {a.isOwner ? (
                        <span className="text-xs text-slate-500">Propriétaire</span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setConfirmRemoveAdmin(a)}
                          title="Retirer les droits admin"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex flex-col items-end gap-2">
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={pending}
          >
            <Lock className="mr-2 h-4 w-4" />
            {pending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>

      <Dialog open={!!confirmRemoveAdmin} onOpenChange={(open) => !open && setConfirmRemoveAdmin(null)}>
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Retirer les droits admin
            </DialogTitle>
          </DialogHeader>
          {confirmRemoveAdmin && (
            <p className="text-sm text-slate-600">
              Retirer les droits administrateur de <strong>{confirmRemoveAdmin.full_name || confirmRemoveAdmin.email}</strong> ? Il ne pourra plus accéder au back-office admin.
            </p>
          )}
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmRemoveAdmin(null)}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleRemoveAdmin}
            >
              Retirer admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addAdminModalOpen} onOpenChange={setAddAdminModalOpen}>
        <DialogContent showClose className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un administrateur
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Sélectionnez un utilisateur à promouvoir admin. Il pourra se connecter via /auth/admin.
          </p>
          {addAdminError && (
            <p className="text-sm text-red-600">{addAdminError}</p>
          )}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            {nonAdminUsers.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">Aucun utilisateur à promouvoir</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {nonAdminUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => handleAddAdmin(u.id)}
                      disabled={addAdminPending}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-black truncate">{u.full_name || "—"}</p>
                        <p className="text-sm text-slate-500 truncate">{u.email}</p>
                      </div>
                      <span className="text-xs text-slate-400 capitalize">{u.user_type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
