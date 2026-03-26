  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";
export type NotificationChannel = "email" | "telegram" | "both";

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? process.env.TELEGRAM_ADMIN_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return { botToken, chatIds };
}

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() ?? "";
}

export async function sendAdminPendingSalleTelegramNotification(
  salleName: string,
  salleCity: string,
  validationUrl: string
) {
  const { botToken, chatIds } = getTelegramConfig();
  if (!botToken || chatIds.length === 0) {
    return { success: false, skipped: true as const };
  }

  const safeSalleName = salleName || "Ma salle";
  const safeSalleCity = salleCity || "Ville non renseignée";
  const fallbackValidationUrl = validationUrl || `${siteUrl}/admin/annonces-a-valider`;
  const message = [
    "Nouvelle annonce à valider",
    `Salle: ${safeSalleName}`,
    `Ville: ${safeSalleCity}`,
    `Ouvrir admin: ${fallbackValidationUrl}`,
  ].join("\n");

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const results = await sendTelegramToAdminChats(endpoint, chatIds, message);
  const hasSuccess = results.some((r) => r.ok);
  return { success: hasSuccess, results };
}

export async function sendAdminPublishedSalleTelegramNotification(
  salleName: string,
  salleCity: string,
  annoncesUrl: string
) {
  const { botToken, chatIds } = getTelegramConfig();
  if (!botToken || chatIds.length === 0) {
    return { success: false, skipped: true as const };
  }

  const safeSalleName = salleName || "Ma salle";
  const safeSalleCity = salleCity || "Ville non renseignée";
  const message = [
    "Nouvelle annonce publiée (auto)",
    `Salle: ${safeSalleName}`,
    `Ville: ${safeSalleCity}`,
    `Voir: ${annoncesUrl}`,
  ].join("\n");

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const results = await sendTelegramToAdminChats(endpoint, chatIds, message);
  const hasSuccess = results.some((r) => r.ok);
  return { success: hasSuccess, results };
}

export async function sendAdminPaymentTelegramNotification(params: {
  amountCents: number;
  currency?: string | null;
  productType: string;
  offerId?: string | null;
  userId?: string | null;
  source: "checkout_session_completed" | "invoice_paid" | "payment_intent_failed";
}) {
  const { botToken, chatIds } = getTelegramConfig();
  if (!botToken || chatIds.length === 0) {
    return { success: false, skipped: true as const };
  }

  const amount = Number.isFinite(params.amountCents)
    ? (params.amountCents / 100).toFixed(2)
    : "0.00";
  const currency = (params.currency ?? "eur").toUpperCase();
  const adminPaymentsUrl = `${siteUrl}/admin/paiements`;
  const offerPart = params.offerId ? `Offre: ${params.offerId}` : "Offre: n/a";
  const userPart = params.userId ? `Utilisateur: ${params.userId}` : "Utilisateur: n/a";
  const message = [
    "Paiement recu (admin)",
    `Montant: ${amount} ${currency}`,
    `Type: ${params.productType}`,
    offerPart,
    userPart,
    `Source: ${params.source}`,
    `Voir paiements: ${adminPaymentsUrl}`,
  ].join("\n");

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const results = await sendTelegramToAdminChats(endpoint, chatIds, message);
  const hasSuccess = results.some((r) => r.ok);
  return { success: hasSuccess, results };
}

export async function sendTelegramMessageToChat(chatId: string, message: string) {
  const { botToken } = getTelegramConfig();
  if (!botToken || !chatId) {
    return { success: false, skipped: true as const };
  }
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = new URLSearchParams({
    chat_id: chatId,
    text: message,
    disable_web_page_preview: "true",
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `HTTP ${res.status} ${text}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function sendTelegramLinkSuccessMessage(chatId: string) {
  return sendTelegramMessageToChat(
    chatId,
    [
      "Telegram connecte avec succes.",
      "Vous pouvez maintenant choisir vos notifications Telegram dans Parametres.",
      `${siteUrl}/dashboard/parametres`,
    ].join("\n")
  );
}

async function sendTelegramToAdminChats(
  endpoint: string,
  chatIds: string[],
  message: string
) {
  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const body = new URLSearchParams({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: "true",
      });

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { ok: false, chatId, error: `HTTP ${res.status} ${text}` };
        }
        return { ok: true, chatId };
      } catch (error) {
        return { ok: false, chatId, error: String(error) };
      }
    })
  );

  return results;
}

