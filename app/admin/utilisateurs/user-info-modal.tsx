"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  created_at: string;
  suspended?: boolean;
  listings_count?: number;
};

type Props = {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function UserInfoModal({ user, open, onOpenChange }: Props) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showClose>
        <DialogHeader>
          <DialogTitle>Informations utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Nom</p>
            <p className="text-black">{user.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Email</p>
            <p className="text-black">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Type</p>
            <p className="text-black">{formatType(user.user_type)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Inscription</p>
            <p className="text-black">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Statut</p>
            <p className="text-black">
              {user.suspended ? (
                <span className="text-amber-600 font-medium">Suspendu</span>
              ) : (
                <span className="text-emerald-600 font-medium">Actif</span>
              )}
            </p>
          </div>
          {user.listings_count !== undefined && (
            <div>
              <p className="text-sm font-medium text-slate-500">Annonces catalogue (matériel)</p>
              <p className="text-black">{user.listings_count}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
