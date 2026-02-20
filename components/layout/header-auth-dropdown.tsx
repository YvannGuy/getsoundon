"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function HeaderAuthDropdown({ dashboardHref }: { dashboardHref: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="inline-flex overflow-hidden rounded-md bg-[#213398]">
      <Link
        href={dashboardHref}
        className="inline-flex h-9 items-center px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#1a2980]"
      >
        Tableau de bord
      </Link>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center border-l border-white/20 px-2 text-white transition-colors hover:bg-[#1a2980]"
            aria-label="Menu"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
