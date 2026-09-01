// lib/sales/salesPageLinks.ts
//
// LES BOUTONS DE LA PAGE DE VENTE MÈNENT À NOTRE BON DE COMMANDE.
//
// Béné, 21 août, dix minutes après la mise en ligne du domaine : "par
// contre j'ai l'impression qu'il ne m'ouvre pas notre bon de commande
// mais celui de systeme io ? C'est possible ? Normal ?"
//
// Possible, oui. Normal, non. Et elle a vu juste.
//
// -- CE QUI SE PASSAIT -------------------------------------------------
//
// Ses boutons "Je rejoins l'Atelier" ne sont pas des liens : ce sont des
// boutons Systeme.io qui OUVRENT UNE POPUP. Cette popup contient le bon
// de commande de Systeme.io (nom d'entreprise, adresse, code postal,
// ville, pays, email, case CGV), et elle a été capturée avec le reste de
// la page.
//
// Sur `atelierduquiz.fr`, la page s'affichait donc parfaitement et TOUS
// les chemins menaient au formulaire Systeme.io. Le bon de commande
// qu'on venait de construire, avec Stripe et PayPal, n'était atteignable
// qu'en tapant son adresse à la main.
//
// -- LA LEÇON, ET ELLE EST DÉJÀ ÉCRITE DANS CE DÉPÔT -------------------
//
// L'en-tête de `servePage.ts` disait, depuis le premier jour : "Ce qu'on
// INJECTE doit passer par ici et nulle part ailleurs : le référencement,
// **le lien de commande**, le suivi affilié." Le référencement avait été
// fait, le lien de commande jamais.
//
// **Une intention écrite en commentaire n'est pas du code.** C'est mot
// pour mot le drame des images de réponse du 4 août : la règle "jamais
// de `object-cover`" vivait en tête de fichier et était contredite
// soixante lignes plus bas, à quatre endroits.
//
// -- COMMENT ON RECONNAÎT UN BOUTON DE COMMANDE ------------------------
//
// Pas au texte : elle en a huit formulations différentes ("Je rejoins
// l'Atelier", "Je veux les bonus", "J'applique la méthode CAPTO®",
// "J'ai toutes mes réponses", "Commande"...), et elle en réécrira
// d'autres sans nous prévenir.
//
// Pas non plus à `data-test-id="show-popup-button"` tout seul : SES
// popups à elle (le carrousel "Résumé en 5 points", le mini test) sont
// portées par des boutons du même type. Les rediriger volerait à ses
// visiteurs les trois blocs qu'elle a écrits à la main.
//
// La configuration de la page, elle, tranche sans ambiguïté. Chaque
// bouton y porte son action et sa cible :
//
//   "htmlAttrId":"button-cdbde5dc" ... "popup":"30b05710-..." ... "action":"showPopup"
//   "htmlAttrId":"button-20d28b57" ... "popup":""             ... "action":"showPopup"
//
// Le premier ouvre la popup de commande. Le second est à Béné : son
// script se branche dessus, Systeme.io ne lui a assigné aucune popup.
//
// **Règle : `action` vaut `showPopup` ET `popup` n'est pas vide -> c'est
// un bouton de commande.** Une popup vide, on n'y touche pas.
//
// -- ET LA POPUP DE COMMANDE NE S'OUVRE PLUS ---------------------------
//
// En transformant le `<button>` en `<a>`, on retire aussi son
// `data-test-id="show-popup-button"` : le script de Systeme.io ne le
// trouve plus, donc plus rien n'ouvre son formulaire. On ne supprime pas
// la popup du document (elle est cachée, et découper un sous-arbre à
// coups d'expressions régulières casse plus qu'il ne répare) : on lui
// retire simplement toutes ses portes.

