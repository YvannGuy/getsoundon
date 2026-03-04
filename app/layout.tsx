import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";

import { Analytics } from "@/components/Analytics";
import { CookieProvider } from "@/components/cookies/CookieProvider";
import { siteConfig } from "@/config/site";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";
import "@/styles/animations.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  ...defaultMetadata,
};

export const viewport: Viewport = {
  themeColor: "#213398",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      logo: `${siteConfig.url}/logosdcbl.png`,
      sameAs: [siteConfig.instagram, siteConfig.facebook],
      contactPoint: {
        "@type": "ContactPoint",
        url: `${siteConfig.url}/centre-aide`,
        contactType: "customer service",
        availableLanguage: "French",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: "fr",
      description: siteConfig.description,
      publisher: {
        "@id": `${siteConfig.url}#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.url}/rechercher?ville={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`} suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17978481756"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17978481756');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Script id="crisp-chat" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="62bde919-94c1-4b2e-8a44-990fb6533f17";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
        </Script>
        <CookieProvider>
          {children}
          <ScrollToTop />
          <Analytics />
        </CookieProvider>
      </body>
    </html>
  );
}
