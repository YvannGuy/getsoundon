/**
 * Segments « Parcourez le catalogue » : chaque tuile = filtre serveur (catégorie DB + mots-clés titre/description en OU).
 * Utiliser `?segment=enceintes` etc. — l’API applique la config, pas besoin de repasser category/q à la main.
 */

export const CATALOGUE_SEGMENTS = {
  enceintes: {
    category: "sound" as const,
    label: "Enceintes",
    /** Au moins un terme doit matcher (titre ou description), en plus de category=sound */
    textAnyOf: ["enceinte", "caisson", "line array", "subwoofer", "satellite", "sono portable"],
  },
  lumieres: {
    category: "lighting" as const,
    label: "Lumières",
    textAnyOf: ["lumière", "lumiere", "led", "lyre", "moving head", "pars", "barre led", "projecteur led"],
  },
  dj: {
    category: "dj" as const,
    label: "DJ",
  },
  videoprojecteurs: {
    category: "services" as const,
    label: "Vidéoprojecteurs",
    textAnyOf: [
      "vidéoprojecteur",
      "videoprojecteur",
      "video projecteur",
      "rétroprojecteur",
      "retroprojecteur",
      "vidéo projecteur",
    ],
  },
  microphones: {
    category: "sound" as const,
    label: "Microphones",
    textAnyOf: ["microphone", "micro", "micro fil", "micro hf", "sans fil", "serre-tête", "sm58"],
  },
  "tables-mixage": {
    category: "dj" as const,
    label: "Consoles de mixage",
    textAnyOf: [
      "table de mixage",
      "console de mixage",
      "consoles de mixage",
      "mixer",
      "mixage",
      "djm-",
      "xdj-",
      "contrôleur dj",
    ],
  },
} as const;

export type CatalogueSegmentSlug = keyof typeof CATALOGUE_SEGMENTS;

export function isCatalogueSegmentSlug(s: string): s is CatalogueSegmentSlug {
  return s in CATALOGUE_SEGMENTS;
}

/** Ordre d’affichage des 6 tuiles landing */
export const CATALOGUE_SEGMENT_ORDER: readonly CatalogueSegmentSlug[] = [
  "enceintes",
  "lumieres",
  "dj",
  "videoprojecteurs",
  "microphones",
  "tables-mixage",
] as const;
