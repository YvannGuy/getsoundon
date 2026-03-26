"use client";

import { useActionState } from "react";
import { useTransition, useState } from "react";
import { Lock, Trash2, User } from "lucide-react";

import {
  createTelegramLinkAction,
  deleteAccountAction,
  disconnectTelegramAction,
  sendTelegramTestAction,
  updateNotificationPreferencesAction,
  updatePasswordAction,
  updateProfileAction,
  type ParametresState,
} from "@/app/actions/parametres";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialState: ParametresState = {};

function formatLastPasswordChange(date: Date | null): string | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMonths = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
  if (diffMonths < 1) return "Dernière modification récemment";
  if (diffMonths === 1) return "Dernière modification il y a 1 mois";
  return `Dernière modification il y a ${diffMonths} mois`;
}

type ParametresContentProps = {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    last_password_change: string | null;
    telegram_chat_id?: string | null;
    notification_channel?: string | null;
  };
  /** Texte pour la section suppression (seeker vs owner) */
  deleteDataLabel?: string;
  /** Affiche un message sur la rétention du compte Stripe Connect */
  hasStripeConnect?: boolean;
};

export function ParametresContent({
  profile,
  deleteDataLabel = "annonces, demandes et messages",
  hasStripeConnect = false,
}: ParametresContentProps) {
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction] = useActionState(updatePasswordAction, initialState);
  const [notificationState, notificationAction] = useActionState(
    updateNotificationPreferencesAction,
    initialState
  );
  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [notificationPending, startNotificationTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [telegramPending, setTelegramPending] = useState<
    null | "connect" | "test" | "disconnect"
  >(null);
  const [telegramFeedback, setTelegramFeedback] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const notificationChannel = profile.notification_channel ?? "email";
  const telegramConnected = !!profile.telegram_chat_id;
  const lastPwdDate = profile.last_password_change
    ? new Date(profile.last_password_change)
    : null;

  return (
    <div className="space-y-8">
      {/* Profil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Gérez vos informations personnelles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => startProfileTransition(() => profileAction(fd))}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                  Prénom
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={firstName}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                  Nom
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={lastName}
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email ?? ""}
                readOnly
                className="bg-slate-50"
                placeholder="jean@example.com"
              />
              <p className="text-xs text-slate-500">
                L&apos;email ne peut pas être modifié ici.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Téléphone <span className="text-slate-400">(optionnel)</span>
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            {profileState.error && (
              <p className="text-sm text-red-600">{profileState.error}</p>
            )}
            {profileState.success && (
              <p className="text-sm text-emerald-600">{profileState.success}</p>
            )}
            <Button
              type="submit"
              disabled={profilePending}
              className="bg-gs-orange hover:brightness-95"
            >
              {profilePending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sécurité - sans 2FA ni sessions actives */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Protégez votre compte</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gs-orange/10 p-4 text-sm text-slate-700">
            Vos informations sont protégées et ne sont jamais partagées publiquement.
          </div>
          <form
            action={(fd) => startPasswordTransition(() => passwordAction(fd))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                Nouveau mot de passe
              </label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            {profile.last_password_change && (
              <p className="text-sm text-slate-500">
                {formatLastPasswordChange(lastPwdDate)}
              </p>
            )}
            {passwordState.error && (
              <p className="text-sm text-red-600">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-sm text-emerald-600">{passwordState.success}</p>
            )}
            <Button type="submit" disabled={passwordPending}>
              Modifier le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez recevoir vos alertes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={(fd) =>
              startNotificationTransition(() => notificationAction(fd))
            }
            className="space-y-3"
          >
            <div className="space-y-2">
              <label
                htmlFor="notificationChannel"
                className="text-sm font-medium text-slate-700"
              >
                Canal préféré
              </label>
              <select
                id="notificationChannel"
                name="notificationChannel"
                defaultValue={notificationChannel}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="both">Les deux</option>
              </select>
            </div>

            {notificationState.error && (
              <p className="text-sm text-red-600">{notificationState.error}</p>
            )}
            {notificationState.success && (
              <p className="text-sm text-emerald-600">
                {notificationState.success}
              </p>
            )}
            <Button type="submit" disabled={notificationPending}>
              {notificationPending
                ? "Enregistrement..."
                : "Enregistrer mes préférences"}
            </Button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">
              Telegram : {telegramConnected ? "Connecté" : "Non connecté"}
            </p>
            {telegramConnected && (
              <p className="mt-1 text-xs text-slate-500">
                Chat ID lié : {profile.telegram_chat_id}
              </p>
            )}
            {!telegramConnected && (
              <p className="mt-1 text-xs text-slate-500">
                Connectez Telegram pour recevoir les alertes instantanées.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={telegramPending !== null}
                onClick={async () => {
                  setTelegramError(null);
                  setTelegramFeedback(null);
                  setTelegramPending("connect");
                  const res = await createTelegramLinkAction();
                  if (!res.success || !res.url) {
                    setTelegramError(
                      res.error ?? "Impossible de générer le lien Telegram."
                    );
                    setTelegramPending(null);
                    return;
                  }
                  if (typeof window !== "undefined") {
                    window.open(res.url, "_blank", "noopener,noreferrer");
                  }
                  setTelegramFeedback(
                    "Lien Telegram ouvert. Cliquez sur Start dans le bot puis rafraîchissez la page."
                  );
                  setTelegramPending(null);
                }}
              >
                {telegramPending === "connect"
                  ? "Ouverture..."
                  : telegramConnected
                    ? "Reconnecter Telegram"
                    : "Connecter Telegram"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={telegramPending !== null || !telegramConnected}
                onClick={async () => {
                  setTelegramError(null);
                  setTelegramFeedback(null);
                  setTelegramPending("test");
                  const res = await sendTelegramTestAction();
                  if (res.error) setTelegramError(res.error);
                  if (res.success) setTelegramFeedback(res.success);
                  setTelegramPending(null);
                }}
              >
                {telegramPending === "test"
                  ? "Test..."
                  : "Tester Telegram"}
              </Button>
              {telegramConnected && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={telegramPending !== null}
                  onClick={async () => {
                    setTelegramError(null);
                    setTelegramFeedback(null);
                    setTelegramPending("disconnect");
                    const res = await disconnectTelegramAction();
                    if (res.error) setTelegramError(res.error);
                    if (res.success) setTelegramFeedback(res.success);
                    setTelegramPending(null);
                  }}
                >
                  {telegramPending === "disconnect"
                    ? "Déconnexion..."
                    : "Déconnecter"}
                </Button>
              )}
            </div>
            {telegramError && (
              <p className="mt-2 text-sm text-red-600">{telegramError}</p>
            )}
            {telegramFeedback && (
              <p className="mt-2 text-sm text-emerald-600">{telegramFeedback}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compte */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Compte</CardTitle>
              <CardDescription>Gérez les paramètres de votre compte</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-sm text-red-800">
            Cette action est irréversible. Toutes vos {deleteDataLabel} seront
            définitivement supprimées.
          </div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>Supprimer votre compte</DialogTitle>
            <DialogDescription>
              Êtes-vous certain de vouloir supprimer votre compte ? Cette action est
              irréversible. Toutes vos {deleteDataLabel} seront définitivement
              supprimés.
            </DialogDescription>
            {hasStripeConnect && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                Votre compte Stripe Connect restera enregistré côté Stripe pour
                l&apos;historique des paiements et les obligations légales. Vous
                pouvez demander sa suppression en contactant Stripe directement.
              </p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <form action={async () => { await deleteAccountAction(); }}>
              <Button variant="destructive" type="submit">
                Supprimer définitivement
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
