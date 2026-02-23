/**
 * Images des villes d'Île-de-France (photos des villes, pas des salles)
 * URLs Unsplash - photos libres de droit
 */
export const VILLE_IMAGES: Record<string, string> = {
  Paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  Versailles: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  "Saint-Denis": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80",
  Créteil: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Nanterre: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Boulogne-Billancourt": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80",
  Montreuil: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Argenteuil: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Colombes: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Courbevoie: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Vitry-sur-Seine": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Champigny-sur-Marne": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Saint-Maur-des-Fossés": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Neuilly-sur-Seine": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "Ivry-sur-Seine": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Levallois-Perret": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  Sarcelles: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Cergy: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Évry: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Évry-Courcouronnes": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Aulnay-sous-Bois": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Clichy: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  Meaux: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Fontenay-sous-Bois": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Drancy: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Noisy-le-Grand": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Antony: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Puteaux: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Épinay-sur-Seine": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Melun: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Chelles: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Fontainebleau: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  Rambouillet: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  "Saint-Germain-en-Laye": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
  Romainville: "/rmv.jpg",
};

/** Image par défaut pour les villes non mappées (vue Île-de-France / Paris) */
export const VILLE_IMAGE_DEFAULT =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80";

export function getVilleImage(ville: string): string {
  return VILLE_IMAGES[ville] ?? VILLE_IMAGE_DEFAULT;
}
