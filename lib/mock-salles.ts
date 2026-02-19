/**
 * Salles en Île-de-France uniquement.
 * Les coordonnées lat/lng sont toutes dans la région.
 */
export type Salle = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  pricePerDay: number;
  description: string;
  images: string[];
  features: { label: string; sublabel?: string; icon: string }[];
  conditions: { label: string; icon: string }[];
  pricingInclusions: string[];
  lat?: number;
  lng?: number;
};

export const mockSalles: Salle[] = [
  {
    id: "1",
    slug: "espace-lumiere-paris",
    name: "Espace Lumière - Paris",
    city: "Paris",
    address: "Paris, France",
    capacity: 120,
    pricePerDay: 800,
    description:
      "L'Espace Lumière est un lieu d'exception situé à proximité de Paris, idéal pour accueillir vos cérémonies religieuses, conférences ou événements culturels. Doté d'un cadre moderne et chaleureux, il offre des espaces polyvalents adaptés à tous types de rassemblements. La luminosité naturelle et l'équipement professionnel en font un choix privilégié pour vos événements.",
    images: ["/img.png", "/img.png", "/img2.png", "/img2.png"],
    features: [
      { label: "ERP sur mesure", icon: "check" },
      { label: "Parking", sublabel: "30 places disponibles à proximité", icon: "parking" },
      { label: "Accès PMR", sublabel: "Accessible aux personnes à mobilité réduite", icon: "wheelchair" },
      { label: "Mobilier", sublabel: "Chaises et tables modulables incluses", icon: "furniture" },
      { label: "Sonorisation", sublabel: "Système audio professionnel inclus", icon: "speaker" },
      { label: "Wi-Fi", sublabel: "Connexion internet très haut débit", icon: "wifi" },
    ],
    conditions: [
      { label: "Horaires d'accueil - Du mardi au dimanche, de 09h00 à 22h00", icon: "clock" },
      {
        label: "Restrictions sonores - Niveau sonore modéré requis après 20h00",
        icon: "volume",
      },
      {
        label:
          "Types d'événements acceptés - Cérémonies religieuses, conférences ou séminaires, événements culturels et communautaires",
        icon: "list",
      },
    ],
    pricingInclusions: [
      "Location de la salle pour la journée",
      "Mobilier et équipements",
      "Système de sonorisation",
    ],
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    id: "2",
    slug: "salle-harmonie",
    name: "Salle Harmonie",
    city: "Paris",
    address: "Paris, France",
    capacity: 100,
    pricePerDay: 900,
    description: "Salle polyvalente au cœur de Paris.",
    images: ["/img.png", "/img2.png"],
    features: [
      { label: "ERP non soumis", icon: "check" },
      { label: "Parking à proximité", icon: "parking" },
      { label: "PMR", icon: "wheelchair" },
    ],
    conditions: [{ label: "Du lundi au samedi, 8h-20h", icon: "clock" }],
    pricingInclusions: ["Location journée", "Mobilier"],
    lat: 48.8628,
    lng: 2.3292,
  },
  {
    id: "3",
    slug: "espace-serenite",
    name: "Espace Sérénité",
    city: "Paris",
    address: "Paris, France",
    capacity: 100,
    pricePerDay: 750,
    description: "Un espace lumineux et apaisant.",
    images: ["/img2.png", "/img.png"],
    features: [
      { label: "ERP non soumis", icon: "check" },
      { label: "Parking", icon: "parking" },
    ],
    conditions: [{ label: "Tous les jours, 9h-21h", icon: "clock" }],
    pricingInclusions: ["Location journée", "Équipement sonore"],
    lat: 48.8503,
    lng: 2.3703,
  },
  {
    id: "4",
    slug: "salle-saint-germain",
    name: "Salle Saint-Germain",
    city: "Paris",
    address: "7ème arrondissement, Paris",
    capacity: 200,
    pricePerDay: 450,
    description: "Grande salle de conférence.",
    images: ["/img.png"],
    lat: 48.8595,
    lng: 2.3272,
    features: [
      { label: "ERP", icon: "check" },
      { label: "Parking", icon: "parking" },
    ],
    conditions: [],
    pricingInclusions: ["Location"],
  },
  {
    id: "5",
    slug: "auditorium-montparnasse",
    name: "Auditorium Montparnasse",
    city: "Paris",
    address: "14ème arrondissement, Paris",
    capacity: 150,
    pricePerDay: 380,
    description: "Auditorium équipé.",
    images: ["/img2.png"],
    lat: 48.8402,
    lng: 2.3225,
    features: [
      { label: "ERP", icon: "check" },
      { label: "Sono", icon: "speaker" },
    ],
    conditions: [],
    pricingInclusions: [],
  },
  {
    id: "6",
    slug: "centre-paroissial-notre-dame",
    name: "Centre Paroissial Notre-Dame",
    city: "Paris",
    address: "4ème arrondissement, Paris",
    capacity: 300,
    pricePerDay: 320,
    description: "Centre paroissial historique.",
    images: ["/img.png"],
    lat: 48.8534,
    lng: 2.3488,
    features: [
      { label: "ERP", icon: "check" },
      { label: "PMR", icon: "wheelchair" },
      { label: "Parking", icon: "parking" },
    ],
    conditions: [],
    pricingInclusions: [],
  },
  {
    id: "7",
    slug: "espace-culturel-marais",
    name: "Espace Culturel Marais",
    city: "Paris",
    address: "3ème arrondissement, Paris",
    capacity: 180,
    pricePerDay: 520,
    description: "Espace culturel modulable.",
    images: ["/img2.png"],
    lat: 48.8599,
    lng: 2.3609,
    features: [
      { label: "ERP", icon: "check" },
      { label: "Vidéo", icon: "video" },
    ],
    conditions: [],
    pricingInclusions: [],
  },
  {
    id: "8",
    slug: "chapelle-saint-paul",
    name: "Chapelle Saint-Paul",
    city: "Paris",
    address: "Paris",
    capacity: 120,
    pricePerDay: 280,
    description: "Chapelle patrimoniale.",
    images: ["/img.png"],
    lat: 48.8476,
    lng: 2.3397,
    features: [
      { label: "ERP", icon: "check" },
      { label: "Piano", icon: "piano" },
    ],
    conditions: [],
    pricingInclusions: [],
  },
  {
    id: "9",
    slug: "centre-communautaire-republique",
    name: "Centre Communautaire République",
    city: "Paris",
    address: "11ème arrondissement, Paris",
    capacity: 250,
    pricePerDay: 420,
    description: "Salle communautaire avec scène.",
    images: ["/img2.png"],
    lat: 48.8575,
    lng: 2.3736,
    features: [
      { label: "ERP", icon: "check" },
      { label: "PMR", icon: "wheelchair" },
      { label: "Cuisine", icon: "kitchen" },
    ],
    conditions: [],
    pricingInclusions: [],
  },
];

export function getSalleBySlug(slug: string): Salle | undefined {
  return mockSalles.find((s) => s.slug === slug);
}

export function getSallesByCity(city: string): Salle[] {
  return mockSalles.filter((s) => s.city.toLowerCase() === city.toLowerCase());
}
