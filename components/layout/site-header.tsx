import Image from "next/image";
import Link from "next/link";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { siteConfig } from "@/config/site";
import type { EffectiveUserType } from "@/lib/auth-utils";
import { getDashboardHref, getEffectiveUserType, getPublishMaterialListingHref } from "@/lib/auth-utils";
import { HeaderCartDropdown } from "@/components/layout/header-cart-dropdown";
import { fetchAuthProfileRow } from "@/lib/fetch-auth-profile";
import { getDraftCartPreviewForUser } from "@/lib/gs-draft-cart-preview";
import { getUserOrNull } from "@/lib/supabase/server";

export async function SiteHeader() {
  const { user, supabase } = await getUserOrNull();
  const isLoggedIn = !!user;

  let userType: EffectiveUserType | null = null;
  let accountAvatarUrl: string | null = null;
  let accountDisplayName: string | null = null;
  let accountEmail: string | null = null;

  if (user) {
    const profileRow = await fetchAuthProfileRow(user.id, supabase);

    const resolved = await getEffectiveUserType(user, async () =>
      profileRow ? { user_type: profileRow.user_type } : null,
    );
    userType = (resolved ?? "seeker") as EffectiveUserType;

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    accountAvatarUrl =
      (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) ||
      (typeof meta?.picture === "string" && meta.picture.trim()) ||
      null;
    accountDisplayName =
      profileRow?.full_name?.trim() ||
      profileRow?.first_name?.trim() ||
      (typeof meta?.full_name === "string" ? meta.full_name.trim() : null) ||
      null;
    accountEmail = user.email ?? null;
  }

  const cartPreview = user ? await getDraftCartPreviewForUser(user.id) : null;

  let publishMaterialHref = "/auth?tab=signup&userType=owner";
  if (user) {
    const { data: myListings } = await supabase
      .from("gs_listings")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);
    const hasCatalogListings = (myListings ?? []).length > 0;
    publishMaterialHref = getPublishMaterialListingHref(userType, hasCatalogListings, true);
  }

  return (
    <header className="border-y border-slate-300 bg-[#f1f3f5]">
      <div className="container flex h-14 max-w-[1120px] items-center justify-between">
        <Link
          href="/"
          className="flex items-center text-xl font-semibold leading-none text-gs-orange hover:text-orange-950"
        >
          <Image src="/images/logosound.png" alt="" width={60} height={60} className="h-[60px] w-[60px] shrink-0 rounded-full object-cover -mr-3" />
          {siteConfig.name}
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-semibold text-slate-500 md:flex">
          <Link href="/#categories-evenement" className="hover:text-black">
            Catégories
          </Link>
          <Link href="/blog" className="hover:text-black">
            Blog
          </Link>
          <Link href="/avantages" className="hover:text-black">
            Nos avantages
          </Link>
          <Link href={publishMaterialHref} className="hover:text-black">
            Publier mon materiel
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <HeaderCartDropdown
            serverPreview={cartPreview}
            isAuthenticated={isLoggedIn}
          />
          <div className="max-md:hidden md:flex">
            <HeaderAuth />
          </div>
          <MobileNav
            isLoggedIn={isLoggedIn}
            userType={userType}
            dashboardHref={isLoggedIn ? getDashboardHref(userType ?? "seeker") : undefined}
            addSalleHref={publishMaterialHref}
            accountAvatarUrl={accountAvatarUrl}
            accountDisplayName={accountDisplayName}
            accountEmail={accountEmail}
            cartServerUnits={cartPreview?.units ?? 0}
          />
        </div>
      </div>
    </header>
  );
}
