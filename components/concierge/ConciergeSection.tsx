import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bolt, CalendarDays, ClipboardList, ListChecks } from "lucide-react";

const BULLETS = [
  "Shortlist de 3 à 5 salles adaptées",
  "Visites planifiées (créneaux confirmés)",
  "Récap clair : prix, contraintes, points forts",
];

export function ConciergeSection() {
  return (
    <section id="conciergerie" className="bg-[#f2f4f8] py-10 md:py-14">
      <div className="container max-w-[1240px]">
        <div className="overflow-hidden rounded-[30px]">
          <div className="grid items-center gap-8 md:grid-cols-[0.95fr_1.05fr] lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative z-10 px-6 py-6 sm:px-8 lg:px-6">
              <p className="text-center text-[18px] font-semibold leading-none text-[#213398] sm:text-[22px] lg:text-[24px]">
                Conciergerie Salledeculte
              </p>
              <h2 className="mt-2 text-center text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] text-[#06163f] sm:text-[42px] md:text-[46px]">
                De la recherche
                <br />à la{" "}
                <span className="text-[#213398] underline decoration-2 underline-offset-[8px]">
                  visite
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-[560px] text-center text-[18px] leading-[1.34] text-[#2f4773] sm:text-[20px] lg:text-[22px]">
                Vous n&apos;avez pas le temps de chercher ? Décrivez votre besoin,{" "}
                <span className="font-semibold text-[#213398]">on s&apos;occupe de tout.</span>
              </p>

              <ul className="mx-auto mt-5 max-w-[540px] space-y-3">
                <li className="flex items-center gap-3 rounded-2xl border border-[#edf2fb] bg-white px-4 py-3 text-[16px] text-[#1f2f53] shadow-[0_8px_22px_rgba(21,96,201,0.08)] sm:text-[17px]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f5ec8]/10 text-[#1f5ec8] shadow-sm">
                    <ListChecks className="h-5 w-5" />
                  </span>
                  {BULLETS[0]}
                </li>
                <li className="flex items-center gap-3 rounded-2xl border border-[#edf2fb] bg-white px-4 py-3 text-[16px] text-[#1f2f53] shadow-[0_8px_22px_rgba(21,96,201,0.08)] sm:text-[17px]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f5ec8]/10 text-[#1f5ec8] shadow-sm">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  {BULLETS[1]}
                </li>
                <li className="flex items-center gap-3 rounded-2xl border border-[#edf2fb] bg-white px-4 py-3 text-[16px] text-[#1f2f53] shadow-[0_8px_22px_rgba(21,96,201,0.08)] sm:text-[17px]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f5ec8]/10 text-[#1f5ec8] shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  {BULLETS[2]}
                </li>
              </ul>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/conciergerie"
                  className="inline-flex h-12 min-w-[250px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#213398] bg-[#213398] px-7 text-base font-semibold text-white shadow-[0_10px_22px_rgba(33,51,152,0.28)] transition hover:bg-[#1a2980]"
                >
                  <ArrowRight className="h-4 w-4" />
                  Confier ma recherche
                </Link>
                <Link
                  href="/conciergerie#comment-ca-marche"
                  className="inline-flex h-12 min-w-[200px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#213398]/40 bg-transparent px-7 text-base font-semibold text-[#213398] transition hover:bg-[#213398]/5"
                >
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="mt-4 flex items-center justify-center gap-2 text-base text-[#445b85]">
                <Bolt className="h-4 w-4" />
                Réponse sous 72h (selon disponibilité)
              </p>
            </div>

            <div className="relative z-0 hidden px-2 md:block md:justify-self-end md:w-full md:max-w-[700px] lg:max-w-[760px]">
              <div className="pointer-events-none absolute right-12 top-8 hidden h-[460px] w-[460px] rounded-full bg-[#dce9fe] opacity-70 blur-3xl md:block" />
              <div className="relative w-full">
                <Image
                  src="/img2.png"
                  alt="Conciergerie: recherche de lieux et shortlist personnalisée"
                  width={864}
                  height={951}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 1024px) 50vw, 760px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
