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
 * LA MESURE SUR LA PAGE DE VENTE : ON RÉÉCRIT, ON N'AJOUTE PAS.
 *
 * -- CE QU'ON A TROUVÉ EN ALLANT LIRE LA PAGE EN PROD (26 août 2026) --
 *
 * `atelierduquiz.fr` porte **déjà le bandeau cookies de Béné**
 * (`__AQ_COOKIES__` / `aqc-banniere`), qui ne charge GA4 qu'APRÈS
 * consentement, avec `anonymize_ip` et une durée de cookie bornée.
 *
 * Ajouter notre balise par dessus, ce que faisait la première version,
 * avait deux conséquences que personne n'aurait vues : elle
 * **contournait son propre bandeau** (la mesure partait avant tout
 * consentement, sur la page même où elle en demande un), et elle mettait
 * **deux balises Google sur une page**, ce que Google interdit
 * explicitement dans ses propres instructions.
 *
 * **Règle : on remplace l'identifiant DANS son bandeau.** Une seule
 * balise, la sienne, sous son consentement, avec le nouvel identifiant.
 */
export const ID_MESURE_HISTORIQUE = "G-HRCMDXGTQD";

/**
 * Remplace l'identifiant GA4 du bandeau cookies de la page.
 *
 * Rend `remplace: false` quand la page ne porte PAS de bandeau :
 * l'appelant sait alors qu'il n'y a rien à réécrire, et il ne doit
 * surtout pas le déduire d'une chaîne inchangée (une page dont
 * l'identifiant est déjà le bon rendrait exactement le même HTML).
 */
export function remplacerIdMesure(
  html: string,
  id: string,
): { html: string; remplace: boolean } {
  const source = String(html ?? "");
  const motif = /(\bga\s*:\s*)'(G-[A-Z0-9]+)'/;
  if (!motif.test(source)) return { html: source, remplace: false };
  return { html: source.replace(motif, `$1'${id}'`), remplace: true };
}

/**
 * La balise brute, pour une page SANS bandeau cookies.
 *
 * Son usage est journalisé fort : poser une mesure sans consentement sur
 * une page publique est une décision, pas un défaut de configuration.
 */
export function scriptAnalyticsGoogle(): string {
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
    `<script>`,
    `window.dataLayer = window.dataLayer || [];`,
    `function gtag(){dataLayer.push(arguments);}`,
    `gtag('js', new Date());`,
    `gtag('config', '${GA_MEASUREMENT_ID}');`,
    `</script>`,
  ].join("\n");
}
