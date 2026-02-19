import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export async function HeaderAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const userType = user.user_metadata?.user_type ?? "seeker";
    const dashboardHref = userType === "owner" ? "/proprietaire" : "/dashboard";
    return (
      <Link
        href={dashboardHref}
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#263e55] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#213449]"
      >
        Tableau de bord
      </Link>
    );
  }

  return (
    <Link
      href="/auth"
      className="inline-flex h-9 items-center justify-center rounded-md bg-[#263e55] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#213449]"
    >
      Connexion
    </Link>
  );
}