// -- ET LE CARROUSEL DE BÉNÉ, QUI CLIQUE LE BOUTON À NOTRE PLACE -------
//
// Trouvé en vérifiant le résultat de la réécriture, pas en le
// supposant : ses deux blocs perso (le carrousel "Résumé en 5 points" et
// le mini test) se terminent par un appel à `goCheckout()`, et ce
// `goCheckout()` fait ceci :
//
//   function boutonCommande(){
//     if (BOUTON_COMMANDE){ ... }
//     var sauf = TRIGGER_IDS.map(id => ':not(#' + id + ')').join('');
//     return document.querySelector('[data-test-id="show-popup-button"]' + sauf);
//   }
//   function goCheckout(){
//     close();
//     var el = boutonCommande();
//     if (el){ setTimeout(() => el.click(), 60); return; }
//     if (CHECKOUT_URL){ window.location.href = CHECKOUT_URL; return; }
//   }
//
// Autrement dit : "trouve le bouton de commande de la page et clique le
// à ma place". En transformant ces boutons en liens, on lui retirait ce
// qu'elle cherche. Ses deux blocs seraient devenus des culs-de-sac : le
// visiteur arrive au bout du carrousel, clique, et rien ne se passe.
//
// **On aurait corrigé un bug en en créant un autre**, invisible depuis
// la page d'accueil, exactement comme le logo privé de vie propre le
// 3 août.
//
// La sortie n'est pas un bricolage : elle est écrite dans SON script,
// avec son commentaire à elle.
//
//   var CHECKOUT_URL = '';   /* si ta commande est une vraie page : son adresse */
//
// C'est précisément notre cas depuis aujourd'hui. On remplit le réglage
// qu'elle a prévu, et rien d'autre. On ne touche NI à sa liste de
// déclencheurs, NI à son sélecteur : une seule mécanique répond à la
// question "où est la commande", et c'est cette variable.

/**
 * Renseigne le `CHECKOUT_URL` des scripts de la page.
 *
 * Ne fait rien si la variable n'existe pas (une future capture pourrait
 * ne plus contenir ses blocs) : ce n'est pas une erreur, c'est une page
 * qui n'a rien à régler.
 */
export function setCheckoutFallback(html: string, href: string): { html: string; count: number } {
  let count = 0;
  const sortie = String(html ?? "").replace(
    /var\s+CHECKOUT_URL(\s*)=(\s*)''\s*;/g,
    (_m, a: string, b: string) => {
      count += 1;
      // On conserve l'espacement d'origine : son fichier est aligné en
      // colonnes, et elle le relit.
      return `var CHECKOUT_URL${a}=${b}'${href.replace(/'/g, "\\'")}';`;
    },
  );
  return { html: sortie, count };
}

/** Ce que la réécriture a fait, pour que l'appelant puisse le journaliser. */
export interface OrderButtonRewrite {
  html: string;
  /** Les identifiants réécrits, dans l'ordre d'apparition. */
  rewritten: string[];
  /**
   * Les boutons de commande repérés dans la configuration mais absents
   * du HTML rendu.
   *
   * Ce n'est pas décoratif : c'est exactement le symptôme du 19 août,
   * quand deux des quatre identifiants du `TRIGGER_IDS` de Béné ne
   * correspondaient plus à rien parce qu'elle avait recréé ses boutons
   * dans l'éditeur. Personne ne lisait la console, donc personne ne le
   * savait.
   */
  missing: string[];
  /**
   * Combien de scripts de Béné ont reçu l'adresse du bon de commande.
   *
   * Zéro n'est pas forcément une erreur (une capture sans ses blocs
   * perso), mais c'est une information : ses deux blocs se terminent par
   * un bouton, et ce bouton a besoin de cette adresse pour mener
   * quelque part.
   */
  fallbackSet: number;
}

