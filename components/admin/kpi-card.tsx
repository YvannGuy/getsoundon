"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminKpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconWrapClassName?: string;
  iconClassName?: string;
};

export function AdminKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconWrapClassName,
  iconClassName,
}: AdminKpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {Icon ? (
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100",
              iconWrapClassName
            )}
          >
            <Icon className={cn("h-6 w-6 text-slate-600", iconClassName)} />
          </div>
        ) : null}
        <div>
          <p className="text-2xl font-bold text-black">{value}</p>
          <p className="text-sm text-slate-600">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
