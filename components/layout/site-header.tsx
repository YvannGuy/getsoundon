import Image from "next/image";
import Link from "next/link";

import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { siteConfig } from "@/config/site";
import type { EffectiveUserType } from "@/lib/auth-utils";
import { getDashboardHref, getEffectiveUserType, getPublishMaterialListingHref } from "@/lib/auth-utils";
import { getUserOrNull } from "@/lib/supabase/server";

export async function SiteHeader() {
  const { user, supabase } = await getUserOrNull();
  const isLoggedIn = !!user;
  const getProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle();
    return data;
  };
  const userType = (user
    ? await getEffectiveUserType(user, getProfile)
    : null) as EffectiveUserType | null;

  let publishMaterialHref = "/auth?tab=signup&userType=owner";
  if (user) {
    const { data: mySalles } = await supabase
      .from("salles")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);
    const hasSalles = (mySalles ?? []).length > 0;
    publishMaterialHref = getPublishMaterialListingHref(userType, hasSalles, true);
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
          <div className="max-md:hidden md:flex">
            <HeaderAuth />
          </div>
          <MobileNav
            isLoggedIn={isLoggedIn}
            userType={userType}
            dashboardHref={isLoggedIn ? getDashboardHref(userType ?? "seeker") : undefined}
            addSalleHref={publishMaterialHref}
          />
        </div>
      </div>
    </header>
  );
}
