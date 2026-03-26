"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  intro?: string;
  bullets?: string[];
  paragraph?: string;
  /** Ligne mise en avant (accent charte) */
  highlight?: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Comment fonctionne la location sur GetSoundOn ?",
    intro: "GetSoundOn met en relation locataires et loueurs en quelques étapes simples :",
    bullets: [
      "Recherchez le matériel événementiel dont vous avez besoin (sono, DJ, lumières, etc.).",
      "Échangez avec le loueur et validez une offre (dates, lieu, options).",
      "Réglez en ligne de façon sécurisée : la réservation est confirmée selon les conditions affichées.",
    ],
    highlight:
      "Paiement et messagerie sont intégrés à la plateforme pour des échanges plus sereins.",
  },
  {
    question: "Quel type de matériel puis-je louer sur la plateforme ?",
    paragraph:
      "Enceintes, tables de mixage, platines, lumières, effets, accessoires… et parfois des services (livraison, installation, technicien) selon ce que chaque annonce propose. Le catalogue couvre les besoins des soirées, mariages, conférences et prestations pros.",
  },
  {
    question: "La location est-elle sécurisée ?",
    paragraph:
      "Les profils et annonces sont encadrés par la plateforme. Les échanges passent par la messagerie, les conditions (caution, dépôt, annulation) sont précisées dans l’offre et le contrat. Le paiement suit un parcours sécurisé adapté au modèle GetSoundOn.",
  },
  {
    question: "Comment proposer mon matériel en location ?",
    paragraph:
      "Créez un compte, complétez votre profil loueur, puis publiez une annonce avec photos, description, tarifs et options (retrait, livraison, zone d’intervention). Vous recevez les demandes et validez les offres qui vous conviennent.",
  },
  {
    question: "Quels sont les tarifs et les frais de service ?",
    paragraph:
      "Le prix affiché sur l’annonce est fixé par le loueur (souvent à la journée ou au forfait). Des frais de plateforme peuvent s’appliquer selon l’offre ; le détail vous est montré avant paiement, sans surprise au moment de valider.",
  },
  {
    question: "Combien de temps puis-je louer du matériel ?",
    paragraph:
      "La durée dépend de chaque annonce et de ce que vous convenez avec le loueur : quelques heures, une journée, un week-end ou plus. Indiquez vos dates dans la recherche ou la demande pour obtenir une offre adaptée.",
  },
  {
    question: "Comment se déroulent la livraison et la récupération ?",
    paragraph:
      "C’est défini annonce par annonce : retrait chez le loueur, livraison, ou les deux. Les modalités (créneaux, adresse, installation) sont précisées avant validation pour éviter les malentendus.",
  },
  {
    question: "Que faire en cas de problème avec le matériel loué ?",
    paragraph:
      "Contactez d’abord le loueur via la messagerie. En cas de litige persistant, documentez l’échange et sollicitez le support ou les procédures prévues dans les conditions générales et le contrat de location.",
  },
  {
    question: "Puis-je annuler ma réservation ?",
    paragraph:
      "Les règles d’annulation et de remboursement dépendent des conditions affichées sur l’offre et du moment où vous annulez. Vérifiez-les avant de payer ; elles font partie du contrat entre vous et le loueur.",
  },
  {
    question: "Qui peut utiliser GetSoundOn ?",
    paragraph:
      "Les particuliers qui organisent un événement, les DJ, les techniciens, les agences et toute structure pro qui a besoin de matériel ponctuel — ainsi que les loueurs, pros ou passionnés, qui mettent leur équipement à disposition.",
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    paragraph:
      "Les paiements en ligne passent par notre prestataire sécurisé (carte bancaire, selon les options activées). Le détail des moyens disponibles s’affiche au moment du règlement.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-16 md:py-20 lg:py-24">
      <div className="landing-container max-w-[1120px]">
        <p className="font-landing-overline text-center text-gs-orange">Questions fréquentes</p>
        <h2 className="font-landing-section-title mt-3 text-center text-gs-dark md:mt-4">
          Tout savoir sur {siteConfig.name}
        </h2>
        <p className="font-landing-body mx-auto mt-4 max-w-[640px] text-center text-[#5a5a5a] md:mt-5 md:text-lg md:leading-relaxed">
          Les réponses aux questions les plus posées sur notre plateforme de location de matériel
          événementiel, sono, DJ, lumières et services, entre particuliers et professionnels.
        </p>

        <div className="mt-12 grid items-start gap-4 md:mt-14 md:grid-cols-2 md:gap-5 lg:gap-6">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                key={item.question}
                className={cn(
                  "self-start rounded-xl border border-gs-line bg-white transition-shadow",
                  isOpen && "shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left md:px-6 md:py-5"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-trigger-${index}`}
                >
                  <span className="font-landing-heading text-[0.95rem] font-bold leading-snug text-gs-dark md:text-base">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0 text-gs-orange transition-transform duration-300 ease-out",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="font-landing-body space-y-3 border-t border-gs-line/80 px-5 pb-5 pt-4 leading-relaxed text-[#444] md:px-6 md:pb-6">
                      {item.intro ? <p>{item.intro}</p> : null}
                      {item.bullets?.length ? (
                        <ul className="list-inside list-disc space-y-2 pl-0.5 marker:text-gs-orange">
                          {item.bullets.map((line) => (
                            <li key={line} className="pl-1">
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {item.paragraph ? <p>{item.paragraph}</p> : null}
                      {item.highlight ? (
                        <p className="font-landing-body pt-1 text-sm font-semibold text-gs-orange md:text-[0.9375rem]">
                          {item.highlight}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="font-landing-body mt-10 text-center text-sm text-[#666] md:mt-12">
          Une question plus précise ?{" "}
          <Link
            href="/centre-aide"
            className="font-semibold text-gs-orange underline-offset-2 hover:underline"
          >
            Centre d&apos;aide
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
