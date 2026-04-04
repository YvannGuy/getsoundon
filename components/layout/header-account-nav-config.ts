import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CreditCard,
  Headphones,
  Home,
  LayoutGrid,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { EffectiveUserType } from "@/lib/auth-utils";

export type HeaderAccountMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const spaceLabel: Record<EffectiveUserType, string> = {
  seeker: "Espace locataire",
  owner: "Espace prestataire",
  admin: "Administration",
};

/**
 * Liens raccourcis alignés sur les sidebars dashboard (sections principales).
 */
export function getHeaderAccountMenuItems(role: EffectiveUserType): HeaderAccountMenuItem[] {
  switch (role) {
    case "owner":
      return [
        { href: "/proprietaire", label: "Vue d'ensemble", icon: Home },
        { href: "/proprietaire/annonces", label: "Mes annonces", icon: LayoutGrid },
        { href: "/proprietaire/materiel", label: "Locations matériel", icon: Package },
        { href: "/proprietaire/paiement", label: "Paiements", icon: CreditCard },
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
      return [
        { href: "/dashboard", label: "Vue d'ensemble", icon: Home },
        { href: "/catalogue", label: "Catalogue matériel", icon: Search },
        { href: "/panier", label: "Panier", icon: ShoppingCart },
        { href: "/dashboard/materiel", label: "Mes locations matériel", icon: Package },
        { href: "/dashboard/paiement", label: "Paiements & carte", icon: CreditCard },
        { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
      ];
  }
}

export function getHeaderAccountSpaceLabel(role: EffectiveUserType): string {
  return spaceLabel[role];
}
