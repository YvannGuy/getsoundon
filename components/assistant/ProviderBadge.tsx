"use client";

import { cn } from "@/lib/utils";

type Props = { label: string; active?: boolean; icon?: React.ReactNode };

export function ProviderBadge({ label, active, icon }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        active
          ? "border-gs-orange/40 bg-gs-orange/10 text-gs-orange"
          : "border-slate-200 bg-white text-slate-500"
      )}
    >
      {icon}
      {label}
    </span>
  );
}
