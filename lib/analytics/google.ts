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
/** Là où le bandeau cookies range le choix de la personne. */
export const CLE_CONSENTEMENT = "aq_consent_v1";

/** Combien de jours le bandeau mémorise ce choix (`CFG.memoire`). */
export const MEMOIRE_CONSENTEMENT_JOURS = 182;

/**
 * LE MODE CONSENTEMENT DE GOOGLE, POSÉ AVANT LA BALISE.
 *
 * Béné, 26 août 2026 : "faut mettre ce qu'il faut là où il faut
 * qu'est-ce que j'en sais moi ?"
 *
 * -- LE VRAI DÉFAUT N'ÉTAIT PAS CELUI QU'ON CROYAIT ------------------
 *
 * La page de vente portait DEUX propriétés GA4 : la nôtre, chargée
 * toujours, et celle du bandeau cookies, chargée après accord. Deux
 * chiffres pour la même page, donc aucun des deux n'est croyable.
 *
 * Mais le plus grave était l'autre moitié : **un bandeau qui demande la
 * permission et une balise qui ne l'attend pas**. La personne clique
 * "refuser" et on la mesure quand même. Ce n'est pas un détail
 * juridique, c'est un bandeau qui ment à qui vient de cliquer.
 *
 * -- POURQUOI LE MODE CONSENTEMENT, ET PAS UN GATE MAISON ------------
 *
 * C'est exactement ce que l'écran de Google indique ("si vous avez des
 * utilisateurs finaux dans l'EEE, configurez le mode Consentement"), et
 * c'est la seule solution qui **laisse la balise INTACTE**. Elle reste
 * au caractère près celle que Google donne ; ce qui change, c'est
 * qu'elle ne dépose rien tant que l'accord n'est pas là.
 *
 * Le bandeau de Béné écrit `{mesure, pub, video, t}` dans
 * `aq_consent_v1` et oublie le choix au bout de `CFG.memoire` jours. On
 * relit SA règle, sinon on mesurerait encore quelqu'un dont l'accord a
 * expiré de son côté.
 *
 * Il n'émet aucun événement, et `storage` ne se déclenche pas dans
 * l'onglet qui écrit : on se raccroche au clic, puisqu'un consentement
 * est toujours donné par un clic. L'écouteur se retire dès qu'il a sa
 * réponse.
 */
export function scriptConsentementGoogle(): string {
  return [
    "<script>",
    "  window.dataLayer = window.dataLayer || [];",
    "  function gtag(){dataLayer.push(arguments);}",
    "  gtag('consent', 'default', {",
    "    ad_storage: 'denied',",
    "    ad_user_data: 'denied',",
    "    ad_personalization: 'denied',",
    "    analytics_storage: 'denied',",
    "    wait_for_update: 500",
    "  });",
    "  (function(){",
    `    var CLE = '${CLE_CONSENTEMENT}';`,
    `    var MEMOIRE = ${MEMOIRE_CONSENTEMENT_JOURS};`,
    "    function accepte(){",
    "      try {",
    "        var o = JSON.parse(localStorage.getItem(CLE));",
    "        if (!o || typeof o.t !== 'number') return false;",
    "        if (Date.now() - o.t > MEMOIRE * 864e5) return false;",
    "        return o.mesure === true;",
    "      } catch (e) { return false; }",
    "    }",
    "    function accorder(){",
    "      gtag('consent', 'update', { analytics_storage: 'granted' });",
    "    }",
    "    if (accepte()) { accorder(); return; }",
    "    function surClic(){",
    "      setTimeout(function(){",
    "        if (accepte()) {",
    "          accorder();",
    "          document.removeEventListener('click', surClic, true);",
    "        }",
    "      }, 0);",
    "    }",
    "    document.addEventListener('click', surClic, true);",
    "  })();",
    "</script>",
  ].join("\n");
}

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
