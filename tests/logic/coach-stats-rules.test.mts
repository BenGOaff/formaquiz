// tests/logic/coach-stats-rules.test.mts
//
// Jocelyne, 4 août 2026 : "j'avais une question sur laquelle il y avait
// vraiment une chute. Reformuler les quatre réponses, reformuler la
// question, remettre les réponses dans un autre ordre : j'ai tout fait.
// Il m'a carrément conseillé de l'enlever, je l'ai enlevée, et ça
// continue à bloquer au même endroit, la question 7."
//
// Il n'y avait aucune question qui bloque. Sur ses vrais chiffres, ses
// huit questions perdent 9 personnes en tout, et son écran d'accueil en
// perd environ 73. Elle a travaillé trois semaines sur 14% de son
// problème parce que c'est tout ce qu'on lui montrait.
//
// Le coach est du CODE : ses règles régressent en silence quand on
// retouche le fichier. Ce test les fige. Il lit la SOURCE plutôt que
// d'importer le module, qui est marqué `server-only`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../../lib/coach/knowledge.ts", import.meta.url), "utf8");

/** Une règle est présente, à la casse près sur l'essentiel. */
function hasRule(needle: string): boolean {
  return SRC.includes(needle);
}

test("le coach regarde le parcours entier, pas seulement les questions", () => {
  assert.ok(
    hasRule("LE QUIZ COMMENCE À L'ÉCRAN D'ACCUEIL, PAS À LA QUESTION 1"),
    "sans ce cadrage, le coach commente les questions et rate la vraie fuite",
  );
  assert.ok(hasRule("combien cliquent sur commencer"));
});

test("il compare en personnes, pas en pourcentage", () => {
  assert.ok(
    hasRule("LA FUITE SE COMPTE EN PERSONNES, PAS EN POURCENTAGE"),
    "une étape de fin affiche un gros pourcentage sur trois personnes",
  );
});

test("il ne fait pas retoucher une question pour réparer l'entrée", () => {
  assert.ok(hasRule("UNE FUITE À L'ENTRÉE NE SE CORRIGE PAS DANS LES QUESTIONS"));
});

test("les garde-fous du 4 août tiennent toujours", () => {
  // Ils ont été écrits le même jour et pour la même cliente : les
  // perdre en ajoutant les règles ci-dessus serait le comble.
  assert.ok(
    hasRule("LA QUESTION QUI PERD LES GENS EST CELLE QU'ILS ONT VUE EN DERNIER"),
    "la question désignée reste la dernière VUE, jamais la suivante",
  );
  assert.ok(hasRule("SEUIL DE LECTURE"), "pas de verdict sur une poignée de visiteurs");
  assert.ok(hasRule("UNE SEULE modification à la fois"), "protocole de mesure");
  assert.ok(hasRule("UN SEUL CONSEIL À LA FOIS"), "pas dix conseils d'un coup");
  assert.ok(hasRule("LE PARTAGE N'EST PAS UN LEVIER UNIVERSEL"), "sujets intimes");
  assert.ok(
    hasRule("NORMAL et SAIN"),
    "perdre du monde n'est pas une faute de la créatrice",
  );
});

test("aucun tiret cadratin dans ce que le coach a sous les yeux", () => {
  // Le coach recopie le ton de ce qu'on lui donne. Un em-dash dans ses
  // règles finit dans ce que lit l'élève, et trahit le texte généré.
  const rules = SRC.slice(SRC.indexOf("=== LIRE LES STATS"));
  const end = rules.indexOf("`;");
  assert.ok(!/[—–]/.test(rules.slice(0, end)), "ni em-dash ni en-dash dans les règles stats");
});

// ── La page, ou l'audience ? ─────────────────────────────────────────

test("le coach demande d'où vient le trafic avant d'accuser la page", () => {
  // Une fuite à l'entrée a deux causes qui donnent le même chiffre.
  // Conseiller de réécrire une promesse qui va très bien, sur un
  // trafic hors sujet, ne peut rien produire.
  assert.ok(hasRule("DEMANDE D'OÙ VIENNENT LES VISITEURS"));
  assert.ok(hasRule("nomme les DEUX causes"));
});

test("il n'interprète jamais le direct comme une adresse tapée", () => {
  assert.ok(hasRule('"DIRECT" NE VEUT PAS DIRE "ILS ONT TAPÉ TON ADRESSE"'));
  assert.ok(hasRule("utm_source"), "il sait dire comment étiqueter un lien");
});

// ── Le coach a enfin des chiffres, et il ne les invente plus ─────────
//
// Jocelyne, 4 août 2026 : trois semaines à réparer une question qui
// n'avait rien. En cherchant d'où venaient les conseils, on a trouvé
// que le coach ne recevait AUCUN chiffre de funnel. Il généralisait la
// méthode : ça sonne juste, ça ne dit rien du quiz de la personne en
// face, et ça envoie réparer des choses qui vont bien.

const ROUTE = readFileSync(new URL("../../app/api/coach/route.ts", import.meta.url), "utf8");
const BRIDGE = readFileSync(new URL("../../lib/integrations/tiquiz.ts", import.meta.url), "utf8");

test("le coach reçoit les chiffres du parcours entier", () => {
  assert.ok(hasRule("LES CHIFFRES REELS DE SON QUIZ"));
  assert.ok(hasRule("Cliquent sur commencer"), "les démarrages, invisibles jusqu'ici");
  assert.ok(hasRule("Laissent leur email"));
});

test("il reprend le verdict au lieu de le recalculer", () => {
  // Deux endroits qui relisent les mêmes pourcentages finissent
  // toujours par dire deux choses différentes. L'écran de stats et le
  // coach doivent dire la MÊME phrase.
  assert.ok(hasRule("quizReadout.funnelVerdict"));
  assert.ok(hasRule("quizReadout.trafficVerdict"));
  assert.ok(
    !/readFunnelSignal|buildFullFunnel|biggestLeak/.test(SRC),
    "le coach ne recalcule aucun verdict de son côté",
  );
});

test("sans chiffres, il le DIT et n'invente rien", () => {
  // C'était la moitié qui manquait : le coach ne savait même pas qu'il
  // ne savait rien.
  assert.ok(hasRule("TU N'AS PAS SES CHIFFRES"));
  assert.ok(hasRule("tu ne cites AUCUN chiffre"));
  assert.ok(hasRule("tu ne nommes AUCUNE"));
  assert.ok(
    hasRule("Inventer un diagnostic plausible est la pire chose"),
    "la raison doit être dite, pas seulement l'interdiction",
  );
});

test("plusieurs quiz : il demande d'en choisir un", () => {
  // Un funnel qui additionne cinq quiz ne veut rien dire.
  assert.ok(hasRule("plusieurs quiz"));
  assert.ok(hasRule("choisir UN quiz"));
});

test("des vues partielles n'autorisent pas à conclure sur les taux", () => {
  assert.ok(hasRule("comptage partiel, ne conclus pas sur les taux"));
});

test("la route va vraiment chercher ces chiffres", () => {
  assert.ok(/fetchQuizReadout\(/.test(ROUTE));
  assert.ok(/quizReadout,/.test(ROUTE), "et les passe au prompt");
});

test("le pont ne fabrique rien quand l'app ne répond pas", () => {
  // Un pont muet doit donner "je n'ai pas tes chiffres", jamais un
  // objet à moitié rempli qui ressemblerait à de la donnée.
  assert.ok(/if \(!json\?\.ok \|\| !json\.readout\) return null;/.test(BRIDGE));
});
