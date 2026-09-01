// app/robots.ts
//
// LE ROBOTS.TXT D'ATELIERDUQUIZ.FR.
//
// 1er septembre 2026 : il n'y en avait aucun, et `sitemap.xml`
// répondait 404. Rien n'interdisait l'exploration, mais rien ne
// l'aidait : le seul chemin de Google jusqu'aux pages légales était un
// lien de pied de page, et ce sont précisément les pages qu'un acheteur
// méfiant va vérifier.
//
// Ce fichier ne DÉCIDE rien de neuf : il annonce ce qui existe déjà.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { isPublicSalesHost, publicSalesCanonical, salesSlugForHost } from "@/lib/sales/salesHosts";

const REPLI = "https://atelierduquiz.fr";

/** L'origine à annoncer, déduite de l'hôte de la requête. */
async function origine(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (isPublicSalesHost(host)) {
      const canonique = publicSalesCanonical(salesSlugForHost(host));
      if (canonique) return canonique.replace(/\/$/, "");
    }
  } catch {
    // Pas de requête en cours (build, script) : le domaine canonique.
  }
  return REPLI;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await origine();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/cert/` N'EST PAS LÀ, ET C'EST VOULU : chaque certificat est
        // déclaré indexable dans sa propre page. C'est une preuve
        // publique qu'une personne réelle a fini l'Atelier, et c'est la
        // seule chose sur ce domaine qu'un tiers publie à notre place.
        disallow: ["/admin", "/api/", "/apercu/", "/facture", "/bienvenue"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
