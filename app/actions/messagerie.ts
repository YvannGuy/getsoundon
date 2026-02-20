"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOrCreateConversation(demandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté", conversationId: null };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("demande_id", demandeId)
    .maybeSingle();

  if (conv) return { conversationId: conv.id, error: null };

  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ demande_id: demandeId })
    .select("id")
    .single();

  if (error) return { error: error.message, conversationId: null };
  return { conversationId: newConv.id, error: null };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Message vide" };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { success: false, error: error.message };

  const preview = trimmed.length > 80 ? trimmed.slice(0, 77) + "..." : trimmed;
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  return { success: true };
}
