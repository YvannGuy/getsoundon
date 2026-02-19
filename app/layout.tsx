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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${manrope.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
