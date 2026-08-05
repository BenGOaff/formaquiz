// tests/logic/linked-account.test.mts
//
// Jocelyne, 4 et 5 août 2026. Six semaines à lire "tu n'as pas encore de
// quiz" alors qu'elle en avait trois en ligne, avec 2002 vues, sur son
// autre adresse email.
//
// La carte du tableau de bord a été corrigée le 4. Le 5, on a trouvé le
// même défaut TROIS fois de plus, empilé sur la page Avancées : le Quiz
// Doctor, le panneau de résultats et les conseils du coach affirmaient
// tous les trois, au présent de l'indicatif, une chose qu'aucun des
// trois ne savait.
//
// Ce fichier fige la seule règle qui compte : on ne conclut RIEN sur
// quelqu'un tant qu'on n'a pas la donnée, et quand on l'a, on nomme les
// deux explications au lieu d'en choisir une.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  accountLine,
  readAccountSilence,
  silenceCopy,
} from "../../lib/tiquizAccount.ts";
import { computeTiquizInsights } from "../../lib/insights/tiquizInsights.ts";

// ── Quand on se tait ─────────────────────────────────────────────────

test("pas connecté : ce n'est pas à cet encart de parler", () => {
  assert.equal(readAccountSilence({ connected: false, quizCount: 0, views: 0 }), null);
});

test("liste de quiz non chargée : on ne conclut rien", () => {
  // Une liste qu'on n'a pas pu charger n'est pas une liste vide. C'est
  // déjà la règle de `loadError` sur la carte du tableau de bord, et
  // c'est le drame Gwenn du 19 juillet.
  assert.equal(readAccountSilence({ connected: true, quizCount: null, views: null }), null);
  assert.equal(readAccountSilence({ connected: true, quizCount: null, views: 0 }), null);
});

test("des quiz et des visites : rien à signaler", () => {
  assert.equal(readAccountSilence({ connected: true, quizCount: 3, views: 2002 }), null);
});

test("des quiz mais des métriques absentes : on se tait", () => {
  // `null` n'est pas zéro. Une synchro jamais faite ne prouve pas
  // qu'il n'y a aucune visite.
  assert.equal(readAccountSilence({ connected: true, quizCount: 2, views: null }), null);
});

// ── Quand on parle ───────────────────────────────────────────────────

test("aucun quiz : c'est le cas de Jocelyne, et on le nomme", () => {
  assert.equal(readAccountSilence({ connected: true, quizCount: 0, views: 0 }), "no-quiz");
});

test("des quiz mais zéro visite : autre cause, autre phrase", () => {
  assert.equal(readAccountSilence({ connected: true, quizCount: 2, views: 0 }), "no-activity");
});

// ── Ce qu'on lui dit ─────────────────────────────────────────────────

test("les DEUX explications sont nommées, jamais une seule", () => {
  for (const reason of ["no-quiz", "no-activity"] as const) {
    const c = silenceCopy(reason, "Tiquiz");
    assert.match(c.causes, /Deux explications possibles/);
    // La cause à laquelle personne ne pense, et qui a coûté six semaines.
    assert.match(c.causes, /une autre adresse email/);
    // Et on ne la culpabilise pas au passage.
    assert.match(c.causes, /une seule est un problème/);
  }
});

test("le nom de l'outil suit l'élève, il n'est pas écrit en dur", () => {
  // Retour Maurice, 29 juillet 2026 : un élève dont le quiz est sur
  // Tipote était envoyé sur le login Tiquiz, impasse totale.
  const tipote = silenceCopy("no-quiz", "Tipote");
  assert.match(tipote.lead, /Tipote/);
  assert.doesNotMatch(tipote.lead, /Tiquiz/);
  assert.doesNotMatch(tipote.causes, /Tiquiz/);
});

test("l'action dit où regarder, et rassure sur ce qu'elle risque", () => {
  const c = silenceCopy("no-quiz", "Tiquiz");
  assert.match(c.action, /adresse/);
  assert.match(c.action, /badges déjà obtenus restent acquis/);
});

test("sans adresse connue, on le dit au lieu d'afficher un vide", () => {
  assert.equal(accountLine("Tiquiz", "jo@exemple.fr"), "jo@exemple.fr");
  assert.equal(accountLine("Tiquiz", "  jo@exemple.fr "), "jo@exemple.fr");
  assert.match(accountLine("Tipote", null), /Adresse inconnue/);
  assert.match(accountLine("Tipote", "   "), /Adresse inconnue/);
});

test("aucun tiret cadratin dans ce que l'élève lit", () => {
  for (const reason of ["no-quiz", "no-activity"] as const) {
    const c = silenceCopy(reason, "Tiquiz");
    assert.ok(!/[—–]/.test(`${c.lead} ${c.causes} ${c.action}`));
  }
  assert.ok(!/[—–]/.test(accountLine("Tiquiz", null)));
});

// ── Les quatre écrans passent bien par là ────────────────────────────
//
// C'est le garde-fou le plus important du fichier : le 5 août, la carte
// du tableau de bord disait la bonne chose pendant que trois blocs de la
// page Avancées disaient encore le contraire.

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("les quatre écrans affichent le même encart", () => {
  for (const f of [
    "../../components/TiquizFocusCard.tsx",
    "../../components/QuizDoctor.tsx",
    "../../components/TiquizPanel.tsx",
  ]) {
    assert.match(read(f), /LinkedAccountNotice/, `${f} doit passer par l'encart commun`);
  }
});

test("plus personne ne conclut 'aucun quiz' sans montrer l'adresse", () => {
  // La phrase exacte que Jocelyne a lue pendant six semaines.
  const doctor = read("../../components/QuizDoctor.tsx");
  assert.doesNotMatch(doctor, /Aucun quiz détecté sur ton compte Tiquiz/);
});

test("le coach décrit ce qu'il observe, il n'affirme pas qu'elle n'a rien fait", () => {
  // Il ne peut pas le savoir : si l'Atelier interroge le mauvais
  // compte, "ton quiz n'a pas encore de visiteurs" est faux. On teste
  // la sortie de la fonction, pas le texte du fichier : un commentaire
  // qui cite la vieille phrase ne doit pas faire rougir le test.
  const [insight] = computeTiquizInsights({
    leads: 0,
    views: 0,
    completes: 0,
    shares: 0,
    topQuiz: null,
  });
  assert.ok(insight, "il dit quelque chose plutôt que de laisser un vide");
  assert.doesNotMatch(insight.title, /Ton quiz n'a pas encore de visiteurs/);
  assert.match(insight.title, /compte relié/);
  // Et il renvoie vers l'encart qui, lui, porte l'adresse.
  assert.match(insight.action, /l'adresse est affichée juste au dessus/);
});

test("la page Avancées transmet de quoi trancher", () => {
  const page = read("../../app/(app)/avancees/page.tsx");
  assert.match(page, /quizCount/, "le nombre de quiz, sinon aucun écran ne peut décider");
  assert.match(page, /providerName/, "le bon nom d'outil");
  assert.match(page, /tiquiz_email/, "et l'adresse interrogée");
});
