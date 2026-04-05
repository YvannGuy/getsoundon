import { ParametresContent } from "@/components/parametres/parametres-content";
import { createClient } from "@/lib/supabase/server";

export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, full_name, email, phone, last_password_change, stripe_account_id, telegram_chat_id, notification_channel")
    .eq("id", user.id)
    .maybeSingle();

  const parts = profile?.full_name?.split(" ") ?? [];
  const firstName = profile?.first_name ?? parts[0] ?? "";
  const lastName =
    profile?.last_name ??
    (parts.length > 1 ? parts.slice(1).join(" ") : "");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Paramètres</h1>
        <p className="mt-2 text-slate-500">Gérez votre compte</p>
      </div>
      <ParametresContent
        profile={{
          first_name: firstName ? firstName : null,
          last_name: lastName ? lastName : null,
          email: profile?.email ?? user.email ?? null,
          phone: profile?.phone ?? null,
          last_password_change: profile?.last_password_change ?? null,
          telegram_chat_id: (profile as { telegram_chat_id?: string | null } | null)?.telegram_chat_id ?? null,
          notification_channel: (profile as { notification_channel?: string | null } | null)?.notification_channel ?? "email",
        }}
        deleteDataLabel="annonces, demandes et messages"
        hasStripeConnect={!!(profile as { stripe_account_id?: string } | null)?.stripe_account_id}
      />
    </div>
  );
}
