"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Quand GetSoundOn sera disponible ?",
    a: "Le lancement public est prévu très prochainement. Les inscriptions à la liste d’attente sont traitées en priorité pour vous prévenir dès l’ouverture et les premières invitations.",
  },
  {
    q: "Qui peut s’inscrire ?",
    a: "Organisateurs, agences, lieux, associations comme prestataires techniques, loueurs et artisans du spectacle : la plateforme est pensée pour tous les acteurs de l’événementiel qui cherchent ou proposent du matériel et des services.",
  },
  {
    q: "Quels services seront proposés ?",
    a: "Sonorisation, éclairage, matériel DJ, écrans et vidéo, micros, livraison, installation et renfort technicien : vous pourrez parcourir des offres structurées et comparer des options adaptées à votre événement.",
  },
  {
    q: "Puis-je m’inscrire en tant que prestataire ?",
    a: "Oui. Indiquez « prestataire » dans le formulaire ci-dessus : nous vous contacterons pour la phase d’intégration et la sélection des premiers profils, afin de garantir une expérience fiable dès le départ.",
  },
];

export function ComingSoonFaq({ className }: { className?: string }) {
  return (
    <section id="faq" className={cn("scroll-mt-24", className)} aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible className="mt-8 w-full divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02] px-4">
        {ITEMS.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`} className="border-0">
            <AccordionTrigger className="py-5 text-left text-base font-medium text-white hover:text-white/90 hover:no-underline [&[data-state=open]>svg]:text-gs-orange">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-relaxed text-white/65">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