/** Échappe ce qui part dans un attribut HTML. */
function attr(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Les identifiants des boutons qui ouvrent la popup de commande.
 *
 * On lit la configuration de la page, jamais le texte des boutons.
 * La fenêtre de lecture s'arrête au `htmlAttrId` suivant : sans cette
 * borne, l'action d'un élément pourrait être attribuée au précédent.
 */
export function findOrderButtonIds(html: string): string[] {
  const trouves: string[] = [];
  const vus = new Set<string>();
  const motif = /"htmlAttrId"\s*:\s*"(button-[A-Za-z0-9_-]+)"([\s\S]*?)(?="htmlAttrId"|$)/g;

  for (const m of String(html ?? "").matchAll(motif)) {
    const id = m[1];
    // On borne la fenêtre : la configuration d'un bouton tient en
    // quelques centaines de caractères, et le dernier élément de la page
    // n'a pas de `htmlAttrId` derrière lui pour l'arrêter.
    const fenetre = m[2].slice(0, 1500);
    if (!/"action"\s*:\s*"showPopup"/.test(fenetre)) continue;
    const popup = fenetre.match(/"popup"\s*:\s*"([^"]*)"/);
    // Popup absente ou vide : le bouton est à Béné, son script s'en
    // occupe. On passe.
    if (!popup || !popup[1].trim()) continue;
    if (vus.has(id)) continue;
    vus.add(id);
    trouves.push(id);
  }
  return trouves;
}

/**
 * Remplace un `<button id="...">…</button>` par un `<a href="…">…</a>`.
 *
 * On CONSERVE l'`id` et les classes : l'allure du bouton vient de
 * `.eNqPWT` et compagnie, des sélecteurs de CLASSE (styled-components),
 * jamais du nom de la balise. Vérifié dans le CSS de la page avant
 * d'écrire cette fonction, parce que si les règles avaient visé
 * `button.xxx`, tous ses boutons seraient devenus du texte nu.
 *
 * On RETIRE `data-test-id="show-popup-button"` : c'est ce qui débranche
 * la popup de Systeme.io.
 */
function remplaceUnBouton(html: string, id: string, href: string): string | null {
  const ouverture = new RegExp(`<button\\b([^>]*\\bid="${id}"[^>]*)>`, "i");
  const trouve = html.match(ouverture);
  if (!trouve || trouve.index === undefined) return null;

  const debut = trouve.index;
  // Un `<button>` ne peut pas en contenir un autre : la première
  // fermeture qui suit est forcément la sienne.
  const finContenu = html.indexOf("</button>", debut);
  if (finContenu < 0) return null;

  const attributs = trouve[1]
    .replace(/\sdata-test-id="show-popup-button"/gi, "")
    .replace(/\stype="[^"]*"/gi, "");
  const contenu = html.slice(debut + trouve[0].length, finContenu);

  const lien =
    `<a href="${attr(href)}" data-test-id="checkout-link"${attributs}>` + contenu + `</a>`;

  return html.slice(0, debut) + lien + html.slice(finContenu + "</button>".length);
}

/**
 * TOUS les boutons de commande de la page mènent à `href`.
 *
 * Fonction pure : elle prend du HTML et rend du HTML. C'est ce qui
 * permet de la tester sur la vraie page capturée, et c'est la règle du
 * 1er août (une logique enfermée dans une route n'est pas testable, donc
 * elle n'est pas testée, donc c'est là que les bugs s'installent).
 */
export function rewriteOrderButtons(html: string, href: string): OrderButtonRewrite {
  const ids = findOrderButtonIds(html);
  let sortie = String(html ?? "");
  const rewritten: string[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const suivant = remplaceUnBouton(sortie, id, href);
    if (suivant === null) {
      missing.push(id);
      continue;
    }
    sortie = suivant;
    rewritten.push(id);
  }

  // Ses blocs perso cliquent le bouton de commande à notre place : sans
  // cette adresse, ils ne mèneraient plus nulle part.
  const repli = setCheckoutFallback(sortie, href);

  return { html: repli.html, rewritten, missing, fallbackSet: repli.count };
}


/**
 * LES LIENS DE SITE QUI POINTAIENT ENCORE VERS L'ANCIEN DOMAINE.
 *
 * En relisant la capture le 1er septembre 2026, la liste complète des
 * liens sortants de la page tenait en une poignée d'adresses, et
 * QUATRE partaient chez `www.tipote.fr` : sa propre copie, les
 * mentions légales, la politique de confidentialité et les CGV.
 *
 * Le BOUTON D'ACHAT, lui, était déjà réglé (`rewriteOrderButtons`,
 * 21 août) : c'est la NAVIGATION que personne n'avait relue. Depuis la
 * page qui doit remplacer l'ancienne, un lien vers l'ancienne la
 * désigne comme celle qui fait autorité.
 *
 * LES DESTINATIONS SONT NOS VRAIES ROUTES, vérifiées dans `app/` : les
 * chemins de Systeme.io (`/mentions-legales`,
 * `/politique-de-confidentialite`, `/atelier-du-quiz-cgv`) n'existent
 * pas chez nous, et les recopier aurait posé des 404 dans le pied de
 * page de la page qui vend.
 */
