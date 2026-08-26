// lib/analytics/google.ts (Atelier du Quiz)
//
// LE JETON DE PROPRIÉTÉ GOOGLE, ÉCRIT UNE SEULE FOIS.
//
// Béné, 26 août 2026 : "tu peux ajouter ça pour que je puisse suivre les
// performances sur les outils Google ?"
//
// -- POURQUOI IL FAUT LE POSER À DEUX ENDROITS -------------------------
//
// Cette app sert son HTML par DEUX chemins qui n'ont rien en commun :
//
//   1. les écrans de l'espace membre, rendus par React, dont le `<head>`
//      vient de `app/layout.tsx` ;
//   2. **la page de vente `atelierduquiz.fr`, servie par un route
//      handler** qui renvoie le HTML capturé, sans jamais passer par ce
//      layout (`app/apercu/vente/[slug]/route.ts`).
//
// Poser la balise dans le seul layout, le réflexe évident, ne l'aurait
// donc JAMAIS mise sur le domaine qu'on cherche à vérifier. Et le
// symptôme aurait été le pire qui soit : Search Console qui répond
// "balise introuvable" sur une page où l'on croit l'avoir mise.
//
// -- LE JETON N'EST PAS UN SECRET --------------------------------------
//
// Il part dans le HTML de chaque page : c'est même sa raison d'être,
// Google vient l'y lire. Pas d'`env` donc : une variable absente en
// production ferait échouer la vérification en silence.

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
