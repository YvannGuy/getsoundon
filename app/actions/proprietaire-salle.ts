"use server";

import { revalidatePath } from "next/cache";

import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "salle-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export async function getSalleForOwnerAction(
  id: string
): Promise<{ error?: string; salle?: Salle }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté" };

  const { data, error } = await supabase
    .from("salles")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Salle introuvable" };
  return { salle: rowToSalle(data as Parameters<typeof rowToSalle>[0]) };
}

export async function updateSalleOwnerAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "ID manquant" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: existing } = await supabase
    .from("salles")
    .select("id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Salle introuvable" };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const capacity = parseInt(String(formData.get("capacity") ?? "0"), 10);
  const pricePerDay = parseInt(String(formData.get("price_per_day") ?? "0"), 10);
  const description = String(formData.get("description") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const displayContactPhone = formData.get("display_contact_phone") === "1";

  if (!name || !city || !address || capacity <= 0 || pricePerDay <= 0) {
    return { success: false, error: "Champs obligatoires manquants ou invalides" };
  }

  let images: string[] = [];

  const keptImages = formData.get("images_keep");
  if (keptImages) {
    try {
      images = JSON.parse(String(keptImages)) as string[];
    } catch {
      images = [];
    }
  }

  const newPhotos = formData.getAll("photos") as File[];
  if (newPhotos.length > 0) {
    const validFiles = newPhotos.filter(
      (f) => f.size > 0 && ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
    );
    if (validFiles.length !== newPhotos.length) {
      return {
        success: false,
        error: "Photos invalides : JPG/PNG uniquement, max 5 Mo par fichier.",
      };
    }
    const prefix = user.id;
    const timestamp = Date.now();
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const ext = file.name.match(/\.(jpe?g|png)$/i)?.[1] ?? "jpg";
      const path = `${prefix}/${timestamp}-${i}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (error) return { success: false, error: `Upload échoué : ${error.message}` };
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      images.push(urlData.publicUrl);
    }
  }

  if (images.length === 0) images = ["/img.png"];

  const { error } = await supabase
    .from("salles")
    .update({
      name,
      city,
      address,
      capacity,
      price_per_day: pricePerDay,
      description,
      contact_phone: contactPhone,
      display_contact_phone: displayContactPhone,
      images,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/proprietaire");
  revalidatePath("/proprietaire/annonces");
  return { success: true };
}
