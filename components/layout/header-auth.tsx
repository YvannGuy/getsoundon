import Link from "next/link";

import { HeaderAuthDropdown } from "@/components/layout/header-auth-dropdown";
import { getDashboardHref, getEffectiveUserType } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

export async function HeaderAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const getProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", userId)
        .maybeSingle();
      return data;
    };
    const userType = await getEffectiveUserType(user, getProfile);
    const dashboardHref = getDashboardHref(userType ?? "seeker");
    return <HeaderAuthDropdown dashboardHref={dashboardHref} />;
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth"
        className="text-[14px] font-medium text-slate-600 transition-colors hover:text-black"
      >
        Connexion
      </Link>
      <Link
        href="/auth?tab=signup"
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#213398] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#1a2980]"
      >
        Inscription
      </Link>
    </div>
  );
}