export const SALES_SITE_LINKS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "atelier-du-quiz": {
    // SA PROPRE COPIE -> L'ACCUEIL DE CE DOMAINE.
    "https://www.tipote.fr/atelier-du-quiz": "/",
    "https://www.tipote.fr/mentions-legales": "/legal",
    "https://www.tipote.fr/politique-de-confidentialite": "/privacy",
    "https://www.tipote.fr/atelier-du-quiz-cgv": "/terms",
  },
};

/**
 * Deux adresses désignent-elles la même page ?
 *
 * On compare l'hôte et le chemin, sans le protocole, sans la barre
 * finale, sans ce qui suit le `?`. Jumelle de celle du dépôt Tiquiz.
 */
export function samePage(a: string, b: string): boolean {
  const cle = (u: string): string | null => {
    try {
      const url = new URL(String(u ?? "").trim());
      return `${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
    } catch {
      return null;
    }
  };
  const x = cle(a);
  const y = cle(b);
  return x !== null && x === y;
}

/** Ce que la réécriture des liens de site a fait. */
export interface SiteLinkRewrite {
  html: string;
  rewritten: { from: string; to: string; count: number }[];
}

/**
 * Ramène sur ce domaine les liens de site capturés avec la page.
 *
 * Séparé de la réécriture du bouton d'achat : celle là décide où va
 * l'ARGENT, celle ci où va la NAVIGATION, et elle ne s'applique que sur
 * le domaine public. Derrière la clé d'aperçu, la page n'est pas le
 * site.
 */
export function rewriteSiteLinks(
  html: string,
  cibles: Readonly<Record<string, string>>,
): SiteLinkRewrite {
  const entrees = Object.entries(cibles);
  const compte = new Map<string, { to: string; count: number }>();

  const remplace = (url: string): string | null => {
    const paire = entrees.find(([source]) => samePage(source, url));
    if (!paire) return null;
    const [source, destination] = paire;
    let query = "";
    try {
      query = new URL(url).search;
    } catch {
      query = "";
    }
    const vu = compte.get(source) ?? { to: destination, count: 0 };
    vu.count += 1;
    compte.set(source, vu);
    return `${destination}${query}`;
  };

  let sortie = String(html ?? "").replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (entier, url: string) => {
      const cible = remplace(url);
      return cible ? `href="${attr(cible)}"` : entier;
    },
  );

  // LES LIENS ÉCRITS DANS UN BLOC DE TEXTE, DONC ÉCHAPPÉS. Ne traiter
  // que les `href="..."` nus en laisse derrière ceux que l'éditeur
  // Systeme.io relit pour reconstruire le bloc.
  sortie = sortie.replace(
    /href=(\\+)"(https?:\/\/[^"\\]+)\1"/gi,
    (entier, echappement: string, url: string) => {
      const cible = remplace(url);
      return cible ? `href=${echappement}"${cible}${echappement}"` : entier;
    },
  );

  // Les deux noms de la même clé chez Systeme.io : la page de l'Atelier
  // écrit `"link"`, celle de Tiquiz `"linkUrl"`. On traite les deux,
  // sinon la configuration que l'éditeur relit contredit le HTML.
  sortie = sortie.replace(
    /"(link|linkUrl)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/gi,
    (entier, cle: string, brut: string) => {
      const cible = remplace(brut.replace(/\\\//g, "/"));
      return cible ? `"${cle}":"${cible}"` : entier;
    },
  );

  return {
    html: sortie,
    rewritten: [...compte.entries()].map(([from, v]) => ({ from, to: v.to, count: v.count })),
  };
}
