import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessageToChat, type NotificationChannel } from "@/lib/telegram";

/**
 * Notifications multi-canal (Telegram + email).
 * `sendEmail` doit envoyer un vrai message : un no-op empêche toute livraison email
 * lorsque le canal est « email », « both », ou en secours si Telegram échoue.
 */
type SendUserNotificationArgs = {
  userId: string;
  telegramText: string;
  sendEmail: () => Promise<unknown>;
};

export async function sendUserNotification({
  userId,
  telegramText,
  sendEmail,
}: SendUserNotificationArgs) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("notification_channel, telegram_chat_id")
    .eq("id", userId)
    .maybeSingle();

  const channel = normalizeChannel(
    (profile as { notification_channel?: string | null } | null)?.notification_channel
  );
  const telegramChatId =
    (profile as { telegram_chat_id?: string | null } | null)?.telegram_chat_id?.trim() ??
    "";

  const wantsTelegram = channel === "telegram" || channel === "both";
  const wantsEmail = channel === "email" || channel === "both";

  let telegramSent = false;
  if (wantsTelegram && telegramChatId) {
    const tg = await sendTelegramMessageToChat(telegramChatId, telegramText);
    telegramSent = !!tg.success;
  }

  // Fallback email si Telegram est demandé mais indisponible
  if (wantsEmail || (wantsTelegram && !telegramSent)) {
    await sendEmail();
  }

  return { success: true };
}

function normalizeChannel(value: string | null | undefined): NotificationChannel {
  if (value === "telegram" || value === "both" || value === "email") return value;
  return "email";
}

