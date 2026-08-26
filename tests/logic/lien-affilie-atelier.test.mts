// tests/logic/lien-affilie-atelier.test.mts
//
// LE LIEN DE L'ONGLET AFFILIATION EST LE NÔTRE.
//
// Béné, 26 août 2026, capture de l'écran à l'appui : "t'as pas oublié un
// truc ?" L'onglet demandait un identifiant Systeme.io et fabriquait
// `https://www.tipote.fr/atelier-du-quiz?sa=...`, la veille du jour où
// l'Atelier est passé sur notre bon de commande.
//
// Ce que ces tests figent : le lien part sur NOTRE domaine, il porte le
// code public, et il n'existe pas quand il n'y a pas de code. Un lien
// muet se partagerait exactement comme l'autre, et chaque partage serait
// une vente perdue que personne ne pourrait retrouver.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ATELIER_SALES_URL,
  ESPACE_AFFILIE_URL,
  buildAffiliateLink,
  AFFILIATE_ARGUMENTS,
} from "../../lib/affiliate.ts";

test("la page de vente est la nôtre, jamais un tunnel Systeme.io", () => {
  assert.equal(ATELIER_SALES_URL, "https://atelierduquiz.fr/");
  assert.doesNotMatch(ATELIER_SALES_URL, /tipote\.fr|systeme\.io/);
});

test("le lien porte le code public, pas l'identifiant Systeme.io", () => {
  const lien = buildAffiliateLink("jocelyne");
  assert.equal(lien, "https://atelierduquiz.fr/?ref=jocelyne");
  assert.doesNotMatch(lien, /[?&]sa=/);
});

test("un identifiant Systeme.io ne fabrique AUCUN lien", () => {
  // Il est trop long pour un code public, et c'est voulu : le passer
  // ici produirait un lien que notre bon de commande ne sait pas lire.
  const sa = "sa0007878317200141bbe3de2b6644176621db2c6580";
  assert.equal(buildAffiliateLink(sa), "");
});

test("pas de code -> pas de lien, jamais l'adresse nue", () => {
  for (const rien of [null, undefined, "", "  "]) {
    assert.equal(buildAffiliateLink(rien), "", `valeur : ${JSON.stringify(rien)}`);
  }
});

test("l'espace affilié est celui où vivent les versements", () => {
  assert.equal(ESPACE_AFFILIE_URL, "https://affiliate.tipote.com/");
});

test("l'argument paiement ne promet plus que Systeme.io verse", () => {
  const paiement = AFFILIATE_ARGUMENTS.map((a) => `${a.title} ${a.body}`).join(" ");
  assert.doesNotMatch(
    paiement,
    /Systeme\.io te paie/i,
    "le cycle de versement vit chez nous depuis le 25 août",
  );
  assert.match(paiement, /20 €/, "le minimum par virement doit être dit");
});

test("aucun argument ne porte de tiret cadratin", () => {
  for (const a of AFFILIATE_ARGUMENTS) {
    assert.doesNotMatch(`${a.title} ${a.body}`, /[—–]/, a.title);
  }
});
