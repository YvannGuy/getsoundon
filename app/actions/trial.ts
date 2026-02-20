"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTrialActivated(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("trial_activated_at")
    .eq("id", userId)
    .single();
  return !!data?.trial_activated_at;
}

export async function activateTrialAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("profiles")
    .update({ trial_activated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("trial_activated_at", null); // Ne met à jour que si pas déjà activé

  if (error) return { success: false, error: error.message };
  return { success: true };
}
