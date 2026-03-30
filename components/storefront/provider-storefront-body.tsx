"use client";

import { useState } from "react";

import {
  demoCatalogItems,
  demoCategories,
  demoFeaturedListings,
  demoProvider,
} from "@/lib/provider-storefront-demo";

import { FeaturedListingsSection } from "./featured-listings-section";
import { ProviderCatalogSection } from "./provider-catalog-section";
import { ProviderStatsServiceRow } from "./provider-stats-service-row";

const TABS = [
  { id: "boutique" as const, label: "Boutique" },
  { id: "about" as const, label: "À propos" },
  { id: "reviews" as const, label: "Avis et notation" },
];

export function ProviderStorefrontBody() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("boutique");

  return (
    <div className="landing-container pb-12 pt-6 sm:pb-16 sm:pt-8">
      <div className="border-b border-gs-line">
        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none sm:gap-10" aria-label="Sections de la boutique">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`font-landing-btn shrink-0 border-b-[3px] pb-3 text-xs tracking-[0.06em] transition sm:text-sm ${
                  active
                    ? "border-gs-orange text-gs-orange"
                    : "border-transparent text-[#888] hover:text-gs-dark"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === "boutique" ? (
        <div className="mt-6 space-y-0 sm:mt-8">
          <ProviderStatsServiceRow />
          <FeaturedListingsSection items={demoFeaturedListings} />
          <ProviderCatalogSection
            providerName={demoProvider.name}
            categories={demoCategories}
            items={demoCatalogItems}
          />
        </div>
      ) : null}

      {tab === "about" ? (
        <div className="mt-10 max-w-2xl">
          <p className="font-landing-body text-[#444] leading-relaxed">
            {demoProvider.name} est un loueur professionnel de matériel son, lumière et DJ sur Paris et l’Île-de-France.
            Cette section présentera bientôt la présentation détaillée du prestataire, son expérience et ses engagements.
          </p>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="mt-10 max-w-2xl">
          <p className="font-landing-body text-[#444] leading-relaxed">
            Les avis clients et la note détaillée seront affichés ici lorsque la boutique sera connectée aux données de
            confiance de la plateforme.
          </p>
        </div>
      ) : null}
    </div>
  );
}
