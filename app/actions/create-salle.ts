"use server";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { sendNewSallePendingAdminNotification } from "@/lib/email";
import { mapOnboardingToSalle } from "@/lib/onboarding-to-salle";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "salle-photos";
const VIDEO_BUCKET_NAME = "salle-videos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

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
  const cautionRequise = formData.get("cautionRequise") === "1";
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
  const tarifMensuel = String(formData.get("tarifMensuel") ?? "");
  const tarifHoraire = String(formData.get("tarifHoraire") ?? "");
  const inclusions = JSON.parse(String(formData.get("inclusions") ?? "[]")) as string[];
  const placesParking = String(formData.get("placesParking") ?? "");
  const features = JSON.parse(String(formData.get("features") ?? "[]")) as string[];
  const horairesParJour = JSON.parse(
    String(formData.get("horairesParJour") ?? "{}")
  ) as Record<string, { debut: string; fin: string }>;
  const joursOuverture = JSON.parse(String(formData.get("joursOuverture") ?? "[]")) as string[];
  const joursVisite = JSON.parse(String(formData.get("joursVisite") ?? "[]")) as string[];
  const visiteDates = JSON.parse(String(formData.get("visiteDates") ?? "[]")) as string[];
  const visiteHorairesParDate = JSON.parse(
    String(formData.get("visiteHorairesParDate") ?? "{}")
  ) as Record<string, { debut: string; fin: string }>;
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
    tarifMensuel,
    tarifHoraire,
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

  const hasAtLeastOneTarif =
    (tarifParJour.trim() !== "" && parseInt(tarifParJour, 10) > 0) ||
    (tarifMensuel.trim() !== "" && parseInt(tarifMensuel, 10) > 0) ||
    (tarifHoraire.trim() !== "" && parseInt(tarifHoraire, 10) > 0);
  if (!hasAtLeastOneTarif) {
    return { success: false, error: "Indiquez au moins un tarif (jour, mois ou heure)." };
  }

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

  let videoUrl: string | null = null;
  const videoFile = formData.get("video");
  if (videoFile instanceof File && videoFile.size > 0) {
    if (
      !ALLOWED_VIDEO_TYPES.includes(videoFile.type) ||
      videoFile.size > MAX_VIDEO_SIZE
    ) {
      return {
        success: false,
        error: "Vidéo invalide (MP4 ou WebM, max 50 Mo).",
      };
    }
    const prefix = user.id;
    const timestamp = Date.now();
    const ext = videoFile.name.match(/\.(mp4|webm)$/i)?.[1] ?? "mp4";
    const path = `${prefix}/${timestamp}.${ext}`;
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    const { error: vidError } = await supabase.storage
      .from(VIDEO_BUCKET_NAME)
      .upload(path, buffer, {
        contentType: videoFile.type,
        upsert: false,
      });

    if (vidError) {
      return { success: false, error: `Upload vidéo échoué : ${vidError.message}` };
    }

    const { data: vidUrlData } = supabase.storage
      .from(VIDEO_BUCKET_NAME)
      .getPublicUrl(path);
    videoUrl = vidUrlData.publicUrl;
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
    contact_phone: null,
    display_contact_phone: false,
    caution_requise: cautionRequise,
    lat: lat ?? null,
    lng: lng ?? null,
    capacity: mapped.capacity ?? (parseInt(capacite, 10) || 0),
    price_per_day: mapped.pricePerDay ?? (parseInt(tarifParJour, 10) || 0),
    price_per_month: mapped.pricePerMonth ?? (parseInt(tarifMensuel, 10) || null),
    price_per_hour: mapped.pricePerHour ?? (parseInt(tarifHoraire, 10) || null),
    description: mapped.description ?? "",
    images: mapped.images ?? imageUrls,
    video_url: videoUrl,
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
    jours_visite: joursVisite.length > 0 ? joursVisite : null,
    visite_dates: visiteDates.length > 0 ? visiteDates : null,
    visite_horaires_par_date:
      visiteDates.length > 0 && Object.keys(visiteHorairesParDate).length > 0
        ? visiteHorairesParDate
        : null,
    evenements_acceptes: evenementsAcceptes.length > 0 ? evenementsAcceptes : [],
    places_parking: placesParking ? parseInt(placesParking, 10) || null : null,
    status,
  });

  if (error) {
    console.error("createSalle error:", error);
    return { success: false, error: error.message };
  }

  // Notification admin si annonce en attente de validation (non bloquant)
  if (status === "pending") {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const validationUrl = `${siteUrl}/admin/annonces-a-valider`;
      sendNewSallePendingAdminNotification(
        adminEmails,
        (mapped.name ?? nom) || "Ma salle",
        mapped.city ?? ville,
        validationUrl
      ).catch((e) => console.error("[createSalle] admin notification email:", e));
    }
  }

  return { success: true, slug, status };
}
