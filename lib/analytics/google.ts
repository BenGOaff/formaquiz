// lib/analytics/google.ts (Atelier du Quiz)
//
// LE JETON DE PROPRIÉTÉ GOOGLE, ÉCRIT UNE SEULE FOIS.
//
// Béné, 26 août 2026 : "tu peux ajouter ça pour que je puisse suivre les
// performances sur les outils Google ?"
//
// -- SUR LA PAGE DE VENTE, ET NULLE PART AILLEURS ----------------------
//
// Béné, 26 août 2026 : "juste tiquiz.fr et atelierduquiz.fr : je m'en
// fous de faire ranker les app, je veux faire ranker les pages de
// vente."
//
// Et c'est justement le piège, parce que cette app sert son HTML par
// DEUX chemins qui n'ont rien en commun :
//
//   1. les écrans de l'espace membre, rendus par React, dont le `<head>`
//      vient de `app/layout.tsx` ;
//   2. **la page de vente `atelierduquiz.fr`, servie par un route
//      handler** qui renvoie le HTML capturé, sans jamais passer par ce
//      layout (`app/apercu/vente/[slug]/route.ts`).
//
// Poser la balise dans le layout, le réflexe évident, l'aurait mise sur
// le SEUL des deux qui ne sert à rien ici, et jamais sur le domaine
// qu'on cherche à vérifier. Le symptôme aurait été le pire qui soit :
// Search Console qui répond "balise introuvable" sur une page où l'on
// croit l'avoir mise.
//
// -- LE JETON N'EST PAS UN SECRET --------------------------------------
//
// Il part dans le HTML de chaque page : c'est même sa raison d'être,
// Google vient l'y lire. Pas d'`env` donc : une variable absente en
// production ferait échouer la vérification en silence.

/**
 * L'identifiant de mesure GA4 de l'Atelier du Quiz.
 *
 * **Ce n'est PAS celui de Tiquiz** (`G-N6LQDRDMDB`). Les deux produits
 * ont leur propre propriété : se tromper enverrait les visites de l'un
 * dans les chiffres de l'autre, et rien ne le signalerait avant qu'un
 * rapport devienne absurde.
 */
export const GA_MEASUREMENT_ID = "G-6EN74PGTTH";

/** Le jeton de propriété Search Console de l'Atelier du Quiz. */
export const GOOGLE_SITE_VERIFICATION = "ZvTfcZTlRC8gpTVwhKC9vj--XOBG0YbtThBPNMia_7o";

/**
 * La balise, prête à insérer dans un `<head>` écrit à la main.
 *
 * Rendue par une fonction et pas recopiée : la page de vente et le
 * layout doivent poser EXACTEMENT la même chose, et deux écritures de la
 * même balise finissent toujours par diverger.
 */
export function baliseVerificationGoogle(): string {
  return `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">`;
}

/**
 * LA BALISE GOOGLE, EXACTEMENT CELLE QUE GOOGLE DONNE.
 *
 * Béné, 26 août 2026 : "tu vois bien que ce qui est demandé n'est pas ce
 * que tu as mis ???"
 *
 * Elle a raison. La version précédente réécrivait l'identifiant DANS le
 * bandeau cookies de la page au lieu de poser la balise, parce que le
 * bandeau charge déjà GA4 après consentement et que Google demande une
 * seule balise par page. C'était défendable, et ce n'était pas ce qui
 * était demandé.
 *
 * **Le bloc ci-dessous est celui de Google, au caractère près**, y
 * compris son commentaire d'ouverture et sa ligne vide : c'est ce qui
 * permet de comparer d'un coup d'oeil ce que Google affiche et ce que la
 * page sert.
 *
 * Le bandeau cookies de la page n'est PAS touché : c'est sa page, et on
 * n'y modifie pas ce qu'elle a écrit sans qu'elle le demande.
 */
export function scriptAnalyticsGoogle(): string {
  return [
    `<!-- Google tag (gtag.js) -->`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    ``,
    `  gtag('config', '${GA_MEASUREMENT_ID}');`,
    `</script>`,
  ].join("\n");
}
