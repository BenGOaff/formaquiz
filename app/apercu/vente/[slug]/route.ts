// app/apercu/vente/[slug]/route.ts
//
// L'APERÇU DE LA PAGE DE VENTE DE L'ATELIER, FERMÉ PAR DÉFAUT.
//
// Elle vit ICI et pas dans Tipote : c'est l'app qui OUVRE L'ACCÈS après
// paiement. Le pire incident possible sur une vente, c'est "le client a
// payé et n'a rien reçu" (drame Ivan, 7 août). On garde donc l'argent et
// l'accès dans la même app, sans saut entre deux serveurs.
//
// Béné, 19 août : "je te propose de me designer les pages de ventes et
// de m'envoyer un lien ici pour que je valide le pixel perfect avant
// d'envoyer quoi que ce soit en ligne."
//
// Une page de vente n'a pas de session : le visiteur est anonyme. La
// porte ne peut donc pas être la liste d'emails du reste du chantier,
// c'est une CLÉ dans l'URL (`?k=...`), comparée à `SALES_PREVIEW_TOKEN`.
//
// Même règle que partout ailleurs : **l'absence de configuration FERME.**
// Pas de variable, variable vide, clé absente ou fausse -> 404. Un `.env`
// oublié ne peut pas publier une page en chantier.
//
// Et 404, jamais 403 : un refus explicite annoncerait qu'il y a quelque
// chose derrière.

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { renderSalesPage, type SalesPageMeta } from "@/lib/sales/servePage";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { isPublicSalesHost, publicSalesCanonical } from "@/lib/sales/salesHosts";
import { OWNER_CATALOG, type OwnerProductId } from "@/lib/checkout/catalog";
import { SALES_SITE_LINKS } from "@/lib/sales/salesPageLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le référencement de chaque page, écrit par nous.
 *
 * Il vit ICI et pas dans le HTML capturé : le HTML sera remplacé à
 * chaque nouvelle capture, alors que ces textes sont des décisions.
 */
const PAGES: Record<string, Omit<SalesPageMeta, "slug"> & { produit: OwnerProductId }> = {
  "atelier-du-quiz": {
    // La canonique d'APERÇU. Sur le domaine public, elle est remplacée
    // par `publicSalesCanonical()` : voir plus bas.
    //
    // Elle désignait `www.tipote.fr/atelier-du-quiz`, c'est à dire
    // l'ancien tunnel Systeme.io, comme l'original. L'aperçu est en
    // `noindex`, donc ça ne coûtait rien à Google, mais plus rien ne
    // doit nommer l'ancienne page comme la vraie (Béné, 31 août).
    canonical: "https://atelierduquiz.fr/",
    title: "L'Atelier du Quiz : lance ton quiz marketing en 7 jours",
    description:
      "La méthode complète pour créer un quiz qui capture des leads qualifiés et les transforme en clients, en 7 jours, sans compétence technique.",
    locale: "fr_FR",
    // L'icône de l'Atelier, la nôtre. Sans elle, la page garde celle de
    // la capture, c'est à dire le "t" de Tipote (retour Béné, 30 août).
    favicon: "/favicon.ico",
    /** Ce que cette page vend, donc où mènent ses boutons. */
    produit: "atelier",
  },
};

/**
 * La porte vit dans `lib/sales/previewGate.ts` et pas ici : le bon de
 * commande en a besoin aussi, et deux copies d'une décision divergent.
 */
/**
 * QUI EST DERRIÈRE CETTE PAGE, pour les moteurs et pour les modèles.
 *
 * 1er septembre 2026 : `atelierduquiz.fr` ne portait qu'un bloc
 * `FAQPage`. Aucun `Organization`, aucun `WebSite`, rien qui dise à un
 * moteur que ce domaine EST le site de « l'Atelier du Quiz ». Sur une
 * requête de marque, la page n'était donc qu'un document parmi d'autres
 * qui contient ces mots. Le jumeau Tiquiz porte ce bloc depuis le
 * 29 août ; celui ci ne l'a jamais eu.
 *
 * LE PRIX VIENT DU CATALOGUE, jamais recopié : un tarif écrit ici et un
 * tarif au bon de commande finiraient par diverger, et c'est Google qui
 * afficherait l'ancien, longtemps après la correction.
 */
const MARQUES: Record<string, SalesPageMeta["marque"]> = {
  "atelier-du-quiz": {
    nom: "L'Atelier du Quiz",
    logo: "https://atelierduquiz.fr/quizing.png",
    // Le logiciel que l'Atelier apprend à utiliser, et le site de sa
    // fondatrice : c'est ce qui permet à un moteur de recouper les
    // trois et de comprendre qu'il s'agit d'une seule maison.
    sameAs: ["https://tiquiz.fr/", "https://www.blagardette.com/"],
    formation: {
      nom: OWNER_CATALOG.atelier.label,
      prix: (OWNER_CATALOG.atelier.amountCents / 100).toFixed(2),
      url: "https://atelierduquiz.fr/commande/atelier",
      description:
        "Sept jours, une action par jour, pour lancer un quiz qui capture des leads qualifiés et les trie par profil.",
    },
  },
};

