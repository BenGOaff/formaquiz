// tests/logic/sales-checkout-link.test.mts
//
// "IL NE M'OUVRE PAS NOTRE BON DE COMMANDE MAIS CELUI DE SYSTEME IO ?"
// (Béné, 21 août 2026, dix minutes après la mise en ligne du domaine.)
//
// Elle avait raison. Ses boutons "Je rejoins l'Atelier" ouvrent une
// popup Systeme.io qui contient le bon de commande de Systeme.io, capturé
// avec le reste de la page. Sur `atelierduquiz.fr`, la page s'affichait
// donc parfaitement et ne vendait rien de chez nous.
//
// Ces tests tournent sur la VRAIE page capturée (`content/sales/`), pas
// sur un extrait fabriqué : c'est le seul moyen de savoir que la règle
// tient sur ses 11 boutons, et qu'elle épargne bien celui qui est à elle.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  findOrderButtonIds,
  rewriteOrderButtons,
} from "../../lib/sales/salesPageLinks.ts";
import { renderSalesPage, stripHeadTags } from "../../lib/sales/servePage.ts";
import { publicSalesCanonical } from "../../lib/sales/salesHosts.ts";

const PAGE = path.join(process.cwd(), "content", "sales", "atelier-du-quiz.html");
const capturee = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, "utf8") : null;

/** Le gabarit d'un bouton Systeme.io, tel qu'il sort de la capture. */
function bouton(id: string, texte: string): string {
  return (
    `<button data-test-id="show-popup-button" id="${id}" color="rgba(255, 255, 255, 1)" ` +
    `font-weight="700" class="sc-jnOGJJ eNqPWT">` +
    `<div class="sc-iHbSHG hRYmm">${texte}<i class="far fa-arrow-right"></i></div>` +
    `</button>`
  );
}

/** La configuration d'un bouton, telle qu'elle vit dans le JSON de la page. */
function config(id: string, texte: string, popup: string): string {
  return (
    `"type":"Button","htmlAttrId":"${id}","parentId":"2ed8804e","text":"${texte}",` +
    `"hover":{"offset":1},"popup":"${popup}","width":"auto","action":"showPopup",` +
    `"border":{"type":"bottomOnly"}`
  );
}

const POPUP_COMMANDE = "30b05710-05e2-4dae-93ff-d4a8379d83f7";

test("LE BUG : un bouton de commande devient un lien vers NOTRE bon de commande", () => {
  const html = config("button-cdbde5dc", "Je rejoins l'Atelier", POPUP_COMMANDE) +
    bouton("button-cdbde5dc", "Je rejoins l'Atelier");

  const out = rewriteOrderButtons(html, "/commande/atelier");

  assert.deepEqual(out.rewritten, ["button-cdbde5dc"]);
  assert.ok(
    out.html.includes('<a href="/commande/atelier"'),
    "le bouton ne mene pas a notre bon de commande",
  );
  // On vise la BALISE, pas l'identifiant : l'identifiant survit
  // volontairement sur le `<a>` (c'est lui qui porte le style). Un
  // test qui echoue pour la mauvaise raison ne protege rien.
  assert.ok(
    !/<button[^>]*id="button-cdbde5dc"/.test(out.html),
    "il reste un <button> non reecrit",
  );
});

test("et la popup de Systeme.io n'a plus aucune porte", () => {
  // C'est ce qui la debranche : son script cherche
  // `data-test-id="show-popup-button"`, il ne le trouve plus.
  const html = config("button-cdbde5dc", "Commande", POPUP_COMMANDE) +
    bouton("button-cdbde5dc", "Commande");
  const out = rewriteOrderButtons(html, "/commande/atelier");
  const rendu = out.html.slice(out.html.indexOf("<a "));
  assert.ok(
    !rendu.includes("show-popup-button"),
    "le lien porte encore le declencheur de la popup Systeme.io",
  );
});

test("ON NE TOUCHE PAS aux popups de Bene", () => {
  // "Résumé en 5 points" est a elle : Systeme.io ne lui a assigne aucune
  // popup, c'est son propre script qui se branche dessus. Le rediriger
  // volerait a ses visiteurs un des trois blocs qu'elle a ecrits.
  const html =
    config("button-20d28b57", "Résumé en 5 points", "") +
    bouton("button-20d28b57", "Résumé en 5 points");

  assert.deepEqual(findOrderButtonIds(html), []);
  const out = rewriteOrderButtons(html, "/commande/atelier");
  assert.deepEqual(out.rewritten, []);
  assert.ok(
    out.html.includes('data-test-id="show-popup-button" id="button-20d28b57"'),
    "un bouton de Bene a ete reecrit",
  );
});

