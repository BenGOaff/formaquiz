// tests/logic/tag-acheteur-atelier.test.mts
//
// UN ACHETEUR DE L'ATELIER ENTRE DANS LES SÉQUENCES EMAIL.
//
// Béné, 31 août 2026 : "du coup c'est bon aussi pour les ventes ? Les
// bons tags seront attribués aux bons acheteurs ?"
//
// La réponse était NON pour l'Atelier, et pas par accident : le tag
// Systeme.io n'avait JAMAIS été branché sur son bon de commande, ni par
// carte ni par PayPal. L'en-tête du webhook le disait lui même ("pas
// encore branché"). Les emails restant chez Systeme.io, un acheteur non
// taggé sortait de toutes les séquences, et le symptôme était
// l'absence de symptôme : son accès et sa facture arrivaient.
//
// Le tag a été choisie par Béné : `atelier-clients`, celle que
// portent déjà ses clients. Les `ads-*` ne nous concernent pas ("c'est
// un test en pub"), et il n'y a pas d'upsell sur l'Atelier.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const MODULE = readFileSync("lib/sio/tagVente.ts", "utf8");
const STRIPE = readFileSync("app/api/commande/webhook/route.ts", "utf8");
const PAYPAL = readFileSync("app/api/commande/paypal/webhook/route.ts", "utf8");

test("l'etiquette est celle que Bene a choisie, et une seule fois", () => {
  assert.match(MODULE, /export const TAG_CLIENT_ATELIER = "atelier-clients"/);
  // Un nom recopie dans chaque webhook finirait par diverger : c'est le
  // defaut que ces depots paient en boucle.
  for (const src of [STRIPE, PAYPAL]) {
    assert.doesNotMatch(src, /"atelier-clients"/, "le nom se demande au module, il ne se recopie pas");
    assert.match(src, /TAG_CLIENT_ATELIER/);
  }
});

test("on ne pose AUCUNE etiquette qui commence par ads-", () => {
  // "celui qui s'appelle ads n'est pas celui qu'on vend, c'est un test
  // en pub qui ne nous concerne pas" (Bene, 31 aout).
  for (const src of [MODULE, STRIPE, PAYPAL]) {
    assert.doesNotMatch(src, /"ads-[a-z-]+"/);
  }
});

test("les DEUX moyens de paiement etiquettent", () => {
  // Un seul des deux branche, c'est la moitie des acheteurs hors des
  // sequences, et personne pour le remarquer.
  for (const src of [STRIPE, PAYPAL]) {
    assert.match(src, /await poserTagAcheteur\(\{/);
  }
});

test("l'etiquette vient APRES l'acces et APRES la commission", () => {
  // Une etiquette qui echoue ne doit jamais priver quelqu'un de ce
  // qu'il a paye (regle du 7 aout), ni retarder l'argent d'une
  // affiliee.
  for (const src of [STRIPE, PAYPAL]) {
    const acces = src.indexOf("grantAccessByEmail");
    const commission = src.indexOf("await commissionnerVente(");
    const etiquette = src.indexOf("await poserTagAcheteur(");
    assert.ok(acces > -1 && commission > -1 && etiquette > -1);
    assert.ok(acces < etiquette, "l'acces d'abord");
    assert.ok(commission < etiquette, "l'argent de l'affiliee avant l'email");
  }
});

test("un appel qui traine ne tient pas le webhook ouvert", () => {
  // Sans delai maximum, une panne de Tiquiz garderait la requete
  // ouverte jusqu'a ce que la plateforme la tue (lecon du 24 aout,
  // `commissionnerVente` n'en avait pas).
  assert.match(MODULE, /AbortSignal\.timeout\(\d+\)/);
});

test("la fonction ne jette JAMAIS et le dit dans le journal", () => {
  assert.match(MODULE, /catch \(e\) \{/);
  assert.match(MODULE, /sequences email/, "un acheteur perdu doit etre nommable dans pm2 logs");
  // Elle rend un booleen : aucun appelant ne peut la laisser casser une
  // vente en oubliant un try.
  assert.match(MODULE, /Promise<boolean>/);
});

test("l'adresse de Tiquiz ne peut pas etre locale", () => {
  // Un `??` ne protege que de la variable absente, jamais de la
  // variable fausse (drame Veronique, 2 aout).
  assert.match(MODULE, /ADRESSE_LOCALE/);
  assert.match(MODULE, /https:\/\/quiz\.tipote\.com/);
});

test("le tag est un PARAMETRE, pas une valeur devinee dans la fonction", () => {
  // Le jour ou l'Atelier vend autre chose, l'appelant devra dire quoi.
  assert.match(MODULE, /tag: string;/);
  const corps = MODULE.slice(MODULE.indexOf("export async function poserTagAcheteur"));
  assert.doesNotMatch(corps, /TAG_CLIENT_ATELIER/, "une valeur par defaut etiquetterait de travers en silence");
});
