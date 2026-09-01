// app/sitemap.ts
//
// LE SITEMAP D'ATELIERDUQUIZ.FR.
//
// Ce domaine ne porte qu'une poignée de pages, et c'est justement pour
// ça que le sitemap compte : quand un site n'a pas de maillage interne
// pour se porter lui même, le sitemap est le seul endroit où il dit ce
// qu'il contient.
//
// LES CERTIFICATS (`/cert/<jeton>`) NE SONT PAS LISTÉS. Chacun porte le
// jeton d'une personne réelle, et une liste de jetons est une liste de
// clients. Ils restent indexables un par un, c'est leur page qui le
// décide, mais on ne publie pas l'annuaire.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { isPublicSalesHost, publicSalesCanonical, salesSlugForHost } from "@/lib/sales/salesHosts";

const REPLI = "https://atelierduquiz.fr";

/** Les pages publiques de ce domaine, hors page de vente. */
const CHEMINS: readonly { chemin: string; priorite: number }[] = [
  { chemin: "/legal", priorite: 0.3 },
  { chemin: "/terms", priorite: 0.3 },
  { chemin: "/terms-of-use", priorite: 0.3 },
  { chemin: "/privacy", priorite: 0.3 },
  { chemin: "/cookies", priorite: 0.3 },
];

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await origine();
  const maintenant = new Date();
  return [
    {
      url: `${base}/`,
      lastModified: maintenant,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...CHEMINS.map((p) => ({
      url: `${base}${p.chemin}`,
      lastModified: maintenant,
      changeFrequency: "yearly" as const,
      priority: p.priorite,
    })),
  ];
}
