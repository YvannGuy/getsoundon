import type { ReactNode } from "react";

type Props = {
  step: number;
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
  /** Mise en avant (ex. incident ouvert). */
  variant?: "default" | "emphasis";
};

export function MaterielDetailSection({
  step,
  title,
  description,
  id,
  children,
  variant = "default",
}: Props) {
  const surface =
    variant === "emphasis"
      ? "border-amber-200 bg-gradient-to-b from-amber-50/80 to-white"
      : "border-slate-200/90 bg-white";

  return (
    <section id={id} className={`scroll-mt-24 rounded-2xl border p-5 shadow-sm sm:p-6 ${surface}`}>
      <header className="mb-5 flex gap-4 border-b border-slate-100 pb-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Étape {step}</p>
          <h2 className="text-lg font-bold leading-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p> : null}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type FicheProps = {
  title: string;
  children: ReactNode;
};

/** Bloc résumé au-dessus des étapes numérotées. */
export function MaterielDetailFiche({ title, children }: FicheProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}
