"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface MobileNavProps {
  isLoggedIn: boolean;
  userType?: "seeker" | "owner";
}

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/auth?tab=signup", label: "Ajoutez ma salle" },
];

export function MobileNav({ isLoggedIn, userType }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);

  return (
    <div className="hidden max-md:flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-black/20"
            onClick={handleClose}
            aria-hidden="true"
          />
          <nav
            className="fixed left-0 right-0 top-14 z-50 border-b border-slate-200 bg-white shadow-lg"
            role="dialog"
            aria-label="Menu de navigation"
          >
            <div className="flex flex-col py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleClose}
                  className="border-b border-slate-100 px-6 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-slate-200 px-6 py-4">
                {isLoggedIn ? (
                  <Link
                    href={userType === "owner" ? "/proprietaire" : "/dashboard"}
                    onClick={handleClose}
                    className="flex w-full items-center justify-center rounded-md bg-[#263e55] py-3 text-[14px] font-medium text-white hover:bg-[#213449]"
                  >
                    Tableau de bord
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/auth"
                      onClick={handleClose}
                      className="block py-2 text-center text-[14px] font-medium text-slate-700 hover:text-slate-900"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/auth?tab=signup"
                      onClick={handleClose}
                      className="flex w-full items-center justify-center rounded-md bg-[#263e55] py-3 text-[14px] font-medium text-white hover:bg-[#213449]"
                    >
                      Inscription
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
