import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Montserrat } from "next/font/google";
import Script from "next/script";
import type { Graph, Organization, WebSite, ContactPoint, SearchAction } from "schema-dts";

import { Analytics } from "@/components/Analytics";
import { CookieProvider } from "@/components/cookies/CookieProvider";
import { siteConfig } from "@/config/site";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";
import "@/components/landing/landing.css";
import "@/styles/animations.css";

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
        target: `${siteConfig.url}/rechercher?ville={search_term_string}`,
        "query-input": "required name=search_term_string",
      } as SearchAction,
    } satisfies WebSite,
  ],
};

const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

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
        {googleAdsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
              `}
            </Script>
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {crispWebsiteId ? (
          <Script id="crisp-chat" strategy="afterInteractive">
            {`window.$crisp=[];window.CRISP_WEBSITE_ID="${crispWebsiteId}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
          </Script>
        ) : null}
        <CookieProvider>
          {children}
          <ScrollToTop />
          <Analytics />
        </CookieProvider>
      </body>
    </html>
  );
}