test("l'allure du bouton est preservee : id et classes intacts", () => {
  // Les regles de style visent `.eNqPWT`, un selecteur de CLASSE. Si on
  // perdait la classe ou l'id, ses boutons deviendraient du texte nu.
  const html = config("button-9f6e997f", "Je veux les bonus", POPUP_COMMANDE) +
    bouton("button-9f6e997f", "Je veux les bonus");
  const out = rewriteOrderButtons(html, "/commande/atelier");
  assert.ok(out.html.includes('id="button-9f6e997f"'), "l'id a disparu");
  assert.ok(out.html.includes('class="sc-jnOGJJ eNqPWT"'), "les classes ont disparu");
  assert.ok(out.html.includes("Je veux les bonus"), "le libelle a disparu");
});

test("la configuration d'un bouton ne deborde pas sur le suivant", () => {
  // Sans borne, l'action du bouton A pourrait etre attribuee au bouton B
  // et rediriger une popup qui n'est pas la notre.
  const html =
    config("button-aaaa1111", "Résumé en 5 points", "") +
    config("button-bbbb2222", "Je rejoins l'Atelier", POPUP_COMMANDE);
  assert.deepEqual(findOrderButtonIds(html), ["button-bbbb2222"]);
});

test("un bouton declare mais absent du HTML est SIGNALE, pas avale", () => {
  // Le symptome du 19 aout : des identifiants perimes parce que les
  // boutons ont ete recrees dans l'editeur, et personne ne lisait la
  // console.
  const html = config("button-fantome", "Je rejoins l'Atelier", POPUP_COMMANDE);
  const out = rewriteOrderButtons(html, "/commande/atelier");
  assert.deepEqual(out.rewritten, []);
  assert.deepEqual(out.missing, ["button-fantome"]);
});

test("le lien de commande est un parametre OBLIGATOIRE de renderSalesPage", () => {
  // Le coeur de la regression : on ne peut plus servir une page de vente
  // sans avoir dit ou elle vend. `null` reste possible, mais c'est un
  // choix ecrit, pas un oubli.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/sales/servePage.ts"),
    "utf8",
  );
  assert.ok(
    /checkoutHref:\s*string\s*\|\s*null/.test(src),
    "checkoutHref n'est plus obligatoire",
  );
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"),
    "utf8",
  );
  assert.ok(route.includes("checkoutHref:"), "la route ne branche plus le bon de commande");
});

test("le noindex de Systeme.io est retire de la capture", () => {
  // Sans ca, decider `indexable: true` de notre cote ne servait a rien :
  // la balise de la capture restait dans le document.
  const html = '<meta charset="utf-8"><meta data-react-helmet="true" name="robots" content="noindex"/>';
  assert.ok(!stripHeadTags(html).includes("noindex"), "le noindex de la capture survit");
});

test("en apercu on ferme, sur le domaine public on ouvre", () => {
  const html = '<meta charset="utf-8"><body>ok</body>';
  const meta = {
    slug: "atelier-du-quiz",
    canonical: "https://www.tipote.fr/atelier-du-quiz",
    title: "T",
    description: "D",
    locale: "fr_FR",
  };
  const apercu = renderSalesPage(html, meta, { indexable: false, analytics: false, checkoutHref: null });
  assert.ok(apercu.includes('name="robots" content="noindex, nofollow"'));

  const enLigne = renderSalesPage(html, meta, { indexable: true, analytics: false, checkoutHref: null });
  assert.ok(!enLigne.includes("noindex"), "la page publique reste bloquee au referencement");
});

test("la canonique publique designe le domaine, pas Systeme.io", () => {
  const c = publicSalesCanonical("atelier-du-quiz");
  assert.equal(c, "https://atelierduquiz.fr/");
  assert.ok(!String(c).includes("tipote.fr"), "la canonique renvoie encore vers l'originale");
  assert.equal(publicSalesCanonical("page-inconnue"), null);
});

// ── Sur la VRAIE page, celle que les visiteurs voient ──

test("la page capturee : tous ses boutons de commande sont rediriges", () => {
  if (!capturee) {
    // Le fichier n'est pas dans le depot sur toutes les machines. On ne
    // fait pas echouer la suite pour ca, mais on le DIT.
    console.warn("[sales-checkout-link] content/sales/atelier-du-quiz.html absent, test ignore");
    return;
  }

  const ids = findOrderButtonIds(capturee);
  assert.ok(
    ids.length >= 8,
    `seulement ${ids.length} bouton(s) de commande reperes, c'est trop peu pour cette page`,
  );

  const out = rewriteOrderButtons(capturee, "/commande/atelier");
  assert.deepEqual(out.missing, [], "des boutons declares n'existent plus dans le HTML");

  // Aucun chemin ne doit plus mener a la popup de commande Systeme.io.
  for (const id of out.rewritten) {
    assert.ok(
      !new RegExp(`<button[^>]*id="${id}"`).test(out.html),
      `${id} est encore un <button> qui ouvre la popup Systeme.io`,
    );
    assert.ok(
      new RegExp(`<a href="/commande/atelier"[^>]*id="${id}"`).test(out.html),
      `${id} ne mene pas a notre bon de commande`,
    );
  }
});

