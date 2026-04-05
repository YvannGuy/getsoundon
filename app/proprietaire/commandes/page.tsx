/**
 * « Mes commandes » prestataire : même écran opérationnel que Réservations
 * (liste, filtres, calendrier, check-in/out). L’ancienne réutilisation de la
 * vue client `/dashboard/materiel` était incohérente pour un owner.
 */
export const dynamic = "force-dynamic";

export { default } from "../materiel/page";
