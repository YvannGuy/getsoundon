import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CreditCard,
  Headphones,
  Home,
  LayoutGrid,
  Package,
  PackageCheck,
  PlusCircle,
  Receipt,
  Settings,
  Truck,
  Users,
} from "lucide-react";

import type { EffectiveUserType } from "@/lib/auth-utils";

export type HeaderAccountMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const spaceLabel: Record<EffectiveUserType, string> = {
  seeker: "Tableau de bord",
  owner: "Tableau de bord",
  admin: "Administration",
};

/**
 * Liens raccourcis alignés sur les sidebars dashboard (sections principales).
 */
export function getHeaderAccountMenuItems(role: EffectiveUserType): HeaderAccountMenuItem[] {
  switch (role) {
    case "owner":
      return [
        { href: "/proprietaire", label: "Tableau de bord", icon: Home },
        { href: "/proprietaire/annonces", label: "Mes annonces", icon: LayoutGrid },
        { href: "/proprietaire/ajouter-annonce", label: "Ajouter une annonce", icon: PlusCircle },
        { href: "/proprietaire/materiel", label: "Réservations reçues", icon: Package },
        { href: "/proprietaire/commandes", label: "Mes commandes", icon: PackageCheck },
        { href: "/proprietaire/paiement", label: "Paiements", icon: CreditCard },
        { href: "/proprietaire/contrat", label: "Modèles & factures", icon: Receipt },
        { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
      ];
    case "admin":
      return [
        { href: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
        { href: "/admin/incidents-materiel", label: "Incidents matériel", icon: Package },
        { href: "/admin/materiel-annulations", label: "Annulations matériel", icon: Ban },
        { href: "/admin/conciergerie", label: "Conciergerie", icon: Headphones },
        { href: "/admin/parametres", label: "Paramètres", icon: Settings },
      ];
    default:
      // Dashboard unique : même navigation que l’espace propriétaire
      return [
        { href: "/proprietaire", label: "Tableau de bord", icon: Home },
        { href: "/proprietaire/annonces", label: "Mes annonces", icon: LayoutGrid },
        { href: "/proprietaire/ajouter-annonce", label: "Ajouter une annonce", icon: PlusCircle },
        { href: "/proprietaire/materiel", label: "Réservations reçues", icon: Package },
        { href: "/proprietaire/commandes", label: "Mes commandes", icon: PackageCheck },
        { href: "/proprietaire/paiement", label: "Paiements", icon: CreditCard },
        { href: "/proprietaire/contrat", label: "Modèles & factures", icon: Receipt },
        { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
      ];
  }
}

export function getHeaderAccountSpaceLabel(role: EffectiveUserType): string {
  return spaceLabel[role];
}
