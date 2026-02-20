import Link from "next/link";

import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { siteConfig } from "@/config/site";
import type { EffectiveUserType } from "@/lib/auth-utils";
import { getEffectiveUserType } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  return (
    <header className="border-y border-slate-300 bg-[#f1f3f5]">
      <div className="container flex h-14 max-w-[1120px] items-center justify-between">
        <Link href="/" className="text-xl font-semibold leading-none text-black">
          {siteConfig.name}
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-semibold text-slate-500 md:flex">
          <Link href="/#categories-evenement" className="hover:text-black">
            Catégories
          </Link>
          <a href="/#comment-ca-marche" className="hover:text-black">
            Comment ça marche
          </a>
          <a href="/#tarifs" className="hover:text-black">
            Tarifs
          </a>
          <Link href="/auth?tab=signup" className="hover:text-black">
            Ajoutez ma salle
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="max-md:hidden md:flex">
            <HeaderAuth />
          </div>
          <MobileNav isLoggedIn={isLoggedIn} userType={userType} />
        </div>
      </div>
    </header>
  );
}
