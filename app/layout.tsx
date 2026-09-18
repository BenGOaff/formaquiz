import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FAVICON_SRC, LOGO_SRC } from "@/lib/assetVersion";
import CompteurDeVue from "@/components/site/CompteurDeVue";
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
        {/* COMBIEN DE MONDE ARRIVE. Posé ICI, à la racine, et à un seul
            endroit : le bon de commande n'est pas sous un cadre commun.
            Le composant refuse de lui même tout hôte qui n'est pas un
            domaine de vente.
            Il a remplacé le comptage du middleware le 18 septembre :
            mesuré ce jour là, `atelierduquiz.fr/` rend `cf-cache-status:
            HIT`, donc Cloudflare sert la page et le middleware ne tourne
            jamais (cf. lib/trafic/vueNavigateur.ts). */}
        <CompteurDeVue />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
