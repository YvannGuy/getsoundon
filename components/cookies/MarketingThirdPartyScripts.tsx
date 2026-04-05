"use client";

import Script from "next/script";

import { ConsentGate } from "@/components/cookies/ConsentGate";

const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * Google Ads (gtag) : chargé uniquement après consentement « marketing » (site_consent).
 */
export function MarketingThirdPartyScripts() {
  if (!googleAdsId) return null;

  return (
    <ConsentGate category="marketing">
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-google-ads" strategy="afterInteractive">
          {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
              `}
        </Script>
      </>
    </ConsentGate>
  );
}