test("le carrousel de Bene mene toujours quelque part", () => {
  // Ses deux blocs perso se terminent par goCheckout(), qui CHERCHE le
  // bouton de commande pour le cliquer. En le transformant en lien, on
  // lui retire ce qu'elle cherche : sans son repli renseigne, le
  // visiteur arrive au bout du carrousel, clique, et rien ne se passe.
  const script = `var BOUTON_COMMANDE = '';\r\n  var CHECKOUT_URL        = '';   /* si ta commande est une vraie page */`;
  const out = rewriteOrderButtons(script, "/commande/atelier");
  assert.equal(out.fallbackSet, 1);
  assert.ok(
    out.html.includes("var CHECKOUT_URL        = '/commande/atelier';"),
    "le repli du carrousel n'a pas ete renseigne, ou son alignement a bouge",
  );
  // On ne touche pas a l'autre reglage : deux mecaniques qui repondent a
  // la meme question finissent par se contredire.
  assert.ok(out.html.includes("var BOUTON_COMMANDE = '';"));
});

test("la page capturee : le repli du carrousel est renseigne", () => {
  if (!capturee) return;
  const out = rewriteOrderButtons(capturee, "/commande/atelier");
  assert.ok(
    out.fallbackSet >= 1,
    "aucun CHECKOUT_URL renseigne : les blocs perso de Bene ne menent nulle part",
  );
  assert.ok(!/var\s+CHECKOUT_URL\s*=\s*''\s*;/.test(out.html), "il reste un repli vide");
});

test("la page capturee : le bouton de Bene est epargne", () => {
  if (!capturee) return;
  // Elle a des boutons dont Systeme.io n'ouvre aucune popup : ce sont
  // les siens. Au moins un doit rester un <button> intact, sinon ses
  // blocs perso ne s'ouvrent plus.
  const out = rewriteOrderButtons(capturee, "/commande/atelier");
  assert.ok(
    out.html.includes('data-test-id="show-popup-button"'),
    "plus aucun bouton a popup : les blocs perso de Bene ne s'ouvriront plus",
  );
});

// ---------------------------------------------------------------------
// L'ICÔNE DE L'ONGLET
//
// Béné, 30 août 2026, sur la page de vente de Tiquiz : "tu n'as pas mis
// le favicon de tiquiz mais celui de tipote c'est dommage."
//
// L'Atelier portait EXACTEMENT le même défaut, et pour cause : sa page
// est une capture du même compte Systeme.io, et son
// `<link rel="icon">` désigne le même fichier, octet pour octet (le "t"
// bleu de Tipote). Le dépôt de Tiquiz est jumeau : un garde-fou qui ne
// protège qu'un des deux jumeaux ne protège personne.
// ---------------------------------------------------------------------

test("l'icone de la capture est retiree, la notre est posee", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");

  const html =
    '<link rel="icon" type="image/png" href="/v/atelier-du-quiz/045f2fea8dfa.webp">' +
    '<link rel="apple-touch-icon" href="/v/atelier-du-quiz/045f2fea8dfa.webp">' +
    '<link rel="shortcut icon" href="/v/atelier-du-quiz/045f2fea8dfa.webp">';
  const nettoye = stripHeadTags(html);
  assert.ok(!nettoye.includes("045f2fea8dfa"), "l'icone de la capture survit : " + nettoye);

  const tags = buildHeadTags({
    slug: "atelier-du-quiz",
    canonical: "https://atelierduquiz.fr/",
    title: "T",
    description: "D",
    locale: "fr_FR",
    favicon: "/favicon.ico",
  });
  assert.ok(tags.includes('<link rel="icon" href="/favicon.ico">'), tags);
  assert.ok(tags.includes('<link rel="apple-touch-icon" href="/favicon.ico">'), tags);
});

test("sans icone declaree on n'en invente aucune", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");
  const tags = buildHeadTags({
    slug: "x",
    canonical: "https://atelierduquiz.fr/",
    title: "T",
    description: "D",
    locale: "fr_FR",
  });
  assert.ok(!tags.includes('rel="icon"'), tags);
});

test("la page capturee ne sert plus l'icone de Tipote", () => {
  if (!capturee) return;
  assert.ok(
    /<link[^>]*rel=["'][^"']*icon/i.test(capturee),
    "la capture n'a plus d'icone : ce test ne peut plus echouer, il ment",
  );
  assert.ok(
    !/<link[^>]*rel=["'][^"']*icon/i.test(stripHeadTags(capturee)),
    "l'icone de Tipote survit dans la page servie",
  );
});

test("la page de vente de l'Atelier declare une icone a elle", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"),
    "utf8",
  );
  assert.ok(/favicon:\s*"\/favicon\.ico"/.test(route), "la page de vente n'a plus d'icone a elle");
});
