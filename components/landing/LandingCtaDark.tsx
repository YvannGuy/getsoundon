"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

export function LandingCtaDark() {
  const cardRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const btn = btnRef.current;
    if (card) {
      gsap.from(card, { x: 48, opacity: 0, duration: 0.8, ease: "power2.out" });
    }
    if (btn) {
      btn.addEventListener("mouseenter", () => {
        gsap.to(btn, { scale: 1.05, duration: 0.25, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { scale: 1, duration: 0.25, ease: "power2.out" });
      });
    }
  }, []);

  return (
    <section className="landing-section bg-gs-dark text-white">
      <div className="landing-container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="font-landing-section-title text-white">
            Loue ou mets ton matériel en location.
          </h2>
          <p className="font-landing-body mt-4 max-w-lg text-white/90">
            Publie ton annonce, gère tes demandes et reçois des réservations en toute simplicité sur
            GetSoundOn.
          </p>
          <Link
            ref={btnRef}
            href="/auth?tab=signup&userType=owner"
            className="font-landing-btn mt-8 inline-flex rounded-md bg-gs-orange px-8 py-3.5 text-white shadow-lg transition hover:shadow-xl"
          >
            Louer/Mettre en location
          </Link>
        </div>

        <div ref={cardRef} className="relative mx-auto w-full max-w-md">
          <div className="rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <p className="font-landing-overline text-gs-dark">Aperçu tableau de bord</p>
            <ul className="font-landing-body mt-4 space-y-3 text-sm text-[#444]">
              <li className="flex items-center justify-between gap-2 rounded-lg border border-gs-line bg-gs-beige px-3 py-2.5">
                <span className="font-medium">Pack DJ Pioneer</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Actif
                </span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-lg border border-gs-line px-3 py-2.5">
                <span className="font-medium">Sonorisation JBL</span>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  En attente
                </span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-lg border border-gs-line px-3 py-2.5">
                <span className="font-medium">Lumières Chauvet</span>
                <button type="button" className="font-landing-body text-sm font-bold text-gs-orange">
                  Supprimer
                </button>
              </li>
            </ul>
            <div className="relative mt-4 h-24 overflow-hidden rounded-lg bg-slate-100">
              <Image
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-90"
                sizes="400px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
