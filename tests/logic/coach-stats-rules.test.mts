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

import { VALUE_CONTENT_CRITERIA, VALUE_CONTENT_RULES } from "../../lib/prompts/valueContent.ts";

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

// ── Les 5 critères d'un contenu de valeur ────────────────────────────
//
// Ils vivent dans un module a part, parce que le generateur de bonus
// (chantier a venir) juge ses propres propositions sur la meme grille.

const inValue = (needle: string): boolean => VALUE_CONTENT_RULES.includes(needle);
//
// Béné, 4 août 2026. Le coach savait dire "ton bonus n'est pas assez
// fort" sans jamais pouvoir dire POURQUOI. Un modèle sans critère juge
// au feeling : il approuve ce qui est bien écrit et refuse ce qui est
// mal formulé, ce qui n'a aucun rapport avec la valeur.

test("le coach a la grille des 5 critères", () => {
  assert.deepEqual(
    VALUE_CONTENT_CRITERIA.map((c) => c.name),
    ["Utile", "Specifique", "Cible", "Applicable", "Unique"],
  );
  for (const c of VALUE_CONTENT_CRITERIA) {
    assert.ok(inValue(`- ${c.name} : ${c.rule}`), `le critère ${c.name} doit sortir dans le prompt`);
  }
});

test("les critères sont ceux de Béné, pas une paraphrase", () => {
  // Le coach doit enseigner la même chose qu'elle, pas une variante qui
  // sonne pareil.
  assert.ok(inValue("On peut en tirer un benefice concret"));
  assert.ok(inValue("Tu es la seule personne a pouvoir l'ecrire comme ca"));
});

test("la grille sert à JUGER, elle ne se récite pas", () => {
  // Une grille donnée sans mode d'emploi devient une check-list collée
  // en fin de réponse, ce qui n'aide personne.
  assert.ok(inValue("Tu nommes le critère qui MANQUE, un seul"));
  assert.ok(inValue("Reciter les cinq critères a la fin d'une reponse ne sert a rien"));
});

test("UNIQUE est traité comme ce que l'IA ne peut pas produire", () => {
  // C'est le critère qui distingue le contenu d'une créatrice de
  // celui de n'importe qui d'autre.
  assert.ok(inValue("le seul qu'une IA ne peut pas produire a la place de l'eleve"));
  assert.ok(inValue("tu poses la question qui va chercher ce que lui seul a vecu"));
});

test("le coach reçoit vraiment la grille", () => {
  // Un module de critères que personne n'injecte ne sert à rien.
  assert.ok(hasRule("${VALUE_CONTENT_RULES}"), "la grille doit être dans le prompt du coach");
});

// ── Le compte relié n'est pas toujours le bon (Jocelyne, 4 août 2026) ─
//
// Son Atelier était connecté à un compte Tiquiz VIDE depuis le 25
// juillet. La liaison se fait par email, et elle en a deux :
// jocelyne@j-bacquet.fr côté Atelier, jocelynebacquet.auteur@gmail.com
// côté Tiquiz, où vivent ses 3 quiz et ses 2002 vues.
//
// Pendant six semaines, tout affichait zéro sans que rien ne l'explique.
// C'est la même famille que le `ok: false` silencieux : l'état anormal
// existait, personne ne le nommait.

test("un compte connecté sans aucun quiz est expliqué, pas subi", () => {
  assert.ok(hasRule("AUCUN quiz n'y est trouvé"));
  assert.ok(
    hasRule("la liaison se fait par email, et beaucoup de gens ont deux adresses"),
    "la cause la plus fréquente doit être nommée",
  );
  assert.ok(hasRule("se déconnecte puis se reconnecte depuis le bon compte"));
});

test("il ne confond pas ce cas avec celui de plusieurs quiz", () => {
  // Dire "choisis un quiz" à quelqu'un dont le compte est vide, c'est
  // l'envoyer chercher dans un sélecteur qui n'a rien à lui montrer.
  assert.ok(hasRule("SI TU NE VOIS AUCUN QUIZ"));
  assert.ok(hasRule("SINON, demande-lui de choisir UN quiz"));
});

test("la sélection colle au quiz choisi", () => {
  // Béné : "si un nouveau quiz est créé je veux que la sélection reste
  // sur le dernier quiz choisi et pas qu'il bascule sur le nouveau".
  const src = readFileSync(new URL("../../lib/integrations/tiquiz.ts", import.meta.url), "utf8");
  assert.ok(/LA SELECTION COLLE/.test(src));
  assert.ok(
    /if \(current\.quizzes\.some\(\(q\) => q\.id === id\)\) return stored;/.test(src),
    "un quiz toujours là garde la main, quel que soit ce qui a été créé depuis",
  );
  assert.ok(
    /if \(!current\) return stored;/.test(src),
    "pont muet : on garde la mémoire plutôt que de re-choisir au hasard",
  );
});

test("le coach lit le MÊME quiz que le reste de l'app", () => {
  // Sinon il commenterait un autre quiz que celui affiché à l'écran.
  const src = readFileSync(new URL("../../lib/integrations/tiquiz.ts", import.meta.url), "utf8");
  assert.ok(/const scope = await resolveScope\(userId, conn\);/.test(src));
});

// ── La liaison automatique ne relie plus un compte vide ──────────────
//
// Vérifié dans le code le 4 août : `ensureAutoConnect` tourne au
// chargement du tableau de bord, sans action de l'élève, et matche sur
// l'email du compte ATELIER. Jocelyne en a deux, et celui de l'Atelier
// correspondait à un compte Tiquiz créé puis abandonné, sans un seul
// quiz. C'est celui-là qu'on a relié tout seul.
//
// Ironie du code : `autoLink` savait DÉJÀ préférer un compte non vide,
// mais seulement pour arbitrer entre Tiquiz et Tipote. Entre deux
// comptes du même produit, la question ne se posait jamais.

test("un compte sans aucun quiz n'est jamais relié en silence", () => {
  const src = readFileSync(new URL("../../lib/integrations/tiquiz.ts", import.meta.url), "utf8");
  assert.ok(/UN COMPTE VIDE N'EST PAS LE BON COMPTE/.test(src));
  assert.ok(
    /const n = await countQuizzesFor\(linked\.token, linked\.provider\);\s*\n\s*if \(n === 0\) \{/.test(src),
    "le compte est compté AVANT d'être enregistré",
  );
  assert.ok(/void revokeTokenAt\(linked\.token, linked\.provider\);/.test(src), "et le jeton inutile est révoqué");
});

test("une panne réseau ne prive personne de sa connexion", () => {
  // `countQuizzesFor` rend null quand il n'a pas pu compter. Refuser
  // dans ce cas serait remplacer un bug par un autre.
  const src = readFileSync(new URL("../../lib/integrations/tiquiz.ts", import.meta.url), "utf8");
  assert.ok(/`null` = on n'a pas pu compter/.test(src));
  assert.ok(!/if \(n === 0 \|\| n === null\)/.test(src), "null ne doit pas bloquer la liaison");
});