function porteOuverte(req: NextRequest): boolean {
  // La cle OU le domaine public : sur atelierduquiz.fr la page de vente
  // est ouverte, c'est tout l'interet d'avoir un domaine.
  return isSalesOpen(req.nextUrl.searchParams.get("k"), req.headers.get("host"), process.env);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;

  // Sans la bonne cle, on ne dit RIEN : ni que la page existe, ni
  // pourquoi elle est refusee.
  if (!porteOuverte(req)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // À PARTIR D'ICI, LA CLÉ EST BONNE : on peut donc dire ce qui cloche,
  // et on le DOIT.
  //
  // Les trois causes de 404 renvoyaient le même "Not found" : impossible
  // de savoir si c'était la variable d'environnement, un slug inconnu ou
  // un fichier non déployé. Un cul-de-sac de diagnostic, alors que la
  // règle de ce dépôt est que le serveur DIT ce qui s'est passé (drame
  // de la suppression d'un quiz, 3 août ; import PDF, 7 août).
  //
  // Ce n'est pas une fuite : seul quelqu'un qui détient déjà la clé lit
  // ces messages.
  const meta = PAGES[slug];
  if (!meta || !/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse(
      `Page inconnue : "${slug}".\nPages servies par cette app : ${Object.keys(PAGES).join(", ")}`,
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const fichier = path.join(process.cwd(), "content", "sales", `${slug}.html`);
  if (!fs.existsSync(fichier)) {
    // Le dossier de travail est la donnée qui manque toujours quand on
    // cherche un fichier "pourtant deploye".
    console.error(`[apercu/vente] fichier absent : ${fichier}`);
    return new NextResponse(
      `Fichier absent : content/sales/${slug}.html\n` +
        `Cherché depuis : ${process.cwd()}\n` +
        `Le dossier content/sales/ n'est probablement pas arrivé sur le serveur.`,
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // LE DOMAINE PUBLIC N'EST PAS UN APERÇU.
  //
  // Sur `atelierduquiz.fr`, la page est la vraie page : elle doit être
  // indexable, et sa canonique doit désigner ce domaine. Derrière la
  // clé, elle reste un chantier : `noindex`, canonique vers l'originale.
  //
  // L'hôte est un PARAMÈTRE de la décision, jamais deviné ailleurs.
  const publique = isPublicSalesHost(req.headers.get("host"));
  const canonique = (publique && publicSalesCanonical(slug)) || meta.canonical;

  // LA MARQUE NE SE DÉCLARE QUE SUR SA PAGE OFFICIELLE.
  //
  // Sur un aperçu derrière clé, annoncer « ce site est LE site de
  // l'Atelier » ferait concurrence à la vraie page sur exactement la
  // même requête.
  const marque = publique ? MARQUES[slug] : undefined;

  const html = renderSalesPage(
    fs.readFileSync(fichier, "utf8"),
    { slug, ...meta, canonical: canonique, marque },
    {
      indexable: publique,
      // La mesure d'audience ne tourne que sur le domaine PUBLIC :
      // derrière la clé d'aperçu, la page est un chantier qu'on relit
      // nous-mêmes, et compter ces visites fausserait ses chiffres.
      analytics: publique,
      // TOUS les boutons de commande mènent chez nous. Sans ça, ils
      // ouvrent la popup Systeme.io capturée avec la page, et notre
      // paiement n'est jamais atteint (trouvé le 21 août, dix minutes
      // après la mise en ligne du domaine).
      checkoutHref: `/commande/${meta.produit}`,
      // LES LIENS DE SITE, SUR LE DOMAINE PUBLIC SEULEMENT.
      //
      // Derrière la clé d'aperçu, la page est un chantier : son pied de
      // page doit continuer de désigner le site en ligne.
      siteLinks: publique ? (SALES_SITE_LINKS[slug] ?? null) : null,
      onRewrite: (info) => {
        if (info.rewritten.length === 0) {
          console.error(
            `[apercu/vente] ${slug} : AUCUN bouton de commande reecrit. ` +
              `Les visiteurs tombent sur le bon de commande Systeme.io.`,
          );
        }
        if (info.missing.length > 0) {
          // Le symptôme du 19 août : des identifiants qui ne
          // correspondent plus à rien parce que les boutons ont été
          // recréés dans l'éditeur. Ça se dit, ça ne s'avale pas.
          console.warn(
            `[apercu/vente] ${slug} : ${info.missing.length} bouton(s) de commande ` +
              `declares dans la configuration mais absents du HTML : ${info.missing.join(", ")}`,
          );
        }
      },
    },
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      // L'en-tête suit la même décision que la balise. Les deux se
      // contredisant, c'est l'en-tête qui gagne : le laisser en dur
      // aurait rendu `indexable` décoratif.
      ...(publique ? {} : { "X-Robots-Tag": "noindex, nofollow" }),
    },
  });
}
