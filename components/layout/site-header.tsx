import Link from "next/link";

import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  const userType = (user?.user_metadata?.user_type ?? "seeker") as "seeker" | "owner";

  return (
    <header className="border-y border-slate-300 bg-[#f1f3f5]">
      <div className="container flex h-14 max-w-[1120px] items-center justify-between">
        <Link href="/" className="text-xl font-semibold leading-none text-[#303B4A]">
          {siteConfig.name}
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-semibold text-slate-500 md:flex">
          <Link href="/blog" className="hover:text-slate-800">
            Blog
          </Link>
          <a href="/#comment-ca-marche" className="hover:text-slate-900">
            Comment ça marche
          </a>
          <a href="/#tarifs" className="hover:text-slate-900">
            Tarifs
          </a>
          <Link href="/auth?tab=signup" className="hover:text-slate-900">
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
