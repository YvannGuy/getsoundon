"use server";

import { revalidatePath } from "next/cache";

import type { Salle } from "@/lib/types/salle";
import { rowToSalle } from "@/lib/types/salle";
import { createAdminClient } from "@/lib/supabase/admin";
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

const JOUR_TO_DOW: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function updateSalleVisitesCalendarAction(params: {
  salleId: string;
  joursVisite: string[];
  horairesParJour: Record<string, { debut: string; fin: string }>;
}): Promise<{ success: boolean; error?: string }> {
  const { salleId, joursVisite, horairesParJour } = params;
  if (!salleId) return { success: false, error: "Salle manquante" };

  for (const jour of joursVisite) {
    const h = horairesParJour[jour];
    if (!h?.debut || !h?.fin) {
      return { success: false, error: `Horaires manquants pour ${jour}` };
    }
    if (h.debut >= h.fin) {
      return { success: false, error: `Heures invalides pour ${jour}` };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: salle } = await supabase
    .from("salles")
    .select("id")
    .eq("id", salleId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salle) return { success: false, error: "Salle introuvable" };

  const selectedDows = new Set(
    joursVisite
      .map((j) => JOUR_TO_DOW[j])
      .filter((v): v is number => typeof v === "number")
  );
  const DOW_TO_JOUR: Record<number, string> = {
    0: "dimanche",
    1: "lundi",
    2: "mardi",
    3: "mercredi",
    4: "jeudi",
    5: "vendredi",
    6: "samedi",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const generatedDates: string[] = [];
  for (let i = 0; i < 7 * 12; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (selectedDows.has(d.getDay())) {
      generatedDates.push(toYmd(d));
    }
  }

  const horairesParDate: Record<string, { debut: string; fin: string }> = {};
  for (const date of generatedDates) {
    const dow = new Date(`${date}T12:00:00`).getDay();
    const jour = DOW_TO_JOUR[dow];
    const h = horairesParJour[jour];
    if (h?.debut && h?.fin) {
      horairesParDate[date] = { debut: h.debut, fin: h.fin };
    }
  }

  const firstJour = joursVisite[0];
  const firstHoraires = firstJour ? horairesParJour[firstJour] : null;

  const { error } = await supabase
    .from("salles")
    .update({
      jours_visite: joursVisite.length > 0 ? joursVisite : null,
      visite_dates: generatedDates.length > 0 ? generatedDates : null,
      visite_heure_debut: firstHoraires?.debut ? `${firstHoraires.debut}:00` : null,
      visite_heure_fin: firstHoraires?.fin ? `${firstHoraires.fin}:00` : null,
      visite_horaires_par_date:
        generatedDates.length > 0 ? (horairesParDate as unknown as object) : null,
      horaires_par_jour: Object.keys(horairesParJour).length > 0 ? horairesParJour : {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", salleId)
    .eq("owner_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/proprietaire/visites");
  revalidatePath("/proprietaire");
  return { success: true };
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function getSalleLocationBlockedDatesAction(salleId: string): Promise<{
  success: boolean;
  dates?: string[];
  error?: string;
}> {
  if (!salleId) return { success: false, error: "Salle manquante" };

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: salle } = await supabase
    .from("salles")
    .select("id")
    .eq("id", salleId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salle) return { success: false, error: "Salle introuvable" };

  const { data, error } = await admin
    .from("salle_location_exclusions")
    .select("date_exclusion")
    .eq("salle_id", salleId)
    .order("date_exclusion", { ascending: true });

  if (error) return { success: false, error: error.message };

  const dates = [...new Set((data ?? []).map((r) => String((r as { date_exclusion: string }).date_exclusion).slice(0, 10)))];
  return { success: true, dates };
}

export async function addSalleLocationBlockedDateAction(params: {
  salleId: string;
  date: string;
}): Promise<{ success: boolean; error?: string }> {
  const { salleId, date } = params;
  if (!salleId) return { success: false, error: "Salle manquante" };
  if (!isValidIsoDate(date)) return { success: false, error: "Date invalide" };

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: salle } = await supabase
    .from("salles")
    .select("id, slug")
    .eq("id", salleId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salle) return { success: false, error: "Salle introuvable" };

  const { error } = await admin.from("salle_location_exclusions").upsert(
    {
      salle_id: salleId,
      date_exclusion: date,
      source: "owner_manual",
      created_by: user.id,
    },
    { onConflict: "salle_id,date_exclusion" }
  );
  if (error) return { success: false, error: error.message };

  revalidatePath("/proprietaire/visites");
  const slug = (salle as { slug?: string | null }).slug;
  if (slug) revalidatePath(`/salles/${slug}`);
  return { success: true };
}

export async function removeSalleLocationBlockedDateAction(params: {
  salleId: string;
  date: string;
}): Promise<{ success: boolean; error?: string }> {
  const { salleId, date } = params;
  if (!salleId) return { success: false, error: "Salle manquante" };
  if (!isValidIsoDate(date)) return { success: false, error: "Date invalide" };

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: salle } = await supabase
    .from("salles")
    .select("id, slug")
    .eq("id", salleId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salle) return { success: false, error: "Salle introuvable" };

  const { error } = await admin
    .from("salle_location_exclusions")
    .delete()
    .eq("salle_id", salleId)
    .eq("date_exclusion", date);
  if (error) return { success: false, error: error.message };

  revalidatePath("/proprietaire/visites");
  const slug = (salle as { slug?: string | null }).slug;
  if (slug) revalidatePath(`/salles/${slug}`);
  return { success: true };
}
