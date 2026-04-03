"use server";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import {
  sendNewCatalogListingPendingAdminNotification,
  sendNewCatalogListingPublishedAdminNotification,
} from "@/lib/email";
import {
  sendAdminPendingSalleTelegramNotification,
  sendAdminPublishedSalleTelegramNotification,
} from "@/lib/telegram";
import { mapOnboardingToSalle } from "@/lib/onboarding-to-salle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "salle-photos";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo (aligné sur le bucket)
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const JOURS_DISPONIBILITE_DEFAULT = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

const HORAIRES_DEFAULT_JOUR = { debut: "08:00", fin: "22:00" };

function generateSlug(nom: string): string {
  const base = slugify(nom) || "materiel";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function gearCategoryToGsListingCategory(gear: string): "sound" | "dj" | "lighting" | "services" {
  const g = gear.toLowerCase().trim();
  if (g === "dj") return "dj";
  if (g === "lumiere" || g === "lumière") return "lighting";
  if (g === "video") return "services";
  if (g === "pack_premium" || g.startsWith("pack")) return "services";
  return "sound";
}

function ensureDisponibilite(
  joursOuverture: string[],
  horairesParJour: Record<string, { debut: string; fin: string }>
): { jours: string[]; horaires: Record<string, { debut: string; fin: string }> } {
  if (joursOuverture.length > 0) {
    return { jours: joursOuverture, horaires: horairesParJour };
  }
  const horaires: Record<string, { debut: string; fin: string }> = {};
  for (const j of JOURS_DISPONIBILITE_DEFAULT) {
    horaires[j] = horairesParJour[j] ?? HORAIRES_DEFAULT_JOUR;
  }
  return { jours: [...JOURS_DISPONIBILITE_DEFAULT], horaires };
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

export async function createSalleFromOnboarding(formData: FormData): Promise<CreateSalleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Session expirée, reconnectez-vous.",
      errorCode: "SESSION_REQUIRED",
    };
  }

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

  if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && adresse.trim()) {
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
  const restrictionSonore = String(formData.get("restrictionSonore") ?? "").trim() || "none";
  const evenementsAcceptes = JSON.parse(
    String(formData.get("evenementsAcceptes") ?? "[]")
  ) as string[];

  const listingKindRaw = String(formData.get("listingKind") ?? "equipment").trim();
  const listing_kind =
    listingKindRaw === "pack" || listingKindRaw === "equipment" ? listingKindRaw : "equipment";
  const gearCategory = String(formData.get("gearCategory") ?? "").trim();
  const gearBrand = String(formData.get("gearBrand") ?? "").trim();
  const gearModel = String(formData.get("gearModel") ?? "").trim();
  const proposeVisite = formData.get("proposeVisite") === "1";

  const { jours: joursEffectifs, horaires: horairesEffectifs } = ensureDisponibilite(
    joursOuverture,
    horairesParJour
  );

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
    horairesParJour: horairesEffectifs,
    joursOuverture: joursEffectifs,
    restrictionSonore,
    evenementsAcceptes,
    listingKind: listing_kind as "equipment" | "pack",
    gearCategory,
    gearBrand,
    gearModel,
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

  /** MVP GetSoundOn : une photo suffit pour publier vite ; le placeholder reste possible en secours. */
  const MIN_PHOTOS = 1;
  if (imageUrls.length >= MIN_PHOTOS) {
    // utilise les URLs uploadées côté client
  } else {
    const files = formData.getAll("photos") as File[];
    if (files.length > 0) {
      const validFiles = files.filter(
        (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
      );
      if (validFiles.length !== files.length) {
        return {
          success: false,
          error: "Certains fichiers sont invalides (JPG/PNG, max 50 Mo par fichier).",
          errorCode: "VALIDATION",
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

  const firstJour = joursEffectifs[0];
  const firstHoraire = firstJour ? horairesEffectifs[firstJour] : null;

  const { data: insertedSalle, error } = await supabase
    .from("salles")
    .insert({
      owner_id: user.id,
      slug,
      name: (mapped.name ?? nom) || "Annonce matériel",
      city: mapped.city ?? ville,
      address: mapped.address ?? (adresse ? `${adresse}, ${ville}`.trim() : ville),
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
      listing_kind: listing_kind,
      gear_category: gearCategory || null,
      gear_brand: gearBrand || null,
      gear_model: gearModel || null,
      heure_debut: firstHoraire?.debut ?? "08:00",
      heure_fin: firstHoraire?.fin ?? "22:00",
      horaires_par_jour: Object.keys(horairesEffectifs).length > 0 ? horairesEffectifs : {},
      jours_ouverture: joursEffectifs.length > 0 ? joursEffectifs : [],
      jours_visite: proposeVisite && joursVisite.length > 0 ? joursVisite : null,
      visite_dates:
        proposeVisite && visiteDates.length > 0 ? visiteDates : null,
      visite_horaires_par_date:
        proposeVisite &&
        visiteDates.length > 0 &&
        Object.keys(visiteHorairesParDate).length > 0
          ? visiteHorairesParDate
          : null,
      evenements_acceptes: evenementsAcceptes.length > 0 ? evenementsAcceptes : [],
      places_parking: placesParking ? parseInt(placesParking, 10) || null : null,
      status,
    })
    .select("id")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    return {
      success: false,
      error: error.message,
      ...(code ? { errorCode: code } : {}),
    };
  }

  const salleId = (insertedSalle as { id: string } | null)?.id;
  if (!salleId) {
    return {
      success: false,
      error: "Publication enregistrée mais identifiant annonce manquant. Contactez le support.",
      errorCode: "SALLE_ID_MISSING",
    };
  }

  // Annonce catalogue matériel (`gs_listings`) — alignée sur la même publication (hors flow salles legacy UI).
  const gsDeposit = Math.max(0, Number.parseFloat(String(formData.get("gsListingDepositEur") ?? "0")) || 0);
  const gsImmediate = formData.get("gsListingImmediateConfirmation") === "1";
  const gsPolicyRaw = String(formData.get("gsListingCancellationPolicy") ?? "moderate").toLowerCase();
  const gsCancellationPolicy =
    gsPolicyRaw === "flexible" || gsPolicyRaw === "moderate" || gsPolicyRaw === "strict"
      ? gsPolicyRaw
      : "moderate";
  const gsCategory = gearCategoryToGsListingCategory(gearCategory || "son");
  const listingTitle = ((mapped.name ?? nom) || "Annonce matériel").trim();
  const listingLocation = (mapped.city ?? ville).trim() || "France";
  const listingDescription = (mapped.description ?? description ?? "").trim() || listingTitle;
  const priceDay = Number((mapped.pricePerDay ?? parseInt(tarifParJour, 10)) || 0);

  try {
    const admin = createAdminClient();
    const { data: gsp } = await admin.from("gs_users_profile").select("id, role").eq("id", user.id).maybeSingle();
    if (!gsp) {
      await admin.from("gs_users_profile").insert({
        id: user.id,
        role: "provider",
        email: user.email ?? "",
      });
    } else if ((gsp as { role?: string }).role === "customer") {
      await admin.from("gs_users_profile").update({ role: "provider" }).eq("id", user.id);
    }

    const gsPayload = {
      owner_id: user.id,
      source_salle_id: salleId,
      title: listingTitle,
      description: listingDescription,
      category: gsCategory,
      price_per_day: priceDay,
      location: listingLocation,
      lat: lat ?? null,
      lng: lng ?? null,
      is_active: status === "approved",
      deposit_amount: gsDeposit,
      immediate_confirmation: gsImmediate,
      cancellation_policy: gsCancellationPolicy,
    };

    const { data: insListing, error: gsListingError } = await admin
      .from("gs_listings")
      .upsert(gsPayload, { onConflict: "source_salle_id" })
      .select("id")
      .maybeSingle();

    if (gsListingError) {
      console.error("[createSalleFromOnboarding] gs_listings upsert:", gsListingError.message);
    } else if (insListing?.id) {
      const lid = (insListing as { id: string }).id;
      const { error: delImgErr } = await admin.from("gs_listing_images").delete().eq("listing_id", lid);
      if (delImgErr) console.error("[createSalleFromOnboarding] gs_listing_images delete:", delImgErr.message);
      if (imageUrls.length > 0) {
        const rows = imageUrls.map((url, i) => ({
          listing_id: lid,
          url,
          position: i,
          is_cover: i === 0,
        }));
        const { error: imgErr } = await admin.from("gs_listing_images").insert(rows);
        if (imgErr) console.error("[createSalleFromOnboarding] gs_listing_images insert:", imgErr.message);
      }
    }
  } catch (e) {
    console.error("[createSalleFromOnboarding] sync gs_listings:", e instanceof Error ? e.message : e);
  }

  // Notification admin à chaque nouvelle annonce (pending = à valider, approved = publiée)
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";
  const adminDashboardUrl = `${siteUrl}/admin`;

  if (adminEmails.length > 0) {
    if (status === "pending") {
      await Promise.allSettled([
        sendNewCatalogListingPendingAdminNotification(
          adminEmails,
          listingTitle,
          listingLocation,
          adminDashboardUrl
        ),
        sendAdminPendingSalleTelegramNotification(listingTitle, listingLocation, adminDashboardUrl),
      ]).then((results) =>
        results.forEach((r, i) => {
          if (r.status === "rejected")
            console.error(
              "[createSalle] admin notification (pending):",
              i === 0 ? "email" : "telegram",
              r.reason
            );
        })
      );
    } else {
      await Promise.allSettled([
        sendNewCatalogListingPublishedAdminNotification(
          adminEmails,
          listingTitle,
          listingLocation,
          adminDashboardUrl
        ),
        sendAdminPublishedSalleTelegramNotification(listingTitle, listingLocation, adminDashboardUrl),
      ]).then((results) =>
        results.forEach((r, i) => {
          if (r.status === "rejected")
            console.error(
              "[createSalle] admin notification (published):",
              i === 0 ? "email" : "telegram",
              r.reason
            );
        })
      );
    }
  }

  return { success: true, slug, status };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return {
      success: false,
      error: err.message,
      errorCode: "UNKNOWN",
      errorDetails: err.stack?.slice(0, 500),
    };
  }
}
