import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BULLETS = [
  "Shortlist de 3 à 5 salles adaptées",
  "Visites planifiées (créneaux confirmés)",
  "Récap clair : prix, contraintes, points forts",
];

export function ConciergeSection() {
  return (
    <section id="conciergerie" className="py-12">
      <div className="container max-w-[1120px]">
        <Card className="overflow-hidden border-[#213398]/20 bg-[#eef4fc] shadow-sm">
          <CardContent className="p-0 sm:p-0">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-stretch">
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <span className="inline-flex rounded-full bg-[#213398]/10 px-3 py-1 text-[12px] font-medium text-[#213398]">
                  Réponse sous 72h (selon disponibilité)
                </span>
                <h2 className="mt-3 text-[24px] font-bold leading-tight text-black sm:text-[28px]">
                  Conciergerie Salledeculte — De la recherche à la visite
                </h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  Vous n&apos;avez pas le temps de chercher ? Décrivez votre besoin. On vous propose une shortlist de
                  lieux compatibles et on organise les visites.
                </p>
                <ul className="mt-4 space-y-2">
                  {BULLETS.map((label) => (
                    <li key={label} className="flex items-center gap-2 text-[14px] text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      {label}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/conciergerie"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-[#213398] px-5 text-sm font-medium text-white transition hover:bg-[#1a2980]"
                  >
                    Confier ma recherche
                  </Link>
                  <Link
                    href="/conciergerie#comment-ca-marche"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-[#213398]/40 bg-transparent px-5 text-sm font-medium text-[#213398] transition hover:bg-[#213398]/5"
                  >
                    En savoir plus
                  </Link>
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[280px]">
                <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=85"
                  alt="Équipe autour de la table — on recherche pour vous les salles adaptées"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 340px"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
