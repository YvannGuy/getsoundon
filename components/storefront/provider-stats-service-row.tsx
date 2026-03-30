import { Package, Truck, User, Wrench } from "lucide-react";

import { demoProvider } from "@/lib/provider-storefront-demo";

const iconMap = {
  truck: Truck,
  wrench: Wrench,
  user: User,
  package: Package,
} as const;

export function ProviderStatsServiceRow() {
  return (
    <div className="rounded-xl border border-gs-line bg-white/90 p-4 shadow-sm sm:p-5 md:p-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-10 md:gap-14">
          {demoProvider.stats.map((s) => (
            <div key={s.label} className="min-w-0 text-center sm:text-left">
              <p className="font-landing-heading text-2xl font-bold tabular-nums text-gs-dark sm:text-3xl md:text-[2rem]">
                {s.value}
              </p>
              <p className="font-landing-body mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888] sm:text-xs">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:justify-end lg:max-w-[50%] lg:justify-end">
          {demoProvider.serviceBadges.map((b) => {
            const Icon = iconMap[b.icon];
            return (
              <span
                key={b.id}
                className="font-landing-body inline-flex items-center gap-1.5 rounded-full border border-gs-line bg-white px-3 py-1.5 text-xs font-medium text-gs-dark shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5 text-gs-orange" strokeWidth={2} aria-hidden />
                {b.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
