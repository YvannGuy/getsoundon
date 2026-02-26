"use server";

import { revalidatePath } from "next/cache";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EDL_BUCKET = "etat-des-lieux";
const MAX_EDL_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ActorRole = "owner" | "seeker";
type EDLPhase = "before" | "after";

function parseYmdToDate(ymd: string | null): Date | null {
  if (!ymd) return null;
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeExt(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  return "jpg";
}

function readPhotos(formData: FormData): File[] {
  return (formData.getAll("photos") as File[]).filter((file) => file && file.size > 0);
}

function validatePhotos(files: File[]): string | null {
  if (files.length === 0) return "Ajoutez au moins 1 photo.";
  if (files.length > MAX_EDL_PHOTOS) return `Maximum ${MAX_EDL_PHOTOS} photos par dépôt.`;
  for (const file of files) {
    if (!file.type.startsWith("image/")) return "Seuls les fichiers image sont autorisés.";
    if (file.size > MAX_FILE_SIZE) return "Une photo dépasse la limite de 10 Mo.";
  }
  return null;
}

async function getActorRoleForOffer(userId: string, offerId: string) {
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select("id, status, owner_id, seeker_id, date_debut, date_fin")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) return { error: "Offre introuvable." as string };

  const row = offer as {
    id: string;
    status: string;
    owner_id: string;
    seeker_id: string;
    date_debut: string | null;
    date_fin: string | null;
  };

  if (row.status !== "paid") {
    return { error: "L'état des lieux est disponible uniquement après paiement." as string };
  }

  if (row.owner_id === userId) {
    return { role: "owner" as ActorRole, dateDebut: row.date_debut, dateFin: row.date_fin };
  }
  if (row.seeker_id === userId) {
    return { role: "seeker" as ActorRole, dateDebut: row.date_debut, dateFin: row.date_fin };
  }

  return { error: "Accès refusé." as string };
}

async function ensureAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." as string };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";

  if (!isAdminByEnv && !isAdminByProfile) {
    return { error: "Accès refusé." as string };
  }

  return { user };
}

export async function submitEtatDesLieuxAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non connecté." };

  const offerId = String(formData.get("offerId") ?? "");
  const phase = String(formData.get("phase") ?? "") as EDLPhase;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!offerId) return { success: false, error: "Offre manquante." };
  if (phase !== "before" && phase !== "after") return { success: false, error: "Phase invalide." };

  const files = readPhotos(formData);
  const photoValidationError = validatePhotos(files);
  if (photoValidationError) return { success: false, error: photoValidationError };

  const actor = await getActorRoleForOffer(user.id, offerId);
  if ("error" in actor) return { success: false, error: actor.error };
  const nowDate = new Date();
  const eventStart = parseYmdToDate(actor.dateDebut ?? null);
  const eventEnd = parseYmdToDate(actor.dateFin ?? actor.dateDebut ?? null);

  if (phase === "before" && eventStart) {
    const lockUntil = eventStart;
    const lockAfter = addDays(eventStart, 1);
    if (nowDate < lockUntil) {
      return {
        success: false,
        error: `L'état des lieux d'entrée est disponible à partir du ${actor.dateDebut}.`,
      };
    }
    if (nowDate > lockAfter) {
      return {
        success: false,
        error: "La fenêtre de dépôt pour l'état des lieux d'entrée est expirée (24h après le début).",
      };
    }
  }

  if (phase === "after" && eventEnd) {
    const lockUntil = eventEnd;
    const lockAfter = addDays(eventEnd, 1);
    const endYmd = actor.dateFin ?? actor.dateDebut;
    if (nowDate < lockUntil) {
      return {
        success: false,
        error: `L'état des lieux de sortie est disponible à partir du ${endYmd}.`,
      };
    }
    if (nowDate > lockAfter) {
      return {
        success: false,
        error: "La fenêtre de dépôt pour l'état des lieux de sortie est expirée (24h après la fin).",
      };
    }
  }

  const role = actor.role;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: edlRow, error: upsertError } = await admin
    .from("etat_des_lieux")
    .upsert(
      {
        offer_id: offerId,
        role,
        phase,
        notes,
        submitted_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "offer_id,role,phase" }
    )
    .select("id")
    .single();

  if (upsertError || !edlRow) {
    return { success: false, error: upsertError?.message ?? "Impossible d'enregistrer l'état des lieux." };
  }

  const edlId = (edlRow as { id: string }).id;
  const { data: existingPhotos } = await admin
    .from("etat_des_lieux_photos")
    .select("id, storage_path")
    .eq("etat_des_lieux_id", edlId);

  const existing = (existingPhotos ?? []) as { id: string; storage_path: string }[];
  if (existing.length > 0) {
    const paths = existing.map((p) => p.storage_path);
    await admin.storage.from(EDL_BUCKET).remove(paths);
    await admin.from("etat_des_lieux_photos").delete().eq("etat_des_lieux_id", edlId);
  }

  const uploadedRows: {
    etat_des_lieux_id: string;
    offer_id: string;
    storage_path: string;
    description: string | null;
    created_by: string;
    created_at: string;
  }[] = [];
  const stamp = Date.now();

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const ext = normalizeExt(file);
    const storagePath = `${offerId}/${role}/${phase}/${stamp}-${i}.${ext}`;

    const { error: uploadError } = await admin.storage.from(EDL_BUCKET).upload(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      {
        contentType: file.type || "image/jpeg",
        upsert: false,
      }
    );

    if (uploadError) {
      return {
        success: false,
        error: `Erreur upload photo ${i + 1}: ${uploadError.message}`,
      };
    }

    uploadedRows.push({
      etat_des_lieux_id: edlId,
      offer_id: offerId,
      storage_path: storagePath,
      description: notes,
      created_by: user.id,
      created_at: nowIso,
    });
  }

  const { error: insertPhotosError } = await admin.from("etat_des_lieux_photos").insert(uploadedRows);
  if (insertPhotosError) {
    return { success: false, error: insertPhotosError.message };
  }

  revalidatePath("/dashboard/etats-des-lieux");
  revalidatePath("/proprietaire/etats-des-lieux");
  revalidatePath("/admin/etats-des-lieux");
  revalidatePath("/admin/paiements");

  return { success: true };
}

