/** Données statiques de démo pour la vitrine fournisseur (remplaçables par API plus tard). */

export type StorefrontCategory = {
  id: string;
  label: string;
  count: number;
};

export type StorefrontFeaturedItem = {
  id: string;
  title: string;
  categoryLabel: string;
  pricePerDay: number;
  imageSrc: string;
  featured?: boolean;
};

export type StorefrontCatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  pricePerDay: number;
  imageSrc: string;
  categoryId: string;
};

export const DEMO_PROVIDER_SLUG = "soundelite-paris";

export const demoProvider = {
  slug: DEMO_PROVIDER_SLUG,
  name: "SoundElite Paris",
  rating: 4.9,
  reviewCount: 124,
  location: "Paris, FR",
  heroImageSrc:
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=2000&q=80",
  stats: [
    { value: "98%", label: "TAUX DE RÉPONSE" },
    { value: "< 5 min", label: "TEMPS DE RÉPONSE" },
    { value: "100%", label: "APPROUVÉ" },
  ] as const,
  serviceBadges: [
    { id: "livraison", label: "Livraison", icon: "truck" as const },
    { id: "installation", label: "Installation", icon: "wrench" as const },
    { id: "technicien", label: "Technicien", icon: "user" as const },
    { id: "retrait", label: "Retrait sur place", icon: "package" as const },
  ],
};

export const demoCategories: StorefrontCategory[] = [
  { id: "all", label: "Toutes les catégories", count: 52 },
  { id: "sono", label: "Sono", count: 24 },
  { id: "lumiere", label: "Lumière", count: 13 },
  { id: "dj", label: "DJ", count: 10 },
  { id: "video", label: "Vidéo", count: 5 },
];

export const demoFeaturedListings: StorefrontFeaturedItem[] = [
  {
    id: "f1",
    title: "Pioneer CDJ-3000 Nexus",
    categoryLabel: "DJ GEAR",
    pricePerDay: 120,
    imageSrc: "https://images.unsplash.com/photo-1571266028243-e473233ed277?auto=format&fit=crop&w=900&q=80",
    featured: true,
  },
  {
    id: "f2",
    title: "L-Acoustics Syva System",
    categoryLabel: "SYSTÈME SON",
    pricePerDay: 280,
    imageSrc: "https://images.unsplash.com/photo-1526478806334-569fd4597cd8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "f3",
    title: "Allen & Heath dLive S5000",
    categoryLabel: "CONSOLE",
    pricePerDay: 195,
    imageSrc: "https://images.unsplash.com/photo-1598653222009-875b4987288f?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "f4",
    title: "Chauvet Maverick MK2",
    categoryLabel: "LUMIÈRE",
    pricePerDay: 85,
    imageSrc: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
  },
];

export const demoCatalogItems: StorefrontCatalogItem[] = [
  {
    id: "c1",
    title: "JBL EON 715",
    subtitle: "Enceinte active 15' - 1000W",
    pricePerDay: 45,
    categoryId: "sono",
    imageSrc: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c2",
    title: "Shure SM58",
    subtitle: "Micro dynamique",
    pricePerDay: 8,
    categoryId: "sono",
    imageSrc: "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c3",
    title: "Chauvet Wash FX",
    subtitle: "Projecteur wash LED",
    pricePerDay: 25,
    categoryId: "lumiere",
    imageSrc: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c4",
    title: "Neumann U87 Ai",
    subtitle: "Micro studio large membrane",
    pricePerDay: 120,
    categoryId: "sono",
    imageSrc: "https://images.unsplash.com/photo-1589883661923-6476cb3ae7f2?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c5",
    title: "Pioneer DDJ-1000",
    subtitle: "Contrôleur DJ 4 voies",
    pricePerDay: 35,
    categoryId: "dj",
    imageSrc: "https://images.unsplash.com/photo-1571330735066-03abc1fccf8a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c6",
    title: "Yamaha HS8 (Pair)",
    subtitle: "Moniteurs studio 8 pouces",
    pricePerDay: 28,
    categoryId: "sono",
    imageSrc: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=900&q=80",
  },
];
