import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/app/actions/admin-settings";
import { ParametresClient } from "./parametres-client";

export default async function AdminParametresPage() {
  const settings = await getPlatformSettings();

  const supabase = createAdminClient();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const [
    { data: adminProfiles },
    { data: nonAdminProfiles },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("user_type", "admin"),
    supabase
      .from("profiles")
      .select("id, email, full_name, user_type")
      .neq("user_type", "admin")
      .order("full_name", { ascending: true }),
  ]);

  const admins = (adminProfiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: adminEmails.includes(p.email?.toLowerCase() ?? "") ? "Super Admin" : "Admin",
    isOwner: adminEmails.includes(p.email?.toLowerCase() ?? ""),
  }));

  const stripeConnected = !!(
    process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );

  const nonAdminUsers = (nonAdminProfiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    full_name: p.full_name,
    user_type: p.user_type ?? "seeker",
  }));

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <ParametresClient
        settings={settings}
        admins={admins}
        nonAdminUsers={nonAdminUsers}
        stripeConnected={stripeConnected}
      />
    </div>
  );
}
