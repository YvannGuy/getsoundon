/** Motifs de signalement V1 (stockés en `reason_code`). */
export const GS_REPORT_REASONS = [
  { code: "spam", label: "Spam ou contenu trompeur" },
  { code: "misleading", label: "Annonce ou description trompeuse" },
  { code: "illegal", label: "Contenu ou usage présumé illicite" },
  { code: "harassment", label: "Comportement inapproprié / harcèlement" },
  { code: "other", label: "Autre" },
] as const;

export type GsReportReasonCode = (typeof GS_REPORT_REASONS)[number]["code"];

export const GS_REPORT_STATUSES = ["new", "in_review", "resolved", "dismissed"] as const;
export type GsReportStatus = (typeof GS_REPORT_STATUSES)[number];

export function gsReportStatusLabel(s: string): string {
  switch (s) {
    case "new":
      return "Nouveau";
    case "in_review":
      return "En cours";
    case "resolved":
      return "Traité";
    case "dismissed":
      return "Rejeté";
    default:
      return s;
  }
}

export function gsReportReasonLabel(code: string): string {
  return GS_REPORT_REASONS.find((r) => r.code === code)?.label ?? code;
}
