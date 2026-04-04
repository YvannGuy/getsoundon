import Link from "next/link";

import { HeaderAuthDropdown } from "@/components/layout/header-auth-dropdown";
import { getDashboardHref, getEffectiveUserType } from "@/lib/auth-utils";
import { fetchAuthProfileRow } from "@/lib/fetch-auth-profile";
import { getUserOrNull } from "@/lib/supabase/server";

export async function HeaderAuth() {
  const { user, supabase } = await getUserOrNull();

  if (user) {
    const profileRow = await fetchAuthProfileRow(user.id, supabase);

    const userType = await getEffectiveUserType(user, async () =>
      profileRow ? { user_type: profileRow.user_type } : null,
    );
    const effective = userType ?? "seeker";
    const dashboardHref = getDashboardHref(effective);

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const avatarUrl =
      (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) ||
      (typeof meta?.picture === "string" && meta.picture.trim()) ||
      null;
    const displayName =
      profileRow?.full_name?.trim() ||
      profileRow?.first_name?.trim() ||
      (typeof meta?.full_name === "string" ? meta.full_name.trim() : null) ||
      null;

    return (
      <HeaderAuthDropdown
        dashboardHref={dashboardHref}
        userType={effective}
        avatarUrl={avatarUrl}
        displayName={displayName}
        email={user.email ?? null}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth?tab=signup"
        className="inline-flex h-9 items-center justify-center rounded-md bg-gs-orange px-6 text-[14px] font-medium text-white transition-colors hover:brightness-95"
      >
        Inscription
      </Link>
      <Link
        href="/auth"
        className="text-[14px] font-medium text-slate-600 transition-colors hover:text-black"
      >
        Connexion
      </Link>
    </div>
  );
}
