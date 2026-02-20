export const REPORT_REASONS = [
  { id: "escroquerie", label: "Escroquerie" },
  { id: "fausse_annonce", label: "Fausse annonce" },
  { id: "contenu_inappropriate", label: "Contenu inapproprié" },
  { id: "informations_fausses", label: "Informations fausses ou trompeuses" },
  { id: "autres", label: "Autres (préciser dans les détails)" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export type ReportResult =
  | { success: true }
  | { success: false; error: string };
