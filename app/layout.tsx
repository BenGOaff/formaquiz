import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FAVICON_SRC, LOGO_SRC } from "@/lib/assetVersion";
import { GOOGLE_SITE_VERIFICATION } from "@/lib/analytics/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "L'Atelier du Quiz",
  description: "Apprends les quiz en avançant dans un quiz.",
  robots: { index: false, follow: false }, // espace membre privé
  icons: { icon: FAVICON_SRC, apple: LOGO_SRC },
  // Le jeton de propriété Search Console. `noindex` juste au dessus ne
  // le gêne pas : Google doit pouvoir LIRE la page pour vérifier, pas
  // l'indexer. Les deux ne se confondent pas.
  verification: { google: GOOGLE_SITE_VERIFICATION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5D6CDB",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
