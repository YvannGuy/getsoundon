import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Facebook, Gift, ImageIcon, Instagram, Linkedin, ListChecks, MapPin, Shield, Twitter, Users } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HeaderAuth } from "@/components/layout/header-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { siteConfig } from "@/config/site";

const plans = [
  {
    name: "Pass 24h",
    price: "19€",
    features: ["Demandes illimitées pendant 24h", "Accès complet aux annonces", "Support prioritaire"],
    cta: "Choisir ce pass",
  },
  {
    name: "Pass 48h",
    price: "29€",
    badge: "Plus populaire",
    features: ["Demandes illimitées pendant 48h", "Accès complet aux annonces", "Support prioritaire", "Historique des demandes"],
    cta: "Choisir ce pass",
    highlighted: true,
  },
  {
    name: "Abonnement Récurrence",
    price: "39€",
    period: "/mois",
    features: ["Demandes illimitées", "Accès complet aux annonces", "Support prioritaire 7j/7", "Gestion multi-événements", "Notifications personnalisées"],
    cta: "Choisir ce pass",
  },
];

const topFeatures = [
  {
    title: "Des annonces structurées",
    desc: "Capacité, équipements, horaires et contraintes clairement indiqués",
    icon: ListChecks,
  },
  {
    title: "Des photos représentatives",
    desc: "Visualisez réellement les lieux avant de contacter",
    icon: ImageIcon,
  },
  {
    title: "Des lieux compatibles",
    desc: "Conditions d'accueil et usage cultuel précisés à l'avance",
    icon: Shield,
  },
];

const steps = [
  {
    title: "Explorez librement",
    desc: "Parcourez les annonces et découvrez les salles disponibles dans votre région",
  },
  {
    title: "Envoyez vos demandes",
    desc: "Contactez directement les propriétaires pour vérifier la disponibilité",
  },
  {
    title: "Recevez les réponses",
    desc: "Obtenez rapidement des confirmations et organisez votre événement",
  },
];

