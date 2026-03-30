import { z } from "zod";

import { EQUIPMENT_CATEGORY_IDS, OTHER_KEY } from "./equipment.types";

const categoryEnum = z.enum(EQUIPMENT_CATEGORY_IDS);

/** Bloc identité matériel — utilisé à l’étape 6 (listingKind = equipment). */
export const equipmentIdentityZod = z
  .object({
    eqCategoryId: categoryEnum,
    eqSubcategoryId: z.string().min(1, "Choisissez une sous-catégorie."),
    eqBrandKey: z.string().min(1, "Choisissez une marque ou « Autre marque »."),
    eqModelKey: z.string().min(1, "Choisissez un modèle ou « Autre modèle »."),
    eqCustomBrand: z.string(),
    eqCustomModel: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.eqBrandKey === OTHER_KEY) {
      if (!data.eqCustomBrand.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez la marque ou choisissez-la dans la liste.",
          path: ["eqCustomBrand"],
        });
      }
    }
    if (data.eqModelKey === OTHER_KEY) {
      if (!data.eqCustomModel.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez le modèle ou choisissez-le dans la liste.",
          path: ["eqCustomModel"],
        });
      }
    }
  });

export type EquipmentIdentityZodInput = z.infer<typeof equipmentIdentityZod>;

export function formatEquipmentZodError(e: z.ZodError): string {
  const first = e.issues[0];
  return first?.message ?? "Données invalides.";
}
