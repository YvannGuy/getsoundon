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

/**
 * Grille remboursement (% du montant de location) — source unique pour fiche annonce,
 * dashboards et guidance admin (évite dérive entre écrans).
 */
export const CANCELLATION_POLICY_REFUND_GRID_LINES: Record<
  GsListingCancellationPolicy,
  readonly string[]
> = {
  flexible: [
    "100 % si annulation plus de 7 jours avant la réservation",
    "50 % entre 7 jours et 2 jours",
    "0 % à moins de 2 jours",
  ],
  moderate: [
    "100 % si annulation plus de 30 jours avant la réservation",
    "50 % entre 30 jours et 15 jours",
    "0 % à moins de 15 jours",
  ],
  strict: [
    "100 % si annulation plus de 90 jours avant la réservation",
    "50 % entre 90 jours et 30 jours",
    "0 % à moins de 30 jours",
  ],
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
 * Aligné sur les grilles Flexible / Standard / Strict affichées client / prestataire.
 */
export function adminPolicyGuidanceText(
  policy: GsListingCancellationPolicy,
  startDateIso: string,
  totalEur: number,
): string {
  const start = parseISO(`${startDateIso}T12:00:00`);
  const daysUntilStart = differenceInCalendarDays(start, new Date());
  const t = Number.isFinite(totalEur) ? totalEur : 0;
  const label = POLICY_LABELS[policy];
  const grid = CANCELLATION_POLICY_REFUND_GRID_LINES[policy];
  const gridSentence = grid.join(" ; ");
  return (
    `${label} — Jusqu’au début de la location : ${daysUntilStart} j. calendaires. ` +
    `Grille indicative affichée côté annonce (remboursement du montant de location) : ${gridSentence}. ` +
    `Montant location de référence : ${t} €. ` +
    `Ces éléments servent de base de décision ; l’admin tranche au cas par cas (contexte, preuves, bonne foi).`
  );
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
