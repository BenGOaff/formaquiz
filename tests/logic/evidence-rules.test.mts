// tests/logic/evidence-rules.test.mts
//
// Ce qu'on a le droit d'affirmer, et ce qu'on doit annoncer comme une
// hypothèse. Fil rouge du 4 août 2026.
//
// Deux moitiés, deux risques différents :
//
// - LE DIAGNOSTIC. Le rapport IA du 3 août disait à Jocelyne
//   "Retravailler la question 7, 6% de perte", écrit comme un constat.
//   C'était un artefact sur trois visiteurs, et la question désignée
//   n'était même pas la bonne. Trois semaines perdues.
//
// - LA PROMO. Le rédacteur des affiliés n'avait AUCUNE règle sur les
//   chiffres. Ce qu'il écrit est publié par des affiliés, à leur
//   audience, au nom de nos produits : un "+300% de leads" inventé
//   engage la crédibilité de Béné, pas celle du modèle. C'est sa ligne
//   rouge numéro un, et elle n'existait nulle part dans le code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CLAIMS_RULES, EVIDENCE_RULES, NO_DATA_RULES } from "../../lib/prompts/evidence.ts";

// ── Le diagnostic ────────────────────────────────────────────────────

test("une cause n'est jamais présentée comme un constat", () => {
  assert.match(EVIDENCE_RULES, /Une CAUSE n'est JAMAIS un constat/);
  assert.match(EVIDENCE_RULES, /COMMENT la verifier/);
});

test("sans chiffres, aucun diagnostic n'est fabriqué", () => {
  assert.match(NO_DATA_RULES, /TU N'AS PAS DE CHIFFRES/);
});

// ── La promo ─────────────────────────────────────────────────────────

test("aucun chiffre hors des faits produits", () => {
  assert.match(CLAIMS_RULES, /AUCUN chiffre qui ne soit pas dans les faits produits/);
  assert.match(CLAIMS_RULES, /[Pp]as de resultat moyen/);
});

test("aucun témoignage inventé", () => {
  // Un faux témoignage est indétectable pour le lecteur et impardonnable
  // pour celle qui le signe.
  assert.match(CLAIMS_RULES, /AUCUN temoignage/);
  assert.match(CLAIMS_RULES, /aucun prenom de cliente/);
});

test("aucune fausse urgence", () => {
  assert.match(CLAIMS_RULES, /date de fermeture/);
  assert.match(CLAIMS_RULES, /plus que 3 places/);
});

test("on décrit ce que l'outil fait, pas ce que la personne obtiendra", () => {
  // La première est vérifiable, la seconde ne l'est pas.
  assert.match(CLAIMS_RULES, /Tu ne promets aucun resultat/);
});

test("un texte moins percutant vaut mieux qu'une promesse fausse", () => {
  // La raison compte autant que la règle : sans elle, c'est la première
  // ligne que quelqu'un supprimera pour "muscler" un texte.
  assert.match(CLAIMS_RULES, /Un texte moins percutant se rattrape/);
});

// ── La forme ─────────────────────────────────────────────────────────

test("aucun tiret cadratin dans ce qu'on donne au modèle", () => {
  for (const block of [EVIDENCE_RULES, NO_DATA_RULES, CLAIMS_RULES]) {
    assert.ok(!/[—–]/.test(block));
  }
});

// ── Elles s'appliquent vraiment ──────────────────────────────────────

test("le rédacteur des affiliés reçoit la règle", () => {
  const src = readFileSync(new URL("../../lib/affiliateGeneratorBrief.ts", import.meta.url), "utf8");
  assert.ok(/CLAIMS_RULES/.test(src));
  // Elle vient APRÈS les faits produits : le modèle lit d'abord ce qu'il
  // a le droit de dire, puis la règle qui l'y enferme.
  assert.ok(src.indexOf("ATELIER_FACTS") < src.lastIndexOf("CLAIMS_RULES"));
});

test("le générateur d'étude de cas reste honnête", () => {
  // Vérifié le 4 août : il refusait déjà les chiffres inventés et
  // marquait les citations comme à confirmer. On fige, pour que
  // personne ne l'allège en le retouchant.
  const src = readFileSync(new URL("../../lib/generate/caseStudy.ts", import.meta.url), "utf8");
  assert.ok(/aucun chiffre inventé/.test(src));
  assert.ok(/citation à confirmer/.test(src));
  assert.ok(/Tu n'inventes pas de faux témoignage/.test(src));
});
