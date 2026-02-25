import type { LucideIcon } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
};

export function AdminPageHeader({ title, subtitle, icon: Icon }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="flex items-center gap-2 text-xl font-bold text-black md:text-2xl">
        {Icon ? <Icon className="h-6 w-6 text-slate-600 md:h-7 md:w-7" /> : null}
        {title}
      </h1>
      {subtitle ? <p className="text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
