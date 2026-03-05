"use server";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { sendNewSallePendingAdminNotification } from "@/lib/email";
import { sendAdminPendingSalleTelegramNotification } from "@/lib/telegram";
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

/** Pour le debug : code lisible (401, 403, 409, 413, 500, STORAGE, etc.) et détails optionnels. */
export type CreateSalleResult =
  | { success: true; slug?: string; status: "approved" | "pending" }
  | {
      success: false;
      error: string;
      errorCode?: string;
      errorDetails?: string;
      /** Index 1-based de la photo en échec (upload). */
      photoIndex?: number;
    };

function maskId(id: string): string {
  if (!id || id.length < 12) return "***";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export async function createSalleFromOnboarding(formData: FormData): Promise<CreateSalleResult> {
  const correlationId = String(formData.get("correlationId") ?? "").trim() || undefined;
  const log = (msg: string, data?: Record<string, unknown>) => {
    const prefix = correlationId ? `[createSalle][${correlationId}]` : "[createSalle]";
    if (data !== undefined) console.log(prefix, msg, data);
    else console.log(prefix, msg);
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    log("auth missing");
    return {
      success: false,
      error: "Session expirée, reconnectez-vous.",
      errorCode: "SESSION_REQUIRED",
    };
  }
  log("user", { userId: maskId(user.id) });

  try {
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

  const hasAtLeastOneTarif =
    (tarifParJour.trim() !== "" && parseInt(tarifParJour, 10) > 0) ||
    (tarifMensuel.trim() !== "" && parseInt(tarifMensuel, 10) > 0) ||
    (tarifHoraire.trim() !== "" && parseInt(tarifHoraire, 10) > 0);
  if (!hasAtLeastOneTarif) {
    return { success: false, error: "Indiquez au moins un tarif (jour, mois ou heure).", errorCode: "VALIDATION" };
  }

  let imageUrls: string[] = [];
  const imageUrlsRaw = formData.get("imageUrls");
  if (imageUrlsRaw && typeof imageUrlsRaw === "string") {
    try {
      const parsed = JSON.parse(imageUrlsRaw) as unknown;
      if (Array.isArray(parsed) && parsed.every((u) => typeof u === "string")) {
        imageUrls = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const REQUIRED_PHOTOS = 5;
  if (imageUrls.length >= REQUIRED_PHOTOS) {
    log("using client-uploaded imageUrls", { count: imageUrls.length });
  } else if (imageUrls.length > 0) {
    return {
      success: false,
      error: `Veuillez ajouter ${REQUIRED_PHOTOS} photos de votre salle (reçu : ${imageUrls.length}).`,
      errorCode: "VALIDATION",
    };
  } else {
    const files = formData.getAll("photos") as File[];
    if (files.length < 3) {
      return {
        success: false,
        error: "Veuillez ajouter au moins 3 photos de votre salle.",
        errorCode: "VALIDATION",
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
          errorCode: "VALIDATION",
        };
      }

      const prefix = user.id;
      const timestamp = Date.now();
      log("upload start", { bucket: BUCKET_NAME, count: validFiles.length });

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
          log("storage upload failed", {
            photoIndex: i + 1,
            path,
            code: error.message,
            errorMessage: error.message,
          });
          return {
            success: false,
            error: `Photo ${i + 1} : upload échoué. ${error.message} Réessayez ou changez de fichier.`,
            errorCode: "STORAGE",
            errorDetails: error.message,
            photoIndex: i + 1,
          };
        }

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }
      log("upload done", { imageCount: imageUrls.length });
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
    video_url: null,
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
    const code = (error as { code?: string }).code ?? "DB";
    const details = [error.message, (error as { details?: string }).details, (error as { hint?: string }).hint]
      .filter(Boolean)
      .join(" | ");
    log("insert salles failed", { code, message: error.message });
    return {
      success: false,
      error: error.message,
      errorCode: code,
      errorDetails: details,
    };
  }

  // Notification admin si annonce en attente de validation (non bloquant)
  if (status === "pending") {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salledeculte.com";
      const validationUrl = `${siteUrl}/admin/annonces-a-valider`;
      const salleName = (mapped.name ?? nom) || "Ma salle";
      const salleCity = mapped.city ?? ville;
      sendNewSallePendingAdminNotification(
        adminEmails,
        salleName,
        salleCity,
        validationUrl
      ).catch((e) => console.error("[createSalle] admin notification email:", e));
      sendAdminPendingSalleTelegramNotification(
        salleName,
        salleCity,
        validationUrl
      ).catch((e) => console.error("[createSalle] admin notification telegram:", e));
    }
  }

  return { success: true, slug, status };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log("unexpected error", { message: err.message });
    return {
      success: false,
      error: err.message,
      errorCode: "UNKNOWN",
      errorDetails: err.stack?.slice(0, 500),
    };
  }
}
