// lib/affiliate/refLien.ts (Atelier du Quiz)
//
// LE CODE PUBLIC D'UN AFFILIÉ, DEPUIS SON LIEN JUSQU'À SA COMMISSION.
//
// -- POURQUOI CE FICHIER ARRIVE ICI LE 26 AOÛT 2026 --------------------
//
// Béné : "je veux notre propre système d'affiliation pour l'atelier
// comme pour tiquiz, je pensais que tu avais déjà bossé dessus."
//
// C'était fait à moitié. L'Atelier avait son bon de commande et il
// commissionnait, mais contre SON PROPRE registre
// (`profiles.sio_affiliate_id`, dans sa base), et il ne lisait que
// `?sa=`. Deux conséquences, et les deux étaient silencieuses :
//
//   1. depuis que nos liens portent `?ref=` (24 août), le lien Atelier
//      affiché dans l'espace affilié ne payait PLUS PERSONNE. Ni
//      Systeme.io (qui attend `?sa=`), ni nous (qui ne lisions pas
//      `?ref=`). L'affilié partageait, la vente rentrait, et il ne se
//      passait rien chez lui ;
//   2. un affilié inscrit chez nous sans compte Systeme.io ne pouvait
//      pas être payé sur l'Atelier, parce qu'il n'existait pas dans le
//      registre de l'Atelier.
//
// Ce module est le JUMEAU EXACT de `lib/affiliate/refLien.ts` côté
// Tiquiz, et de `lib/affiliate/ref.ts` côté Tipote qui FABRIQUE les
// codes. Les trois doivent accepter le même jeu de caractères : un code
// accepté là-bas et refusé ici serait un affilié jamais payé, sans le
// moindre symptôme.
//
// -- ON NE FAIT JAMAIS CONFIANCE À L'URL -------------------------------
//
// Ce code finit dans une requête vers Tipote, puis dans une ligne de
// commission, puis dans un virement. On ne garde donc que ce qui a
// EXACTEMENT la forme d'un code. La VÉRIFICATION qu'il désigne
// quelqu'un se fait chez Tipote, contre la table `affiliates` : ici on
// ne fait que la forme.

/** Le format d'un code public. Jumeau de `sanitizeRef` côté Tipote. */
export const REF_RE = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])?$/;

/** Longueurs, identiques à celles de Tipote. */
export const REF_MIN_LENGTH = 3;
export const REF_MAX_LENGTH = 20;

/** Le nom du paramètre dans nos liens. */
export const REF_PARAM = "ref";

/**
 * Le cookie de première partie qui porte le code entre la page de vente
 * et le paiement. Préfixe `aq_`, comme le reste de l'Atelier.
 */
export const REF_COOKIE = "aq_ref";

/**
 * UN AN, comme le `?sa=` juste à côté (`sa.ts`) et comme Tiquiz.
 * Deux durées différentes donneraient deux réponses pour la même
 * promesse selon le lien emprunté.
 */
export const REF_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Le code s'il est valide, `null` sinon.
 *
 * Ne jette jamais : appelée sur des valeurs qui viennent d'une URL
 * publique et d'un cookie, donc de n'importe où.
 */
export function readRef(value: unknown): string | null {
  const propre = String(value ?? "").trim().toLowerCase();
  if (propre.length < REF_MIN_LENGTH || propre.length > REF_MAX_LENGTH) return null;
  return REF_RE.test(propre) ? propre : null;
}

/**
 * Qui gagne entre l'URL et le cookie : **l'URL, toujours.**
 *
 * Quelqu'un arrive par le lien de Martine, ne paie pas, revient trois
 * jours plus tard par le lien de Christian et achète : c'est Christian
 * qui a fermé la vente. Même règle que le `sa`, et deux règles opposées
 * selon le chemin donneraient deux réponses pour la même vente.
 */
export function pickRef(depuisUrl: unknown, depuisCookie: unknown): string | null {
  return readRef(depuisUrl) ?? readRef(depuisCookie);
}

/**
 * Le code tel que le bon de commande le voit depuis le navigateur.
 *
 * Vit ici et pas dans le composant pour la raison habituelle : une
 * logique enfermée dans un composant React n'est pas testable, donc
 * elle n'est pas testée, et celle là ne se verrait pas à l'écran.
 */
export function readRefFromBrowser(recherche: string, cookies: string): string | null {
  let depuisUrl: string | null = null;
  try {
    depuisUrl = new URLSearchParams(recherche || "").get(REF_PARAM);
  } catch {
    depuisUrl = null;
  }

  let depuisCookie: string | null = null;
  for (const morceau of String(cookies ?? "").split(";")) {
    const i = morceau.indexOf("=");
    if (i < 0) continue;
    if (morceau.slice(0, i).trim() !== REF_COOKIE) continue;
    try {
      depuisCookie = decodeURIComponent(morceau.slice(i + 1).trim());
    } catch {
      depuisCookie = morceau.slice(i + 1).trim();
    }
    break;
  }

  return pickRef(depuisUrl, depuisCookie);
}
