import Stripe from "stripe";

import { generateContractPdf } from "@/lib/contract-pdf";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as Record<string, string> | null;
      const productType = metadata?.product_type;

      if (!productType || (productType !== "reservation" && !["pass_24h", "pass_48h", "abonnement"].includes(productType))) {
        console.log("[webhook] checkout.session.completed ignoré (metadata):", { productType, offer_id: metadata?.offer_id, user_id: metadata?.user_id });
      }

      if (productType === "reservation" && metadata?.offer_id && metadata?.user_id) {
        const supabase = createAdminClient();
        const offerId = metadata.offer_id;
        const amount = session.amount_total ?? 0;
        const amountEur = ((amount ?? 0) / 100).toFixed(2);
        const stripe = getStripe();
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        const depositAmountCents = Number(metadata?.deposit_amount_cents ?? "0");

        // Mise à jour atomique : un seul webhook "gagne" (idempotence)
        const { data: updatedOffer, error: updateError } = await supabase
          .from("offers")
          .update({
            status: "paid",
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            deposit_status: depositAmountCents > 0 ? "held" : "none",
            deposit_hold_status: "none",
            updated_at: new Date().toISOString(),
          })
          .eq("id", offerId)
          .eq("status", "pending")
          .select("conversation_id")
          .maybeSingle();

        if (updateError || !updatedOffer) {
          console.warn("[webhook] Offre déjà traitée ou introuvable:", offerId, updateError?.message ?? "0 rows");
        } else {
          // Créer une empreinte bancaire séparée pour la caution (non débitée immédiatement)
          if (depositAmountCents > 0 && paymentIntentId) {
            try {
              const paidPi = await stripe.paymentIntents.retrieve(paymentIntentId);
              const customerId =
                typeof paidPi.customer === "string" ? paidPi.customer : paidPi.customer?.id ?? null;
              const paymentMethodId =
                typeof paidPi.payment_method === "string"
                  ? paidPi.payment_method
                  : paidPi.payment_method?.id ?? null;

              if (customerId && paymentMethodId) {
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
              } else {
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
          }

          const convId = (updatedOffer as { conversation_id: string }).conversation_id;

          const { data: insertedPayment, error: payError } = await supabase
            .from("payments")
            .insert({
              user_id: metadata.user_id,
              stripe_session_id: session.id,
              amount,
              currency: session.currency ?? "eur",
              product_type: "reservation",
              status: "paid",
              offer_id: offerId,
            })
            .select("id")
            .single();
          if (payError) {
            console.error("[webhook] Erreur insert payments:", payError.message);
          } else {
            console.log("[webhook] Payment insert OK: reservation", offerId);
          }

          const msgContent = `A payé l'offre de ${amountEur} €.`;
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
              .select("id, amount_cents, date_debut, date_fin, event_type, salle_id, owner_id, seeker_id")
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
      } else if (
        productType &&
        ["pass_24h", "pass_48h", "abonnement"].includes(productType) &&
        metadata?.user_id
      ) {
        const amount = session.amount_total ?? 0;
        const isSubscription = session.mode === "subscription" && session.subscription;
        const supabase = createAdminClient();

        await supabase.from("payments").insert({
          user_id: metadata.user_id,
          stripe_session_id: session.id,
          amount,
          currency: session.currency ?? "eur",
          product_type: productType,
          status: isSubscription ? "active" : "paid",
          subscription_id: isSubscription ? session.subscription : null,
        });

        const updates: Record<string, unknown> = {};
        const customerId = session.customer as string | null;
        if (customerId) updates.stripe_customer_id = customerId;
        if (isSubscription && session.subscription) updates.stripe_subscription_id = session.subscription;

        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("id", metadata.user_id);
        }
      }

      return {
        type: event.type,
        customerEmail: session.customer_details?.email ?? null,
        sessionId: session.id,
      };
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const supabase = createAdminClient();
      await supabase.from("profiles").update({ stripe_subscription_id: null }).eq("stripe_subscription_id", subscription.id);
      await supabase.from("payments").update({ status: "canceled" }).eq("subscription_id", subscription.id);
      return { type: event.type, subscriptionId: subscription.id };
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
        const supabase = createAdminClient();
        await supabase.from("profiles").update({ stripe_subscription_id: null }).eq("stripe_subscription_id", subscription.id);
        await supabase.from("payments").update({ status: "canceled" }).eq("subscription_id", subscription.id);
      }
      return { type: event.type, subscriptionId: subscription.id, status: subscription.status };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      const subRaw = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? null;
      if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
        const supabase = createAdminClient();
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (profile?.id) {
          await supabase.from("payments").insert({
            user_id: profile.id,
            stripe_session_id: invoice.id,
            amount: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? "eur",
            product_type: "abonnement",
            status: "paid",
            subscription_id: subscriptionId,
          });
        }
      }
      return { type: event.type, invoiceId: invoice.id };
    }
    default:
      return { type: event.type, ignored: true };
  }
}
