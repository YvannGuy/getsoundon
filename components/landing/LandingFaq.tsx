"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const items = [
  {
    q: "Comment réserver un équipement ?",
    a: "Parcourez le catalogue, ouvrez une annonce et envoyez une demande au propriétaire. Après acceptation de l’offre, le paiement sécurisé confirme la réservation.",
  },
  {
    q: "La livraison est-elle incluse ?",
    a: "Cela dépend de l’annonce : retrait, livraison ou les deux peuvent être proposés. Les modalités figurent sur la fiche matériel et dans l’offre.",
  },
  {
    q: "Puis-je ajouter un technicien ?",
    a: "Si le prestataire le propose, vous pouvez en discuter via la messagerie avant de valider l’offre.",
  },
  {
    q: "Comment fonctionne la caution ?",
    a: "Le montant et les conditions de dépôt ou de pré-autorisation sont indiqués dans l’offre et le contrat associé.",
  },
  {
    q: "Puis-je vendre mon matériel en location ?",
    a: "GetSoundOn met en relation pour la location. La vente directe n’est pas le cœur du service ; concentrez-vous sur la mise en location de votre matériel.",
  },
  {
    q: "Plus de questions...",
    a: "Consultez notre centre d’aide ou contactez le support depuis votre espace.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section scroll-mt-24 bg-gs-beige">
      <div className="landing-container max-w-[800px]">
        <h2 className="font-landing-section-title text-center text-gs-dark">Questions fréquentes</h2>
        <div className="mt-10 space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="overflow-hidden rounded-xl border border-gs-line bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-landing-heading text-[15px] font-semibold text-gs-dark">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-gs-orange transition-transform duration-[400ms] ease-out ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-[400ms] ease-out motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-landing-body px-5 pb-4 leading-relaxed text-[#444]">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
