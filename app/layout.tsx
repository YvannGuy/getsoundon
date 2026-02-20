import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";
import "@/styles/animations.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "salledeculte.com",
  description: "Boilerplate Next.js + Stripe + Supabase",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
