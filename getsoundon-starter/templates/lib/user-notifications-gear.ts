type SendEmailFn = () => Promise<unknown>;

type NotifyParams = {
  userId: string;
  telegramText: string;
  sendEmail: SendEmailFn;
};

/**
 * Template minimal.
 * Branche ici:
 * - lookup profil (email + telegram_chat_id)
 * - envoi Telegram (optionnel)
 * - envoi email transactionnel
 */
export async function sendUserNotificationGear(params: NotifyParams) {
  const { userId, telegramText, sendEmail } = params;

  // TODO: remplacer par la vraie logique de lookup profil.
  void userId;
  void telegramText;

  try {
    await sendEmail();
  } catch (error) {
    console.error("[getsoundon notification] email error:", error);
  }
}

type AdminPaymentParams = {
  amountCents: number;
  currency: string;
  productType: string;
  offerId: string | null;
  userId: string | null;
  source: string;
};

/**
 * Hook admin notif paiement (Telegram/Slack/email).
 */
export async function sendAdminPaymentNotificationGear(
  params: AdminPaymentParams
) {
  // TODO: brancher vers votre canal ops.
  console.log("[getsoundon admin payment]", params);
}
