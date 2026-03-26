import Stripe from "stripe";

import { generateContractPdf } from "@/lib/contract-pdf";
import {
  sendPaymentFailedOwnerEmail,
  sendPaymentFailedSeekerEmail,
  sendReservationConfirmedOwnerEmail,
  sendReservationConfirmedSeekerEmail,
} from "@/lib/email";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { snapshotLinesForPdf } from "@/lib/offer-listing-snapshot";
import { computePaymentProcessingFeeCents } from "@/lib/payment-processing-fee";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleGsBookingCheckoutCompleted } from "@/lib/stripe-webhook-gs-booking";
import { sendAdminPaymentTelegramNotification } from "@/lib/telegram";
import { sendUserNotification } from "@/lib/user-notifications";

const processedEventIds = new Map<string, number>();
const WEBHOOK_EVENT_TTL_MS = 1000 * 60 * 60 * 24;

function shouldProcessEvent(eventId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of processedEventIds) {
    if (now - ts > WEBHOOK_EVENT_TTL_MS) {
      processedEventIds.delete(id);
    }
  }
  if (processedEventIds.has(eventId)) {
    return false;
  }
  processedEventIds.set(eventId, now);
  return true;
}

export async function handleStripeWebhook(event: Stripe.Event) {
  if (!shouldProcessEvent(event.id)) {
    return { type: event.type, ignored: true, reason: "duplicate_event" };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as Record<string, string> | null;
      const productType = metadata?.product_type;
      let reservationJustProcessed = false;
      let shouldSendAdminPaymentTelegram = false;

      if (productType === "gs_booking" && metadata?.booking_id && metadata?.user_id) {
        await handleGsBookingCheckoutCompleted(session, metadata);
        return {
          type: event.type,
          customerEmail: session.customer_details?.email ?? null,
          sessionId: session.id,
        };
      }

      if (!productType || productType !== "reservation") {
        console.log("[webhook] checkout.session.completed ignoré (metadata):", { productType, offer_id: metadata?.offer_id, user_id: metadata?.user_id });
      }

      if (productType === "reservation" && metadata?.offer_id && metadata?.user_id) {
        const supabase = createAdminClient();
        const offerId = metadata.offer_id;
        const amount = session.amount_total ?? 0;
        const reservationTotalCents = Number(metadata?.reservation_total_cents ?? metadata?.amount_cents ?? "0");
        const amountEur = ((reservationTotalCents > 0 ? reservationTotalCents : amount ?? 0) / 100).toFixed(2);
        const stripe = getStripe();
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        const depositAmountCents = Number(metadata?.deposit_amount_cents ?? "0");
        const paidNowCents = Number(metadata?.amount_cents ?? String(amount ?? 0));
        const serviceFeeCents = Number(metadata?.service_fee_cents ?? "0");
        const processingFeeCharge1Cents = Number(
          metadata?.processing_fee_charge1_cents ??
            String(computePaymentProcessingFeeCents(Math.max(0, paidNowCents + serviceFeeCents)))
        );
        const paymentMode = metadata?.payment_mode === "split" ? "split" : "full";
        const paymentStage =
          metadata?.payment_stage === "deposit"
            ? "deposit"
            : metadata?.payment_stage === "balance"
              ? "balance"
              : "full";
        const now = new Date().toISOString();
        const nextPlanStatus = paymentMode === "split" ? "balance_scheduled" : "fully_paid";

        // Mise à jour atomique : un seul webhook "gagne" (idempotence)
        const { data: updatedOffer, error: updateError } = await supabase
          .from("offers")
          .update({
            status: "paid",
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            deposit_status:
              depositAmountCents > 0 && (paymentMode === "full" || paymentStage === "balance")
                ? "held"
                : "none",
            deposit_hold_status: "none",
            payment_plan_status: nextPlanStatus,
            upfront_paid_at: now,
            balance_paid_at: paymentMode === "split" ? null : now,
            balance_retry_count: 0,
            balance_last_error: null,
            updated_at: now,
          })
          .eq("id", offerId)
          .eq("status", "pending")
          .select("conversation_id")
          .maybeSingle();

        if (updateError || !updatedOffer) {
          console.warn("[webhook] Offre déjà traitée ou introuvable:", offerId, updateError?.message ?? "0 rows");
        } else {
          reservationJustProcessed = true;
          shouldSendAdminPaymentTelegram = true;
          console.log("[webhook] Début traitement caution:", {
            offerId,
            depositAmountCents,
            hasPaymentIntentId: !!paymentIntentId,
          });

          // Caution:
          // - paiement direct (full): créer immédiatement l'empreinte
          // - paiement avec acompte (split): créer seulement au paiement du solde (stage=balance)
          const shouldCreateDepositHold =
            depositAmountCents > 0 &&
            !!paymentIntentId &&
            (paymentMode === "full" || paymentStage === "balance");

          if (shouldCreateDepositHold) {
            try {
              const paidPi = await stripe.paymentIntents.retrieve(paymentIntentId);
              const customerIdFromPi =
                typeof paidPi.customer === "string" ? paidPi.customer : paidPi.customer?.id ?? null;
              const customerIdFromSession =
                typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
              const customerId = customerIdFromPi ?? customerIdFromSession;
              const paymentMethodId =
                typeof paidPi.payment_method === "string"
                  ? paidPi.payment_method
                  : paidPi.payment_method?.id ?? null;

              if (paymentMethodId && customerId) {
                try {
                  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
                } catch {
                  // Ignore "already attached" and continue.
                }

                const depositPi = await stripe.paymentIntents.create({
                  amount: depositAmountCents,
                  currency: session.currency ?? "eur",
                  customer: customerId,
                  payment_method: paymentMethodId,
                  capture_method: "manual",
                  confirm: true,
                  off_session: true,
                  description: `Empreinte caution offre ${offerId}`,
                  metadata: {
                    type: "deposit_hold",
                    offer_id: offerId,
                    seeker_id: metadata.user_id,
                    owner_id: metadata.owner_id ?? "",
                  },
                });

                await supabase
                  .from("offers")
                  .update({
                    deposit_payment_intent_id: depositPi.id,
                    deposit_hold_status:
                      depositPi.status === "requires_capture" ? "authorized" : "failed",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", offerId);

                console.log("[webhook] Empreinte caution créée:", {
                  offerId,
                  depositPaymentIntentId: depositPi.id,
                  depositStatus: depositPi.status,
                });
              } else {
                console.warn("[webhook] Empreinte caution impossible: customer/payment_method manquant", {
                  offerId,
                  hasCustomerId: !!customerId,
                  hasPaymentMethodId: !!paymentMethodId,
                });
                await supabase
                  .from("offers")
                  .update({
                    deposit_hold_status: "failed",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", offerId);
              }
            } catch (e) {
              console.error("[webhook] Erreur création empreinte caution:", e);
              await supabase
                .from("offers")
                .update({
                  deposit_hold_status: "failed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", offerId);
            }
          } else {
            console.log("[webhook] Caution non initialisée (aucun hold créé):", {
              offerId,
              reason:
                depositAmountCents <= 0
                  ? "deposit_amount_cents <= 0"
                  : !paymentIntentId
                    ? "payment_intent manquant"
                    : "acompte payé: caution différée au solde",
            });
          }

          const convId = (updatedOffer as { conversation_id: string }).conversation_id;

          const paymentInsertPayload = {
            user_id: metadata.user_id,
            stripe_session_id: session.id,
            amount,
            currency: session.currency ?? "eur",
            product_type: "reservation",
            status: "paid",
            payment_type: paymentStage === "deposit" ? "deposit" : "full",
            offer_id: offerId,
            breakdown: {
              charge_stage: paymentStage === "deposit" ? "deposit" : "full",
              reservation_amount_cents: Math.max(0, paidNowCents),
              service_fee_cents: Math.max(0, serviceFeeCents),
              processing_fee_cents: Math.max(0, processingFeeCharge1Cents),
              charged_total_cents: Math.max(0, amount),
            },
          };
          let insertedPayment:
            | {
                id?: string;
              }
            | null = null;
          let payErrorMessage: string | null = null;
          const { data: insertedWithBreakdown, error: payError } = await supabase
            .from("payments")
            .insert(paymentInsertPayload)
            .select("id")
            .single();
          if (payError && payError.message.toLowerCase().includes("breakdown")) {
            const fallbackPayload = { ...paymentInsertPayload } as Record<string, unknown>;
            delete fallbackPayload.breakdown;
            const { data: insertedFallback, error: fallbackError } = await supabase
              .from("payments")
              .insert(fallbackPayload)
              .select("id")
              .single();
            insertedPayment = insertedFallback as { id?: string } | null;
            payErrorMessage = fallbackError?.message ?? null;
          } else {
            insertedPayment = insertedWithBreakdown as { id?: string } | null;
            payErrorMessage = payError?.message ?? null;
          }
          if (payErrorMessage) {
            console.error("[webhook] Erreur insert payments:", payErrorMessage);
          } else {
            console.log("[webhook] Payment insert OK: reservation", offerId);
          }

          const msgContent =
            paymentStage === "deposit"
              ? `A payé l'acompte de ${(paidNowCents / 100).toFixed(2)} € (solde prévu J-7).`
              : `A payé l'offre de ${amountEur} €.`;
          const { error: msgError } = await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: metadata.user_id,
            content: msgContent,
          });
          if (msgError) console.error("[webhook] Erreur insert message:", msgError.message);

          // Sauvegarder stripe_customer_id si nouveau client (pour carte enregistrée)
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          if (customerId) {
            const { data: existing } = await supabase
              .from("profiles")
              .select("stripe_customer_id")
              .eq("id", metadata.user_id)
              .single();
            if (!(existing as { stripe_customer_id?: string } | null)?.stripe_customer_id) {
              await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", metadata.user_id);
            }
          }

          await supabase.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: msgContent,
            updated_at: new Date().toISOString(),
          }).eq("id", convId);

          // Génération contrat + facture (non bloquant)
          try {
            const { data: offerFull } = await supabase
              .from("offers")
              .select("id, amount_cents, date_debut, date_fin, event_type, salle_id, owner_id, seeker_id, listing_snapshot")
              .eq("id", offerId)
              .single();
            const salleId = (offerFull as { salle_id?: string })?.salle_id;
            const [{ data: salle }, { data: template }, { data: profiles }] = await Promise.all([
              supabase.from("salles").select("name, city").eq("id", salleId).single(),
              salleId ? supabase.from("contract_templates").select("raison_sociale, adresse, code_postal, ville, siret, conditions_particulieres").eq("salle_id", salleId).maybeSingle() : { data: null },
              supabase.from("profiles").select("id, full_name, email").in("id", [
                (offerFull as { owner_id: string })?.owner_id,
                (offerFull as { seeker_id: string })?.seeker_id,
              ]),
            ]);
            const ownerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === (offerFull as { owner_id: string })?.owner_id) as {
              full_name?: string | null;
              email?: string | null;
            } | undefined;
            const seekerProfile = (profiles ?? []).find((p) => (p as { id: string }).id === (offerFull as { seeker_id: string })?.seeker_id) as {
              full_name?: string | null;
              email?: string | null;
            } | undefined;
            const t = template as { raison_sociale?: string | null; adresse?: string | null; code_postal?: string | null; ville?: string | null; siret?: string | null; conditions_particulieres?: string | null } | null;

            if (offerFull && salle && ownerProfile && seekerProfile) {
              const snapLines = snapshotLinesForPdf(
                (offerFull as { listing_snapshot?: unknown }).listing_snapshot
              );
              const contractPath = `${offerId}/contrat.pdf`;
              let uploaded = false;

              // Priorité : PDF uploadé par le propriétaire (salles/{salleId}/modele.pdf)
              const { data: ownerPdf, error: ownerPdfErr } = await supabase.storage
                .from("contrats")
                .download(`salles/${salleId}/modele.pdf`);

              if (!ownerPdfErr && ownerPdf) {
                const pdfBuffer = Buffer.from(await ownerPdf.arrayBuffer());
                const { error: uploadContractErr } = await supabase.storage
                  .from("contrats")
                  .upload(contractPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
                if (!uploadContractErr) {
                  uploaded = true;
                  console.log("[webhook] Contrat (PDF proprio) enregistré:", offerId);
                }
              }

              // Fallback : génération automatique si aucun PDF uploadé
              if (!uploaded) {
                const contractData = {
                  offerId,
                  amountEur,
                  dateDebut: (offerFull as { date_debut?: string | null }).date_debut ? new Date((offerFull as { date_debut: string }).date_debut).toLocaleDateString("fr-FR") : null,
                  dateFin: (offerFull as { date_fin?: string | null }).date_fin ? new Date((offerFull as { date_fin: string }).date_fin).toLocaleDateString("fr-FR") : null,
                  eventType: (offerFull as { event_type?: string | null }).event_type ?? null,
                  salleName: (salle as { name?: string }).name ?? "Salle",
                  salleCity: (salle as { city?: string }).city ?? "",
                  ownerName: ownerProfile.full_name ?? "Propriétaire",
                  ownerEmail: ownerProfile.email ?? "",
                  seekerName: seekerProfile.full_name ?? "Locataire",
                  seekerEmail: seekerProfile.email ?? "",
                  paidAt: new Date().toLocaleDateString("fr-FR"),
                  template: t ? { raisonSociale: t.raison_sociale, adresse: t.adresse, codePostal: t.code_postal, ville: t.ville, siret: t.siret, conditionsParticulieres: t.conditions_particulieres } : undefined,
                  snapshotLines: snapLines.length ? snapLines : undefined,
                };
                const contractPdf = await generateContractPdf(contractData);
                const pdfBuffer = Buffer.from(contractPdf);
                const { error: uploadContractErr } = await supabase.storage
                  .from("contrats")
                  .upload(contractPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
                if (!uploadContractErr) {
                  uploaded = true;
                  console.log("[webhook] Contrat généré (template):", offerId);
                } else {
                  console.error("[webhook] Erreur upload contrat:", uploadContractErr.message);
                }
              }

              if (uploaded) {
                await supabase.from("offers").update({ contract_path: contractPath }).eq("id", offerId);
              }

              // Facture
              const paymentId = (insertedPayment as { id?: string })?.id;
              if (paymentId) {
                const invoicePdf = await generateInvoicePdf({
                  paymentId,
                  amountEur,
                  paidAt: new Date().toLocaleDateString("fr-FR"),
                  productType: "reservation",
                  seekerName: seekerProfile.full_name ?? "Locataire",
                  seekerEmail: seekerProfile.email ?? "",
                  ownerName: ownerProfile.full_name ?? "Propriétaire",
                  salleName: (salle as { name?: string }).name ?? "Salle",
                  salleCity: (salle as { city?: string }).city ?? "",
                  snapshotLines: snapLines.length ? snapLines : undefined,
                });
                const invoicePath = `factures/${paymentId}.pdf`;
                const { error: uploadInvErr } = await supabase.storage
                  .from("contrats")
                  .upload(invoicePath, invoicePdf, { contentType: "application/pdf", upsert: true });
                if (!uploadInvErr) {
                  await supabase.from("payments").update({ invoice_path: invoicePath }).eq("id", paymentId);
                  console.log("[webhook] Facture générée:", paymentId);
                } else {
                  console.error("[webhook] Erreur upload facture:", uploadInvErr.message);
                }
              }
            }
          } catch (err) {
            console.error("[webhook] Erreur génération contrat/facture:", err);
          }

          console.log("[webhook] Réservation traitée: offer_id=", offerId, "user_id=", metadata.user_id, "amount=", amountEur, "€");
        }
      }

      if (
        reservationJustProcessed &&
        productType === "reservation" &&
        metadata?.offer_id &&
        metadata?.user_id
      ) {
        const supabase = createAdminClient();
        const offerId = metadata.offer_id;
        const seekerId = metadata.user_id;
        const paidCents = session.amount_total ?? Number(metadata?.amount_cents ?? "0");
        const amountForEmail = (paidCents / 100).toFixed(2);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";

        const { data: offerNotif } = await supabase
          .from("offers")
          .select("owner_id, salle_id")
          .eq("id", offerId)
          .maybeSingle();
        const ownerId = (offerNotif as { owner_id?: string | null } | null)?.owner_id ?? null;
        const salleId = (offerNotif as { salle_id?: string | null } | null)?.salle_id ?? null;
        const { data: salleRow } = salleId
          ? await supabase.from("salles").select("name").eq("id", salleId).maybeSingle()
          : { data: null };
        const salleName = (salleRow as { name?: string | null } | null)?.name ?? "la salle";

        const { data: seekerUser } = await supabase.auth.admin.getUserById(seekerId);
        const seekerEmail = seekerUser?.user?.email ?? null;
        const notifPromises: Promise<unknown>[] = [];
        if (seekerEmail) {
          notifPromises.push(
            sendUserNotification({
              userId: seekerId,
              telegramText: [
                "Reservation confirmee.",
                `Salle: ${salleName}`,
                `Montant: ${amountForEmail} EUR`,
                `${siteUrl}/dashboard/reservations`,
              ].join("\n"),
              sendEmail: () =>
                sendReservationConfirmedSeekerEmail(
                  seekerEmail,
                  salleName,
                  amountForEmail,
                  `${siteUrl}/dashboard/reservations`
                ),
            })
          );
        }
        if (ownerId) {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(ownerId);
          const ownerEmail = ownerUser?.user?.email ?? null;
          if (ownerEmail) {
            notifPromises.push(
              sendUserNotification({
                userId: ownerId,
                telegramText: [
                  "Reservation confirmee sur votre annonce.",
                  `Salle: ${salleName}`,
                  `Montant: ${amountForEmail} EUR`,
                  `${siteUrl}/proprietaire/reservations`,
                ].join("\n"),
                sendEmail: () =>
                  sendReservationConfirmedOwnerEmail(
                    ownerEmail,
                    salleName,
                    amountForEmail,
                    `${siteUrl}/proprietaire/reservations`
                  ),
              })
            );
          }
        }
        if (notifPromises.length > 0) {
          await Promise.allSettled(notifPromises).then((results) =>
            results.forEach((r, i) => {
              if (r.status === "rejected")
                console.error("[webhook] notif reservation:", i, r.reason);
            })
          );
        }
      }

      if (productType && shouldSendAdminPaymentTelegram) {
        const telegramAmountCents = session.amount_total ?? Number(metadata?.amount_cents ?? "0");
        await sendAdminPaymentTelegramNotification({
          amountCents: telegramAmountCents,
          currency: session.currency ?? "eur",
          productType,
          offerId: metadata?.offer_id ?? null,
          userId: metadata?.user_id ?? null,
          source: "checkout_session_completed",
        }).catch((e) => console.error("[webhook] notification telegram paiement:", e));
      }

      return {
        type: event.type,
        customerEmail: session.customer_details?.email ?? null,
        sessionId: session.id,
      };
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const metadata = (pi.metadata ?? {}) as Record<string, string>;
      const productType = metadata.product_type;
      if (productType === "reservation" && metadata.offer_id) {
        const supabase = createAdminClient();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";
        const seekerId = metadata.seeker_id ?? metadata.user_id ?? "";
        const ownerId = metadata.owner_id ?? "";
        const offerId = metadata.offer_id;
        const amountForText = ((pi.amount ?? 0) / 100).toFixed(2);

        const { data: offerNotif } = await supabase
          .from("offers")
          .select("salle_id")
          .eq("id", offerId)
          .maybeSingle();
        const salleId = (offerNotif as { salle_id?: string | null } | null)?.salle_id ?? null;
        const { data: salleRow } = salleId
          ? await supabase.from("salles").select("name").eq("id", salleId).maybeSingle()
          : { data: null };
        const salleName = (salleRow as { name?: string | null } | null)?.name ?? "la salle";

        const paymentFailedPromises: Promise<unknown>[] = [];
        if (seekerId) {
          const { data: seekerUser } = await supabase.auth.admin.getUserById(seekerId);
          const seekerEmail = seekerUser?.user?.email ?? null;
          if (seekerEmail) {
            paymentFailedPromises.push(
              sendUserNotification({
                userId: seekerId,
                telegramText: [
                  "Paiement echoue.",
                  `Salle: ${salleName}`,
                  `Montant: ${amountForText} EUR`,
                  `${siteUrl}/dashboard/paiement`,
                ].join("\n"),
                sendEmail: () =>
                  sendPaymentFailedSeekerEmail(
                    seekerEmail,
                    salleName,
                    `${siteUrl}/dashboard/paiement`
                  ),
              })
            );
          }
        }
        if (ownerId) {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(ownerId);
          const ownerEmail = ownerUser?.user?.email ?? null;
          if (ownerEmail) {
            paymentFailedPromises.push(
              sendUserNotification({
                userId: ownerId,
                telegramText: [
                  "Paiement echoue sur une reservation.",
                  `Salle: ${salleName}`,
                  `Montant: ${amountForText} EUR`,
                  `${siteUrl}/proprietaire/reservations`,
                ].join("\n"),
                sendEmail: () =>
                  sendPaymentFailedOwnerEmail(
                    ownerEmail,
                    salleName,
                    `${siteUrl}/proprietaire/reservations`
                  ),
              })
            );
          }
        }
        paymentFailedPromises.push(
          sendAdminPaymentTelegramNotification({
            amountCents: pi.amount ?? 0,
            currency: pi.currency ?? "eur",
            productType: "reservation",
            offerId,
            userId: seekerId || null,
            source: "payment_intent_failed",
          })
        );
        await Promise.allSettled(paymentFailedPromises).then((results) =>
          results.forEach((r, i) => {
            if (r.status === "rejected")
              console.error("[webhook] payment failed notif:", i, r.reason);
          })
        );
      }
      return { type: event.type, paymentIntentId: pi.id };
    }
    default:
      return { type: event.type, ignored: true };
  }
}
