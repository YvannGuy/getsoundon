export type LegacyMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type ConversationBookingLink = {
  conversation_id: string;
  booking_id: string;
};

export type GsMessageInsert = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function mapLegacyMessageToGsMessage(
  msg: LegacyMessage,
  link: ConversationBookingLink | null
): GsMessageInsert | null {
  if (!link || link.conversation_id !== msg.conversation_id) return null;
  return {
    id: msg.id,
    booking_id: link.booking_id,
    sender_id: msg.sender_id,
    content: msg.content,
    created_at: msg.created_at,
  };
}
