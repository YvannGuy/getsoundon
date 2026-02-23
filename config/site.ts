type PricingPlan = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  priceId?: string;
  highlighted?: boolean;
};

export const siteConfig = {
  name: "salledeculte.com",
  description: "Trouvez et réservez une salle adaptée à vos événements cultuels en Île-de-France.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  instagram: "https://www.instagram.com/salledeculte/",
  facebook: "https://www.facebook.com/profile.php?id=61588281587238",
  /** Date de lancement pour la page Coming Soon (format ISO) */
  launchDate: process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-03-02T00:00:00",
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Pack 25",
    price: 19,
    description: "Idéal pour découvrir la plateforme.",
    features: ["25 crédits mensuels", "Diffusion prioritaire des annonces", "Support email"],
    priceId: process.env.STRIPE_PRICE_STARTER,
  },
  {
    id: "pro",
    name: "Pack 50",
    price: 29,
    description: "Le plan recommandé pour un usage régulier.",
    features: ["50 crédits mensuels", "Mise en avant des demandes", "Tableau de bord avancé"],
    priceId: process.env.STRIPE_PRICE_PRO,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Pack 100",
    price: 39,
    description: "Pour les structures avec de gros volumes.",
    features: ["100 crédits mensuels", "Support prioritaire", "Accompagnement onboarding"],
    priceId: process.env.STRIPE_PRICE_ENTERPRISE,
  },
];
