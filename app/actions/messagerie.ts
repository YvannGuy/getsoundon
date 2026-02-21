"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const BUCKET_MESSAGE_ATTACHMENTS = "message-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

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

  const { data: demande } = await supabase
    .from("demandes")
    .select("seeker_id, salle_id")
    .eq("id", demandeId)
    .maybeSingle();

  if (!demande) return { error: "Demande introuvable", conversationId: null };

  const { data: salle } = await supabase
    .from("salles")
    .select("owner_id")
    .eq("id", (demande as { salle_id: string }).salle_id)
    .maybeSingle();

  if (!salle) return { error: "Salle introuvable", conversationId: null };

  const demandeRow = demande as { seeker_id: string; salle_id: string };
  const salleRow = salle as { owner_id: string };
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      demande_id: demandeId,
      seeker_id: demandeRow.seeker_id,
      owner_id: salleRow.owner_id,
      salle_id: demandeRow.salle_id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message, conversationId: null };
  return { conversationId: newConv.id, error: null };
}

async function clearRecipientArchiveOnNewMessage(conversationId: string, senderId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("seeker_id, owner_id")
    .eq("id", conversationId)
    .single();
  if (!conv) return;
  const recipientId = conv.seeker_id === senderId ? conv.owner_id : conv.seeker_id;
  await admin
    .from("user_conversation_preferences")
    .upsert(
      {
        user_id: recipientId,
        conversation_id: conversationId,
        archived_at: null,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,conversation_id" }
    );
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

  await clearRecipientArchiveOnNewMessage(conversationId, user.id);

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

export async function sendMessageWithAttachments(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const content = (formData.get("content") as string)?.trim() ?? "";
  const conversationId = formData.get("conversationId") as string;
  const files = formData.getAll("attachments") as File[];

  if (!conversationId) return { success: false, error: "Conversation manquante" };
  if (!content && files.length === 0)
    return { success: false, error: "Message vide ou pièce jointe requise" };

  const validFiles = files.filter((f) => {
    if (!f.size) return false;
    if (f.size > MAX_FILE_SIZE) return false;
    if (!ALLOWED_MIME_TYPES.includes(f.type)) return false;
    return true;
  });

  if (files.length > 0 && validFiles.length === 0)
    return {
      success: false,
      error: "Fichiers invalides : JPG, PNG, GIF, WebP ou PDF, max 10 Mo chacun.",
    };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, seeker_id, owner_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv.seeker_id !== user.id && conv.owner_id !== user.id))
    return { success: false, error: "Accès refusé" };

  const { data: msg, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content || "[Pièce(s) jointe(s)]",
    })
    .select("id")
    .single();

  if (insertError) return { success: false, error: insertError.message };

  const messageId = msg.id;

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
  const storagePath = `${conversationId}/${messageId}/${randomUUID()}-${file.name}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_MESSAGE_ATTACHMENTS)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Erreur upload (${file.name}) : ${uploadError.message}`,
      };
    }

    const { error: attachError } = await supabase.from("message_attachments").insert({
      message_id: messageId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    if (attachError) {
      return {
        success: false,
        error: `Erreur enregistrement pièce jointe : ${attachError.message}`,
      };
    }
  }

  await clearRecipientArchiveOnNewMessage(conversationId, user.id);

  const preview =
    content.length > 80 ? content.slice(0, 77) + "..." : content || "[Pièce(s) jointe(s)]";
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

export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const parts = storagePath.split("/");
  const conversationId = parts[0];
  if (!conversationId) return null;

  const { data: conv } = await supabase
    .from("conversations")
    .select("seeker_id, owner_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv.seeker_id !== user.id && conv.owner_id !== user.id)) return null;

  const { data } = await supabase.storage
    .from(BUCKET_MESSAGE_ATTACHMENTS)
    .createSignedUrl(storagePath, 3600); // 1h

  return data?.signedUrl ?? null;
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Message vide" };

  const { data: msg } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id, deleted_at")
    .eq("id", messageId)
    .single();

  if (!msg || msg.deleted_at)
    return { success: false, error: "Message introuvable" };
  if ((msg as { sender_id: string }).sender_id !== user.id)
    return { success: false, error: "Vous ne pouvez modifier que vos propres messages" };

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { success: false, error: error.message };

  const convId = (msg as { conversation_id: string }).conversation_id;
  const preview = trimmed.length > 80 ? trimmed.slice(0, 77) + "..." : trimmed;
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId);

  return { success: true };
}

export async function deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: msg } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id, content, deleted_at")
    .eq("id", messageId)
    .single();

  if (!msg || msg.deleted_at)
    return { success: false, error: "Message introuvable" };
  if ((msg as { sender_id: string }).sender_id !== user.id)
    return { success: false, error: "Vous ne pouvez supprimer que vos propres messages" };

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { success: false, error: error.message };

  const convId = (msg as { conversation_id: string }).conversation_id;

  const { data: lastMsg } = await supabase
    .from("messages")
    .select("content, sent_at")
    .eq("conversation_id", convId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const preview = lastMsg?.content
    ? lastMsg.content.length > 80
      ? lastMsg.content.slice(0, 77) + "..."
      : lastMsg.content
    : "";
  const lastAt = lastMsg?.sent_at ?? null;

  await supabase
    .from("conversations")
    .update({
      last_message_at: lastAt,
      last_message_preview: preview,
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId);

  return { success: true };
}

export async function archiveConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("seeker_id, owner_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv.seeker_id !== user.id && conv.owner_id !== user.id))
    return { success: false, error: "Accès refusé" };

  const { error } = await supabase
    .from("user_conversation_preferences")
    .upsert(
      {
        user_id: user.id,
        conversation_id: conversationId,
        archived_at: new Date().toISOString(),
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,conversation_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function unarchiveConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { error } = await supabase
    .from("user_conversation_preferences")
    .update({
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("seeker_id, owner_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv.seeker_id !== user.id && conv.owner_id !== user.id))
    return { success: false, error: "Accès refusé" };

  const { error } = await supabase
    .from("user_conversation_preferences")
    .upsert(
      {
        user_id: user.id,
        conversation_id: conversationId,
        archived_at: null,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,conversation_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getAttachmentSignedUrls(
  paths: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const p of paths) {
    const url = await getAttachmentSignedUrl(p);
    if (url) result[p] = url;
  }
  return result;
}