export async function openUserDisputeCaseAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non connecté." };

  const offerId = String(formData.get("offerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!offerId) return { success: false, error: "Offre manquante." };
  if (!reason) return { success: false, error: "Expliquez le motif du litige." };

  const actor = await getActorRoleForOffer(user.id, offerId);
  if ("error" in actor) return { success: false, error: actor.error };
  if (actor.role !== "owner") {
    return { success: false, error: "Seul le propriétaire peut ouvrir un litige." };
  }

  const files = readPhotos(formData);
  const photoValidationError = validatePhotos(files);
  if (photoValidationError) return { success: false, error: photoValidationError };

  const admin = createAdminClient();
  const role: ActorRole = "owner";

  const { data: offer } = await admin
    .from("offers")
    .select("id, deposit_amount_cents, deposit_hold_status")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable." };

  const offerRow = offer as {
    id: string;
    deposit_amount_cents: number | null;
    deposit_hold_status: string | null;
  };
  const maxDepositAmount = Math.max(0, offerRow.deposit_amount_cents ?? 0);
  if (maxDepositAmount <= 0) {
    return { success: false, error: "Aucune caution active sur cette réservation." };
  }
  if (["captured", "released"].includes(offerRow.deposit_hold_status ?? "")) {
    return { success: false, error: "Cette caution a déjà été traitée." };
  }

  const { data: existingOpenCase } = await admin
    .from("refund_cases")
    .select("id")
    .eq("offer_id", offerId)
    .eq("case_type", "dispute")
    .eq("status", "open")
    .maybeSingle();
  if (existingOpenCase) {
    return { success: false, error: "Un litige est déjà ouvert pour cette réservation." };
  }

  const { data: actorEdlRows } = await admin
    .from("etat_des_lieux")
    .select("phase")
    .eq("offer_id", offerId)
    .eq("role", role)
    .in("phase", ["before", "after"]);

  const actorPhases = new Set(
    (actorEdlRows ?? []).map(
      (row) => (row as { phase: "before" | "after" }).phase
    )
  );
  if (!actorPhases.has("before") || !actorPhases.has("after")) {
    return {
      success: false,
      error:
        "Vous devez d'abord compléter vos états des lieux d'entrée et de sortie avant d'ouvrir un litige.",
    };
  }

  const { data: payment } = await admin
    .from("payments")
    .select("id")
    .eq("offer_id", offerId)
    .eq("product_type", "reservation")
    .maybeSingle();

  const { data: createdCase, error: insertCaseError } = await admin
    .from("refund_cases")
    .insert({
      payment_id: (payment as { id: string } | null)?.id ?? null,
      offer_id: offerId,
      requested_by_role: role,
      side: role,
      case_type: "dispute",
      status: "open",
      amount_cents: 0,
      reason,
      evidence_required: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertCaseError || !createdCase) {
    return { success: false, error: insertCaseError?.message ?? "Impossible d'ouvrir le litige." };
  }

  const { error: updateOfferError } = await admin
    .from("offers")
    .update({
      deposit_hold_status: "claim_requested",
      deposit_claim_amount_cents: maxDepositAmount,
      deposit_claim_reason: reason,
      deposit_claim_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId);
  if (updateOfferError) {
    return { success: false, error: updateOfferError.message };
  }

  const caseId = (createdCase as { id: string }).id;
  const evidenceRows: { case_id: string; storage_path: string; description: string; uploaded_by: string }[] = [];
  const stamp = Date.now();

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const ext = normalizeExt(file);
    const storagePath = `${offerId}/disputes/${caseId}/${role}-${stamp}-${i}.${ext}`;

    const { error: uploadError } = await admin.storage.from(EDL_BUCKET).upload(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      {
        contentType: file.type || "image/jpeg",
        upsert: false,
      }
    );

    if (uploadError) {
      return {
        success: false,
        error: `Erreur upload preuve ${i + 1}: ${uploadError.message}`,
      };
    }

    evidenceRows.push({
      case_id: caseId,
      storage_path: storagePath,
      description: reason,
      uploaded_by: user.id,
    });
  }

  const { error: evidenceError } = await admin.from("refund_case_evidences").insert(evidenceRows);
  if (evidenceError) return { success: false, error: evidenceError.message };

  revalidatePath("/dashboard/etats-des-lieux");
  revalidatePath("/dashboard/litiges");
  revalidatePath("/proprietaire/etats-des-lieux");
  revalidatePath("/proprietaire/litiges");
  revalidatePath("/admin/etats-des-lieux");
  revalidatePath("/admin/litiges");
  revalidatePath("/admin/cautions");
  revalidatePath("/proprietaire/cautions");
  revalidatePath("/admin/paiements");

  return { success: true };
}

export async function submitSeekerDisputeResponseAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const offerId = String(formData.get("offerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!offerId) return { success: false, error: "Offre manquante." };
  if (!reason) return { success: false, error: "Ajoutez votre contestation." };

  const actor = await getActorRoleForOffer(user.id, offerId);
  if ("error" in actor) return { success: false, error: actor.error };
  if (actor.role !== "seeker") {
    return { success: false, error: "Seul le locataire peut contester ce litige." };
  }

  const files = readPhotos(formData);
  const photoValidationError = validatePhotos(files);
  if (photoValidationError) return { success: false, error: photoValidationError };

  const admin = createAdminClient();
  const { data: openCase } = await admin
    .from("refund_cases")
    .select("id, side, status")
    .eq("offer_id", offerId)
    .eq("case_type", "dispute")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!openCase) return { success: false, error: "Aucun litige ouvert à contester." };

  const openCaseRow = openCase as {
    id: string;
    side: "owner" | "seeker" | "none";
    status: "open" | "resolved" | "rejected";
  };
  if (openCaseRow.side !== "owner") {
    return { success: false, error: "Ce litige n'est pas ouvrable à contestation locataire." };
  }

  const caseId = openCaseRow.id;
  const evidenceRows: { case_id: string; storage_path: string; description: string; uploaded_by: string }[] = [];
  const stamp = Date.now();

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const ext = normalizeExt(file);
    const storagePath = `${offerId}/disputes/${caseId}/seeker-${stamp}-${i}.${ext}`;

    const { error: uploadError } = await admin.storage.from(EDL_BUCKET).upload(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      {
        contentType: file.type || "image/jpeg",
        upsert: false,
      }
    );

    if (uploadError) {
      return {
        success: false,
        error: `Erreur upload preuve ${i + 1}: ${uploadError.message}`,
      };
    }

    evidenceRows.push({
      case_id: caseId,
      storage_path: storagePath,
      description: reason,
      uploaded_by: user.id,
    });
  }

  const { error: evidenceError } = await admin.from("refund_case_evidences").insert(evidenceRows);
  if (evidenceError) return { success: false, error: evidenceError.message };

  await admin
    .from("refund_cases")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  revalidatePath("/dashboard/litiges");
  revalidatePath("/admin/litiges");
  revalidatePath("/admin/cautions");

  return { success: true };
}

export async function openAdminRefundCaseAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureAdminUser();
  if ("error" in auth) return { success: false, error: auth.error };

  const paymentId = String(formData.get("paymentId") ?? "");
  const caseType = String(formData.get("caseType") ?? "");
  const side = String(formData.get("side") ?? "none");
  const reason = String(formData.get("reason") ?? "").trim();
  const amountRaw = String(formData.get("amountEur") ?? "").trim().replace(",", ".");
  const amountEur = amountRaw ? Number(amountRaw) : null;
  const offerIdFromForm = String(formData.get("offerId") ?? "");

  if (!paymentId) return { success: false, error: "Paiement manquant." };
  if (!["refund_full", "refund_partial", "dispute"].includes(caseType)) {
    return { success: false, error: "Type de dossier invalide." };
  }
  if (!["owner", "seeker", "none"].includes(side)) {
    return { success: false, error: "Partie invalide." };
  }
  if (!reason) return { success: false, error: "Le motif est obligatoire." };

  const files = readPhotos(formData);
  if (caseType === "dispute") {
    const photoValidationError = validatePhotos(files);
    if (photoValidationError) return { success: false, error: photoValidationError };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount, status, offer_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { success: false, error: "Paiement introuvable." };

  const paymentRow = payment as {
    id: string;
    amount: number;
    status: string;
    offer_id: string | null;
  };
  const offerId = paymentRow.offer_id ?? (offerIdFromForm || null);

  if (!offerId) {
    return { success: false, error: "Offre liée introuvable pour ce paiement." };
  }

  const { data: offer } = await admin
    .from("offers")
    .select("id, stripe_payment_intent_id")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) return { success: false, error: "Offre introuvable." };
  const offerRow = offer as { id: string; stripe_payment_intent_id: string | null };

  let amountCents = 0;
  if (caseType === "refund_partial") {
    if (!amountEur || !Number.isFinite(amountEur) || amountEur <= 0) {
      return { success: false, error: "Montant partiel invalide." };
    }
    amountCents = Math.round(amountEur * 100);
    if (amountCents >= paymentRow.amount) {
      return {
        success: false,
        error: "Le remboursement partiel doit être inférieur au montant payé.",
      };
    }
  } else if (caseType === "refund_full") {
    amountCents = paymentRow.amount;
  }

  let stripeRefundId: string | null = null;
  if (caseType === "refund_full" || caseType === "refund_partial") {
    if (!offerRow.stripe_payment_intent_id) {
      return { success: false, error: "PaymentIntent Stripe introuvable pour ce paiement." };
    }

    try {
      const stripe = getStripe();
      const refund = await stripe.refunds.create({
        payment_intent: offerRow.stripe_payment_intent_id,
        ...(caseType === "refund_partial" ? { amount: amountCents } : {}),
        metadata: {
          offer_id: offerRow.id,
          payment_id: paymentRow.id,
          actor: "admin",
          case_type: caseType,
          side,
        },
      });
      stripeRefundId = refund.id;
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Erreur Stripe lors du remboursement.",
      };
    }
  }

  const now = new Date().toISOString();
  const { data: createdCase, error: insertCaseError } = await admin
    .from("refund_cases")
    .insert({
      payment_id: paymentRow.id,
      offer_id: offerRow.id,
      requested_by_role: "admin",
      side,
      case_type: caseType,
      status: caseType === "dispute" ? "open" : "resolved",
      amount_cents: amountCents,
      reason,
      stripe_refund_id: stripeRefundId,
      evidence_required: caseType === "dispute",
      created_by: auth.user.id,
      created_at: now,
      resolved_at: caseType === "dispute" ? null : now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertCaseError || !createdCase) {
    return {
      success: false,
      error: insertCaseError?.message ?? "Impossible de créer le dossier admin.",
    };
  }

  if (caseType === "refund_full") {
    await admin
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", paymentRow.id);
  }

  if (caseType === "dispute") {
    const caseId = (createdCase as { id: string }).id;
    const evidenceRows: { case_id: string; storage_path: string; description: string; uploaded_by: string }[] = [];
    const stamp = Date.now();

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = normalizeExt(file);
      const storagePath = `${offerRow.id}/disputes/${caseId}/admin-${stamp}-${i}.${ext}`;
      const { error: uploadError } = await admin.storage.from(EDL_BUCKET).upload(
        storagePath,
        Buffer.from(await file.arrayBuffer()),
        {
          contentType: file.type || "image/jpeg",
          upsert: false,
        }
      );
      if (uploadError) {
        return {
          success: false,
          error: `Erreur upload preuve ${i + 1}: ${uploadError.message}`,
        };
      }
      evidenceRows.push({
        case_id: caseId,
        storage_path: storagePath,
        description: reason,
        uploaded_by: auth.user.id,
      });
    }

    const { error: evidenceError } = await admin.from("refund_case_evidences").insert(evidenceRows);
    if (evidenceError) return { success: false, error: evidenceError.message };
  }

  revalidatePath("/admin/paiements");
  revalidatePath("/admin/etats-des-lieux");
  revalidatePath("/dashboard/etats-des-lieux");
  revalidatePath("/proprietaire/etats-des-lieux");

  return { success: true };
}
