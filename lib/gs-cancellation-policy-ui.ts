import type { GsListingCancellationPolicy } from "@/lib/gs-booking-cancellation";
import {
  CANCELLATION_POLICY_REFUND_GRID_LINES,
  normalizeCancellationPolicy,
} from "@/lib/gs-booking-cancellation";

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
  return [...CANCELLATION_POLICY_REFUND_GRID_LINES[p]];
}

export function cancellationPolicyLegalNoteShort(): string {
  return "Les frais de service et les frais de traitement peuvent ne pas être remboursables. La caution n’est jamais une pénalité d’annulation.";
}