const faqSectionItems = [
  {
    question: "Comment fonctionne la réservation ?",
    answer:
      "Vous parcourez les annonces, envoyez des demandes aux propriétaires et recevez leurs réponses directement. La plateforme facilite la mise en relation, mais la confirmation finale se fait entre vous et le propriétaire.",
  },
  {
    question: "Les salles sont-elles toutes adaptées aux événements cultuels ?",
    answer:
      "Chaque annonce précise les conditions d'accueil et d'usage. Vous pouvez filtrer selon vos critères pour voir uniquement les lieux compatibles.",
  },
  {
    question: "Puis-je annuler une demande ?",
    answer:
      "Oui, vous pouvez retirer une demande depuis votre espace personnel tant qu'elle n'a pas été confirmée.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#f3f6fa] text-slate-800">
      <header className="border-y border-slate-300 bg-[#f1f3f5]">
        <div className="container flex h-14 max-w-[1120px] items-center justify-between">
          <Link href="/" className="text-[34px] leading-none font-semibold text-slate-700 [zoom:0.37]">
            {siteConfig.name}
          </Link>
          <nav className="hidden items-center gap-8 text-[14px] font-semibold text-slate-500 md:flex">
            <a href="#" className="hover:text-slate-800">
              Rechercher
            </a>
            <a href="#comment-ca-marche" className="hover:text-slate-900">
              Comment ça marche
            </a>
            <a href="#tarifs" className="hover:text-slate-900">
              Tarifs
            </a>
            <a href="#" className="hover:text-slate-900">
              Déposer un lieu
            </a>
          </nav>
          <div className="flex items-center">
            <HeaderAuth />
          </div>
        </div>
      </header>

      <section className="container max-w-[1120px] py-8">
        <div className="rounded-xl bg-[#f3f6fa] p-3">
          <div className="grid items-center gap-8 rounded-xl px-5 pb-8 pt-6 lg:grid-cols-[1fr_1fr] lg:px-10">
            <div className="space-y-5">
              <h1 className="max-w-[480px] text-[56px] font-semibold leading-[1.03] tracking-[-0.03em] text-[#23384d] [zoom:0.56]">
                Trouvez une salle adaptée à votre événement culturel
              </h1>
              <p className="max-w-[430px] text-[13px] leading-relaxed text-slate-500">
                Une sélection de salles présentées avec précision, pour organiser vos événements culturels en toute sérénité.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="h-10 rounded-md bg-[#2a435c] px-5 text-[13px] hover:bg-[#22374d]">Rechercher une salle</Button>
                <Button variant="outline" className="h-10 rounded-md border-slate-400 px-5 text-[13px] text-slate-700">
                  Déposer un lieu
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Consultation gratuite
                </span>
                <span className="text-slate-300">•</span>
                <span>Informations essentielles visibles</span>
                <span className="text-slate-300">•</span>
                <span>Demandes rapides</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_22px_rgba(15,23,42,0.14)]">
              <Image
                src="/img.png"
                alt="Salle de culte"
                width={1200}
                height={700}
                className="h-[330px] w-full object-cover object-right-top"
                priority
              />
            </div>
          </div>

          <Card className="mx-auto max-w-[860px] border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <CardContent className="p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-700">Ville</p>
                  <div className="relative">
                    <Input placeholder="Paris, Lyon..." className="h-9 border-slate-200 pr-8 text-[12px]" />
                    <MapPin className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-700">Date</p>
                  <div className="relative">
                    <Input placeholder="mm/dd/yyyy" className="h-9 border-slate-200 pr-8 text-[12px]" />
                    <CalendarDays className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-700">Nombre de personnes</p>
                  <div className="relative">
                    <Input placeholder="50" className="h-9 border-slate-200 pr-8 text-[12px]" />
                    <Users className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-700">Type d&apos;événement</p>
                  <Select defaultValue="culte-regulier">
                    <SelectTrigger className="h-9 border-slate-200 text-[12px]">
                      <SelectValue placeholder="Type d'événement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="culte-regulier">Culte régulier</SelectItem>
                      <SelectItem value="conference">Conférence</SelectItem>
                      <SelectItem value="celebration">Célébration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="mt-4 h-10 w-full rounded-md bg-sky-500 text-[14px] font-medium hover:bg-sky-600">Voir les salles</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[46px] font-semibold tracking-[-0.02em] text-[#304256] [zoom:0.5]">Une plateforme pensée pour vous</h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">Des informations claires pour des décisions éclairées</p>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
            {topFeatures.map((item) => (
              <div key={item.title} className="px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100/70">
                  <item.icon className="h-5 w-5 text-sky-500" />
                </div>
                <h3 className="mt-4 text-[28px] font-semibold text-[#34485c] [zoom:0.5]">{item.title}</h3>
                <p className="mx-auto mt-2 max-w-[220px] text-[22px] leading-[1.45] text-slate-500 [zoom:0.5]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[50px] font-semibold tracking-[-0.02em] text-[#304256] [zoom:0.5]">Comment ça marche</h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">Trois étapes simples pour trouver votre salle</p>

          <div className="mx-auto mt-9 max-w-5xl">
            <div className="relative">
              <div className="absolute left-10 right-10 top-6 h-px bg-slate-200" />
              <div className="grid gap-4 md:grid-cols-3">
                {steps.map((step, idx) => (
                  <div key={step.title} className="text-center">
                    <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2e445a] text-[16px] font-semibold text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <p className="mt-4 text-[28px] font-semibold text-[#34485c] [zoom:0.5]">{step.title}</p>
                    <p className="mx-auto mt-2 max-w-[210px] text-[22px] leading-[1.45] text-slate-500 [zoom:0.5]">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#edf2f7] py-12">
        <div className="container max-w-[1120px]">
          <Card className="mx-auto max-w-3xl rounded-2xl border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.09)]">
            <CardContent className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100/70">
                <Gift className="h-5 w-5 text-sky-500" />
              </div>
              <h3 className="text-[48px] font-semibold tracking-[-0.02em] text-[#32475d] [zoom:0.5]">
                3 demandes offertes pour découvrir la plateforme
              </h3>
              <p className="text-[24px] text-slate-500 [zoom:0.5]">Testez notre service sans engagement et trouvez la salle idéale</p>
              <Button className="h-10 rounded-md bg-sky-500 px-7 text-[14px] hover:bg-sky-600">Activer mon essai</Button>
              <p className="text-[11px] text-slate-400">Valable une seule fois</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="tarifs" className="bg-[#f3f6fa] py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.02em] text-[#304256] [zoom:0.5]">Tarifs transparents</h2>
          <p className="mt-1 text-center text-[24px] text-slate-500 [zoom:0.5]">Choisissez la formule adaptée à vos besoins</p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "h-full border-sky-500 bg-sky-500 text-white shadow-[0_14px_26px_rgba(56,153,219,0.35)]"
                    : "h-full border-slate-200 bg-white"
                }
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="h-6">
                    {plan.badge ? (
                      <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold text-white">{plan.badge}</span>
                    ) : null}
                  </div>
                  <p
                    className={
                      plan.highlighted
                        ? "mt-3 min-h-[50px] text-[19px] font-semibold leading-[1.2] text-white"
                        : "mt-3 min-h-[50px] text-[19px] font-semibold leading-[1.2] text-[#34485c]"
                    }
                  >
                    {plan.name}
                  </p>
                  <p
                    className={
                      plan.highlighted
                        ? "mt-1 flex min-h-[44px] items-end text-[42px] font-semibold leading-none text-white"
                        : "mt-1 flex min-h-[44px] items-end text-[42px] font-semibold leading-none text-[#34485c]"
                    }
                  >
                    {plan.price}
                    {plan.period ? (
                      <span className={plan.highlighted ? "mb-1 ml-1 text-[14px] font-medium text-white/90" : "mb-1 ml-1 text-[14px] font-medium text-slate-500"}>{plan.period}</span>
                    ) : null}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className={plan.highlighted ? "flex items-start gap-2 text-[13px] leading-[1.35] text-white/95" : "flex items-start gap-2 text-[13px] leading-[1.35] text-slate-600"}>
                        <CheckCircle2 className={plan.highlighted ? "mt-0.5 h-4 w-4 text-white" : "mt-0.5 h-4 w-4 text-sky-500"} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex-shrink-0">
                    <Button
                      variant={plan.highlighted ? "secondary" : "outline"}
                      className={
                        plan.highlighted
                          ? "h-10 w-full border-0 bg-white text-[14px] font-semibold text-sky-500 hover:bg-sky-50"
                          : "h-10 w-full border-0 bg-slate-100 text-[14px] font-semibold text-slate-600 hover:bg-slate-200"
                      }
                  >
                    {plan.cta}
                  </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-[1120px]">
          <Card className="mx-auto max-w-5xl rounded-2xl border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <CardContent className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-10">
              <div className="space-y-5">
                <h3 className="text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#304256] [zoom:0.5]">Vous possédez une salle ?</h3>
                <p className="max-w-[520px] text-[24px] leading-[1.55] text-slate-500 [zoom:0.5]">
                  Publiez votre lieu gratuitement et recevez des demandes ciblées de la part d&apos;organisateurs d&apos;événements cultuels
                </p>
                <Button className="h-10 rounded-md bg-[#2a435c] px-6 text-[14px] font-semibold text-white hover:bg-[#22374d]">
                  Déposer ma salle
                </Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Image
                  src="/img2.png"
                  alt="Photo de salle"
                  width={1200}
                  height={700}
                  className="h-[230px] w-full object-cover object-center"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="faq" className="pb-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.02em] text-[#304256] [zoom:0.5]">Questions fréquentes</h2>
          <p className="mt-1 text-center text-[24px] text-slate-500 [zoom:0.5]">Tout ce que vous devez savoir</p>
          <div className="mx-auto mt-6 max-w-4xl">
            <Accordion type="single" collapsible defaultValue="item-0">
              {faqSectionItems.map((item, index) => (
                <AccordionItem key={item.question} value={`item-${index}`} className="mb-3 rounded-xl border-0 bg-[#eef2f6] px-4">
                  <AccordionTrigger className="py-4 text-[15px] font-semibold text-[#384b5e] hover:no-underline">{item.question}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-[13px] leading-[1.5] text-slate-500">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-8 text-center">
              <a href="#" className="text-[14px] font-semibold text-sky-500 hover:text-sky-600">
                Voir toutes les questions →
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#2d435a] py-12 text-slate-300">
        <div className="container max-w-[1120px]">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-[34px] font-semibold leading-none text-white [zoom:0.38]">{siteConfig.name}</p>
              <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-slate-300">
                La plateforme de référence pour trouver et proposer des salles dédiées aux événements cultuels.
              </p>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-white [zoom:0.5]">Plateforme</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li>Rechercher une salle</li>
                <li>Déposer un lieu</li>
                <li>Comment ça marche</li>
                <li>Tarifs</li>
              </ul>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-white [zoom:0.5]">Entreprise</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li>À propos</li>
                <li>Contact</li>
                <li>Blog</li>
                <li>Presse</li>
              </ul>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-white [zoom:0.5]">Légal</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li>Mentions légales</li>
                <li>CGU</li>
                <li>Confidentialité</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/15" />

          <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[13px] text-slate-300">© 2024 salledeculte.com. Tous droits réservés.</p>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                <a key={index} href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
