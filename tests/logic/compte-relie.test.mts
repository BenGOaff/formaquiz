// tests/logic/compte-relie.test.mts
//
// "Jocelyne s'est déconnectée et reconnectée mais elle ne voit toujours
// aucun quiz." (Béné, 4 août 2026)
//
// La manip était bonne. Ce qui manquait, c'est le MOYEN DE VÉRIFIER
// qu'elle avait atterri au bon endroit. L'Atelier affichait "Tu n'as pas
// encore de quiz. Crée ton premier quiz dans Tiquiz", sans jamais dire à
// QUEL compte il était relié. Cette phrase se lit "tu n'as pas commencé"
// quand elle voulait dire "on regarde le mauvais compte", et rien à
// l'écran ne permettait de faire la différence.
//
// L'API renvoyait déjà `email` depuis toujours. C'est l'écran qui n'en
// faisait rien. Une donnée qu'on a et qu'on n'affiche pas coûte
// exactement aussi cher qu'une donnée qu'on n'a pas.
//
// -- MISE À JOUR DU 5 AOÛT --------------------------------------------
//
// La version d'origine de ce fichier lisait la source de
// `TiquizFocusCard`, en disant que c'était "le pis-aller assumé tant que
// cet écran n'a pas de fonction extraite". Elle est extraite : le texte
// vit dans `lib/tiquizAccount.ts` (testé en propre par
// `linked-account.test.mts`) et l'encart dans `LinkedAccountNotice`,
// parce que trois autres écrans portaient le même défaut.
//
// Ce qui reste ici est ce qui ne peut pas descendre dans une fonction
// pure : la carte conserve bien l'adresse que l'API lui donne, et la
// bascule de compte délie avant de relancer le consentement.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const card = readFileSync(
  new URL("../../components/TiquizFocusCard.tsx", import.meta.url),
  "utf8",
);
const notice = readFileSync(
  new URL("../../components/LinkedAccountNotice.tsx", import.meta.url),
  "utf8",
);

test("l'ecran lit l'adresse du compte que l'API renvoie", () => {
  assert.match(card, /setAccount\(/, "l'email renvoyé par l'API doit être conservé");
  assert.match(card, /data\.email/, "il vient de la réponse, jamais d'ailleurs");
});

test("et il la transmet a l'encart au lieu de la garder pour lui", () => {
  // C'est LA branche du drame : c'est là que l'ambiguïté coûte six
  // semaines.
  const branch = card.slice(card.indexOf("if (quizzes.length === 0)"));
  assert.match(branch, /LinkedAccountNotice/);
  assert.match(branch, /email=\{account\}/);
});

test("l'encart montre l'adresse interrogee", () => {
  assert.match(notice, /Compte \{providerName\} interrogé/);
  assert.match(notice, /accountLine\(/);
});

test("changer de compte delie AVANT de relancer le consentement", () => {
  // Sans la déconnexion, l'opt-out n'est pas posé et la liaison
  // automatique peut reprendre la main sur l'ancienne adresse.
  const fn = notice.slice(notice.indexOf("async function switchAccount"));
  assert.ok(
    fn.indexOf("tiquiz/disconnect") < fn.indexOf("tiquiz/start"),
    "on délie d'abord, on relance ensuite",
  );
});

test("un refus produit un message, jamais un silence", () => {
  // Règle du 3 août : un `ok: false` doit toujours produire quelque chose
  // à l'écran. Un échec silencieux envoie chercher au mauvais endroit,
  // et c'est plus cher que le bug qu'il masque.
  const fn = notice.slice(notice.indexOf("async function switchAccount"));
  assert.match(fn, /if \(!data\?\.ok\)/);
  assert.match(fn, /toast\.error/);
});

test("la bascule n'existe qu'a UN endroit", () => {
  // Recopiée dans chaque écran, elle finirait par se comporter de
  // quatre façons différentes. C'est le défaut que ce repo corrige en
  // boucle depuis juin.
  assert.doesNotMatch(card, /async function switchAccount/);
});

test("aucun tiret cadratin dans ce que la cliente lit", () => {
  assert.ok(!/[—–]/.test(card));
  assert.ok(!/[—–]/.test(notice));
});
