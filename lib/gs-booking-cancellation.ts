import { differenceInCalendarDays, parseISO } from "date-fns";

/** Politique stockée sur `gs_listings.cancellation_policy` */
export type GsListingCancellationPolicy = "flexible" | "moderate" | "strict";

export const GS_CANCELLATION_POLICIES: GsListingCancellationPolicy[] = ["flexible", "moderate", "strict"];

export type GsCancellationRequestStatus =
  | "pending"
  | "rejected"
  | "approved_no_refund"
  | "approved_partial_refund"
  | "approved_full_refund";

export type GsBookingForCancellationEligibility = {
  id: string;
  customer_id: string;
  status: string;
  stripe_payment_intent_id: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  incident_status: string | null;
  payout_status: string | null;
};

export type GsCancellationRequestRow = {
  id: string;
  booking_id: string;
  status: GsCancellationRequestStatus;
  reason: string;
  requested_at: string;
  decided_at: string | null;
  admin_note: string | null;
  refund_amount_eur: number | string | null;
  stripe_refund_id: string | null;
};

export const CANCELLATION_STATUS_LABELS: Record<GsCancellationRequestStatus, string> = {
  pending: "Demande envoyée — en cours d’examen",
  rejected: "Demande refusée",
  approved_no_refund: "Annulation acceptée — sans remboursement",
  approved_partial_refund: "Annulation acceptée — remboursement partiel",
  approved_full_refund: "Annulation acceptée — remboursement total",
};

export const POLICY_LABELS: Record<GsListingCancellationPolicy, string> = {
  flexible: "Flexible (indicatif)",
  /** Valeur SQL `moderate` — libellé produit « Standard », jamais « Modérée » côté UI. */
  moderate: "Standard (indicatif)",
  strict: "Strict (indicatif)",
};

export function normalizeCancellationPolicy(
  raw: string | null | undefined,
): GsListingCancellationPolicy {
  const v = (raw ?? "moderate").toLowerCase();
  if (v === "flexible" || v === "moderate" || v === "strict") return v;
  return "moderate";
}

/**
 * Indications pour l’admin (pas une obligation légale — décision manuelle).
 */
export function adminPolicyGuidanceText(
  policy: GsListingCancellationPolicy,
  startDateIso: string,
  totalEur: number,
): string {
  const start = parseISO(`${startDateIso}T12:00:00`);
  const days = differenceInCalendarDays(start, new Date());
  const t = Number.isFinite(totalEur) ? totalEur : 0;

  switch (policy) {
    case "flexible":
      return `Politique annonce : flexible. En général remboursement intégral si l’événement est dans ${days} j. (montant location ${t} €).`;
    case "moderate":
      return `Politique annonce : standard (moderate). Grille indicative type J-30 / J-15 — à trancher selon le contexte (${t} €).`;
    case "strict":
      return `Politique annonce : stricte. Souvent pas de remboursement sauf exception ; à trancher selon le contexte (${t} €).`;
    default:
      return "";
  }
}

export type CancellationEligibility =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function evaluateCancellationRequestEligibility(
  booking: GsBookingForCancellationEligibility,
  existing: GsCancellationRequestRow[],
): CancellationEligibility {
  if (booking.incident_status === "open") {
    return {
      ok: false,
      code: "incident_open",
      message: "Une demande d’annulation n’est pas possible tant qu’un incident est ouvert.",
    };
  }

  if (booking.check_out_status === "confirmed") {
    return {
      ok: false,
      code: "check_out_done",
      message: "Le retour du matériel est déjà confirmé. Contactez le support si besoin.",
    };
  }

  if (booking.payout_status === "paid") {
    return {
      ok: false,
      code: "payout_done",
      message: "Le versement au prestataire est effectué. L’annulation se gère avec l’équipe GetSoundOn.",
    };
  }

  const terminal = new Set<GsCancellationRequestStatus>([
    "approved_no_refund",
    "approved_partial_refund",
    "approved_full_refund",
  ]);
  if (existing.some((r) => terminal.has(r.status))) {
    return {
      ok: false,
      code: "already_resolved",
      message: "Une décision d’annulation a déjà été prise pour cette réservation.",
    };
  }

  if (existing.some((r) => r.status === "pending")) {
    return {
      ok: false,
      code: "pending_exists",
      message: "Une demande est déjà en cours d’examen.",
    };
  }

  const blockedStatuses = new Set(["cancelled", "refused", "completed"]);
  if (blockedStatuses.has(booking.status)) {
    return {
      ok: false,
      code: "booking_closed",
      message: "Cette réservation ne peut plus faire l’objet d’une demande d’annulation.",
    };
  }

  return { ok: true };
}

export type AdminDecisionType =
  | "reject"
  | "approve_no_refund"
  | "approve_partial"
  | "approve_full";
