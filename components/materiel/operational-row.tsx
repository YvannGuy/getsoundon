import type { ElementType } from "react";

type Props = {
  label: string;
  icon: ElementType;
  statusText: string;
  done: boolean;
  pending?: boolean;
};

export function MaterielOperationalRow({ label, icon: Icon, statusText, done, pending = false }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={`h-4 w-4 shrink-0 ${done ? "text-emerald-500" : pending ? "text-blue-500" : "text-slate-300"}`}
        />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span
        className={`shrink-0 text-right text-[12px] ${
          done ? "text-emerald-600" : pending ? "text-blue-600" : "text-slate-400"
        }`}
      >
        {statusText}
      </span>
    </div>
  );
}
