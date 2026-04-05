"use client";

import { ReportTrigger } from "@/components/reporting/report-modal";

type Props = {
  providerId: string;
  displayName: string;
};

export function BoutiqueReportSection({ providerId, displayName }: Props) {
  return (
    <div className="landing-container border-b border-slate-200/80 bg-gs-beige pb-6 pt-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ReportTrigger
          variant="button"
          label="Signaler ce prestataire"
          target={{
            type: "provider",
            providerId,
            label: displayName,
          }}
          className="border-slate-300 text-slate-700"
        />
      </div>
    </div>
  );
}
