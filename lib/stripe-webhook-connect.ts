import type Stripe from "stripe";

import { sendStripeConnectPaymentsReadyEmail, sendStripeConnectPayoutsInterruptedEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails prestataire sur changement explicite des capacités Connect dans `account.updated`.
 * Ne traite que si `previous_attributes.capabilities` est présent (évite le spam sur les
 * événements sans delta de capacités).
 */
export async function handleStripeConnectAccountUpdated(event: Stripe.Event): Promise<void> {
  if (event.type !== "account.updated") return;

  const account = event.data.object as Stripe.Account;
  if (!account?.id || typeof account.id !== "string") {
    console.warn("[webhook] account.updated: compte sans id");
    return;
  }
  const prev = event.data.previous_attributes as Record<string, unknown> | undefined;
  const prevCaps = prev?.capabilities as
    | { transfers?: string; legacy_payments?: string }
    | undefined;

  if (!prevCaps) return;

  const transfersActive = account.capabilities?.transfers === "active";
  const legacyActive = account.capabilities?.legacy_payments === "active";
  const nowOk = transfersActive || legacyActive;

  const wasOk =
    prevCaps.transfers === "active" || prevCaps.legacy_payments === "active";

  if (nowOk === wasOk) return;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_account_id", account.id)
    .maybeSingle();

  const userId = (profile as { id?: string } | null)?.id;
  if (!userId) {
    console.warn("[webhook] account.updated: profil introuvable pour compte", account.id);
    return;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData.user?.email?.trim()) {
    console.warn("[webhook] account.updated: email utilisateur introuvable", userId, authErr?.message);
    return;
  }

  const email = authData.user.email.trim();

  if (nowOk && !wasOk) {
    const result = await sendStripeConnectPaymentsReadyEmail(email);
    if (!result.success) {
      console.warn("[webhook] account.updated: envoi email paiements prêts échoué", result.error);
    } else {
      console.log("[webhook] account.updated: email paiements prêts envoyé", userId);
    }
    return;
  }

  if (wasOk && !nowOk) {
    const result = await sendStripeConnectPayoutsInterruptedEmail(email);
    if (!result.success) {
      console.warn("[webhook] account.updated: envoi email encaissements interrompus échoué", result.error);
    } else {
      console.log("[webhook] account.updated: email encaissements interrompus envoyé", userId);
    }
  }
}
