/**
 * Validation serveur centralisée (Zod).
 * Préférer ces helpers dans les nouvelles routes / actions pour garder un format d’erreur cohérent.
 */

import { type ZodError, z } from "zod";

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError["issues"],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Parse le corps JSON d’une Request avec un schéma Zod. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Corps JSON invalide");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error), result.error.issues);
  }
  return result.data;
}

/**
 * Parse un FormData en objet plat (une valeur par clé ; pour champs multiples utiliser un schéma custom / parse manuel).
 */
export function parseFormData<T>(formData: FormData, schema: z.ZodType<T>): T {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const existing = obj[key];
      if (Array.isArray(existing)) {
        (existing as unknown[]).push(value);
      } else {
        obj[key] = [existing, value];
      }
    } else {
      obj[key] = value;
    }
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error), result.error.issues);
  }
  return result.data;
}
