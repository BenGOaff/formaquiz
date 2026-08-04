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
// Ce test lit la source du composant : la logique vit dans du JSX, donc
// on vérifie ce qui est rendu, pas une fonction pure. C'est le pis-aller
// assumé tant que cet écran n'a pas de fonction extraite.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const card = readFileSync(
  new URL("../../components/TiquizFocusCard.tsx", import.meta.url),
  "utf8",
);

test("l'ecran lit l'adresse du compte que l'API renvoie", () => {
  assert.match(card, /setAccount\(/, "l'email renvoyé par l'API doit être conservé");
  assert.match(card, /data\.email/, "il vient de la réponse, jamais d'ailleurs");
});

test("le compte relie est affiche quand il n'y a aucun quiz", () => {
  // C'est LA branche du drame : c'est là que l'ambiguïté coûte six
  // semaines.
  const branch = card.slice(card.indexOf("if (quizzes.length === 0)"));
  assert.match(branch, /Compte \{providerName\} relié/);
  assert.match(branch, /\{account\}/);
});

test("les deux causes possibles sont nommees, pas une seule", () => {
  // "Crée ton premier quiz" tout seul est une accusation implicite : il
  // dit à quelqu'un qui a trois quiz en ligne qu'elle n'a rien fait.
  const branch = card.slice(card.indexOf("if (quizzes.length === 0)"));
  assert.match(branch, /soit tes quiz\s+vivent sur un autre compte/);
  assert.match(branch, /Changer de compte/);
});

test("changer de compte delie AVANT de relancer le consentement", () => {
  // Sans la déconnexion, l'opt-out n'est pas posé et la liaison
  // automatique peut reprendre la main sur l'ancienne adresse.
  const fn = card.slice(card.indexOf("async function switchAccount"));
  const cut = fn.indexOf("const providerName");
  const body = cut > 0 ? fn.slice(0, cut) : fn;

  assert.ok(
    body.indexOf("tiquiz/disconnect") < body.indexOf("tiquiz/start"),
    "on délie d'abord, on relance ensuite",
  );
});

test("un refus produit un message, jamais un silence", () => {
  // Règle du 3 août : un `ok: false` doit toujours produire quelque chose
  // à l'écran. Un échec silencieux envoie chercher au mauvais endroit,
  // et c'est plus cher que le bug qu'il masque.
  const fn = card.slice(card.indexOf("async function switchAccount"));
  const cut = fn.indexOf("const providerName");
  const body = cut > 0 ? fn.slice(0, cut) : fn;

  assert.match(body, /if \(!data\?\.ok\)/);
  assert.match(body, /toast\.error/);
});

test("aucun tiret cadratin dans ce que la cliente lit", () => {
  assert.ok(!/[—–]/.test(card));
});
