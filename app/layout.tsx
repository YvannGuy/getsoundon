import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Montserrat } from "next/font/google";
import type { Graph, Organization, WebSite, ContactPoint, SearchAction } from "schema-dts";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

import { Analytics } from "@/components/Analytics";
import { CookieProvider } from "@/components/cookies/CookieProvider";
import { MarketingThirdPartyScripts } from "@/components/cookies/MarketingThirdPartyScripts";
import { siteConfig } from "@/config/site";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";
import "@/components/landing/landing.css";
import "@/styles/animations.css";

// Debug utils en développement
if (process.env.NODE_ENV === 'development') {
  import("@/lib/event-assistant/recommendation-debug-utils");
  import("@/lib/event-assistant/matching-debug-utils");
}

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-landing-montserrat",
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-landing-inter",
  display: "swap",
});

export const metadata: Metadata = {
  ...defaultMetadata,
};

export const viewport: Viewport = {
  themeColor: "#E86F1C",
};

const structuredData: Graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      logo: `${siteConfig.url}/images/logosound.png`,
      sameAs: [siteConfig.instagram, siteConfig.facebook],
      contactPoint: {
        "@type": "ContactPoint",
        url: `${siteConfig.url}/centre-aide`,
        contactType: "customer service",
        availableLanguage: "French",
      } satisfies ContactPoint,
    } satisfies Organization,
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: "fr",
      description: siteConfig.description,
      publisher: { "@id": `${siteConfig.url}#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.url}/catalogue?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      } as SearchAction,
    } satisfies WebSite,
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${montserrat.variable} ${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <CookieProvider>
          {children}
          <ScrollToTop />
          <Analytics />
          <VercelAnalytics />
          <MarketingThirdPartyScripts />
        </CookieProvider>
      </body>
    </html>
  );
}
