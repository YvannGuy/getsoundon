"use server";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { mapOnboardingToSalle } from "@/lib/onboarding-to-salle";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "salle-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateSlug(nom: string): string {
  const base = slugify(nom) || "salle";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export type CreateSalleResult =
  | { success: true; slug?: string; status: "approved" | "pending" }
  | { success: false; error: string };

export async function createSalleFromOnboarding(formData: FormData): Promise<CreateSalleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour ajouter une salle." };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const ville = String(formData.get("ville") ?? "").trim();
  const capacite = String(formData.get("capacite") ?? "");
  const adresse = String(formData.get("adresse") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const department = postalCode ? postalCode.slice(0, 2) : null;
  const latStr = String(formData.get("lat") ?? "").trim();
  const lngStr = String(formData.get("lng") ?? "").trim();
  let lat = latStr ? parseFloat(latStr) : null;
  let lng = lngStr ? parseFloat(lngStr) : null;

  if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && adresse) {
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search?q=${encodeURIComponent(adresse)}&limit=1`
      );
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        lng = coords[0];
        lat = coords[1];
      }
    } catch {
      // ignore geocode errors
    }
  }
  const description = String(formData.get("description") ?? "").trim();
  const tarifParJour = String(formData.get("tarifParJour") ?? "");
  const inclusions = JSON.parse(String(formData.get("inclusions") ?? "[]")) as string[];
  const placesParking = String(formData.get("placesParking") ?? "");
  const features = JSON.parse(String(formData.get("features") ?? "[]")) as string[];
  const horairesParJour = JSON.parse(
    String(formData.get("horairesParJour") ?? "{}")
  ) as Record<string, { debut: string; fin: string }>;
  const joursOuverture = JSON.parse(String(formData.get("joursOuverture") ?? "[]")) as string[];
  const restrictionSonore = String(formData.get("restrictionSonore") ?? "");
  const evenementsAcceptes = JSON.parse(
    String(formData.get("evenementsAcceptes") ?? "[]")
  ) as string[];

  const onboardingData = {
    nom,
    ville,
    capacite,
    adresse,
    description,
    tarifParJour,
    inclusions,
    placesParking,
    features,
    horairesParJour,
    joursOuverture,
    restrictionSonore,
    evenementsAcceptes,
  };

  let imageUrls: string[] = [];
  const files = formData.getAll("photos") as File[];

  if (files.length < 3) {
    return {
      success: false,
      error: "Veuillez ajouter au moins 3 photos de votre salle.",
    };
  }

  if (files.length > 0) {
    const validFiles = files.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
    );
    if (validFiles.length !== files.length) {
      return {
        success: false,
        error: "Certains fichiers sont invalides (JPG/PNG, max 5 Mo).",
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

      if (error) {
        return { success: false, error: `Upload échoué : ${error.message}` };
      }

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }
  }

  if (imageUrls.length === 0) {
    imageUrls = ["/img.png"];
  }

  const slug = generateSlug(nom);
  const mapped = mapOnboardingToSalle(onboardingData, slug, imageUrls);

  const settings = await getPlatformSettings();
  const { validation_manuelle, mode_publication } = settings.validation;
  const status =
    !validation_manuelle || mode_publication === "auto" ? "approved" : "pending";

  const { error } = await supabase.from("salles").insert({
    owner_id: user.id,
    slug,
    name: (mapped.name ?? nom) || "Ma salle",
    city: mapped.city ?? ville,
    address: mapped.address ?? adresse,
    postal_code: postalCode || null,
    department: department || null,
    contact_phone: telephone || null,
    lat: lat ?? null,
    lng: lng ?? null,
    capacity: mapped.capacity ?? (parseInt(capacite, 10) || 0),
    price_per_day: mapped.pricePerDay ?? (parseInt(tarifParJour, 10) || 0),
    description: mapped.description ?? "",
    images: mapped.images ?? imageUrls,
    features: mapped.features ?? [],
    conditions: mapped.conditions ?? [],
    pricing_inclusions: mapped.pricingInclusions ?? [],
    heure_debut: (() => {
      const first = joursOuverture[0];
      const h = first ? horairesParJour[first] : null;
      return h?.debut ?? "08:00";
    })(),
    heure_fin: (() => {
      const first = joursOuverture[0];
      const h = first ? horairesParJour[first] : null;
      return h?.fin ?? "22:00";
    })(),
    horaires_par_jour: Object.keys(horairesParJour).length > 0 ? horairesParJour : {},
    jours_ouverture: joursOuverture.length > 0 ? joursOuverture : [],
    evenements_acceptes: evenementsAcceptes.length > 0 ? evenementsAcceptes : [],
    places_parking: placesParking ? parseInt(placesParking, 10) || null : null,
    status,
  });

  if (error) {
    console.error("createSalle error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, slug, status };
}
