import type { GsListingCancellationPolicy } from "@/lib/gs-booking-cancellation";
import { normalizeCancellationPolicy } from "@/lib/gs-booking-cancellation";

/** Libellé produit uniquement — la valeur stockée reste `moderate`. */
export function getCancellationPolicyLabel(policy: string | null | undefined): string {
  const p = normalizeCancellationPolicy(policy);
  switch (p) {
    case "flexible":
      return "Flexible";
    case "moderate":
      return "Standard";
    case "strict":
      return "Strict";
    default:
      return "Standard";
  }
}

export function getCancellationPolicyOptionDescription(policy: GsListingCancellationPolicy): string {
  switch (policy) {
    case "flexible":
      return "Plus rassurante pour le client, plus souple en cas d’annulation.";
    case "moderate":
      return "Bon équilibre entre protection du prestataire et souplesse commerciale.";
    case "strict":
      return "Plus protectrice pour les réservations engageantes ou le matériel à forte valeur.";
    default:
      return "";
  }
}

/** Lignes de résumé « remboursement du montant de location » (affichage locataire / prestataire). */
export function getCancellationPolicySummaryLines(policy: string | null | undefined): string[] {
  const p = normalizeCancellationPolicy(policy);
  switch (p) {
    case "flexible":
      return [
        "100 % si annulation plus de 7 jours avant la réservation",
        "50 % entre 7 jours et 2 jours",
        "0 % à moins de 2 jours",
      ];
    case "moderate":
      return [
        "100 % si annulation plus de 30 jours avant la réservation",
        "50 % entre 30 jours et 15 jours",
        "0 % à moins de 15 jours",
      ];
    case "strict":
      return [
        "100 % si annulation plus de 90 jours avant la réservation",
        "50 % entre 90 jours et 30 jours",
        "0 % à moins de 30 jours",
      ];
    default:
      return [];
  }
}

export function cancellationPolicyLegalNoteShort(): string {
  return "Les frais de service et les frais de traitement peuvent ne pas être remboursables. La caution n’est jamais une pénalité d’annulation.";
}
