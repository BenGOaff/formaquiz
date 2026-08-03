// tests/logic/funnel-sequence.test.mts
//
// Béné, 3 août 2026 : "il faut générer toute la séquence : regarde mon
// screenshot c'est l'attendu d'une séquence générée pour chaque profil."
//
// Une séquence, c'est un ORDRE avant d'être un contenu. Si l'email de
// vente arrive avant le conseil, la séquence ne vaut plus rien, et
// l'écran colle en plus le mauvais libellé sur chaque email (il les
// nomme par leur POSITION). Ce fichier fige cet ordre.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESULT_SEQUENCE,
  sequenceBeatTitle,
  sortSequence,
  sequenceGuidance,
} from "../../lib/funnelSequence.ts";

test("la séquence a cinq temps, tous nommés et tous distincts", () => {
  assert.equal(RESULT_SEQUENCE.length, 5);
  const titles = RESULT_SEQUENCE.map((b) => b.title);
  assert.equal(new Set(titles).size, 5, "deux temps portent le même nom");
  for (const b of RESULT_SEQUENCE) {
    assert.ok(b.title.trim(), "un temps sans titre");
    assert.ok(b.intent.trim(), "un temps sans consigne");
  }
});

test("l'ordre des temps est celui de la maquette", () => {
  assert.equal(sequenceBeatTitle(0), "Son résultat");
  assert.equal(sequenceBeatTitle(3), "Ton offre, ou un rendez-vous");
  assert.equal(sequenceBeatTitle(4), "Rester en contact");
});

test("un index hors séquence ne casse pas l'affichage", () => {
  // Un profil qui reçoit 6 emails (le modèle a débordé) doit rester
  // lisible : le 6e n'a pas de libellé, il ne fait pas planter la page.
  assert.equal(sequenceBeatTitle(5), "");
  assert.equal(sequenceBeatTitle(-1), "");
});

test("les emails sont remis dans l'ordre des temps", () => {
  const shuffled = [{ step: 4 }, { step: 1 }, { step: 5 }, { step: 2 }, { step: 3 }];
  assert.deepEqual(
    sortSequence(shuffled).map((e) => e.step),
    [1, 2, 3, 4, 5],
  );
});

test("un email sans rang passe derrière, jamais au milieu", () => {
  // C'est le cas d'une campagne générée AVANT la séquence : elle doit
  // rester lisible, sans venir s'intercaler entre deux temps.
  const mixed = [{ step: null, subject: "vieux" }, { step: 2 }, { step: 1 }];
  assert.deepEqual(
    sortSequence(mixed).map((e) => e.step ?? "sans"),
    [1, 2, "sans"],
  );
});

test("les emails sans rang gardent leur ordre d'arrivée", () => {
  const legacy = [
    { step: null, subject: "a" },
    { step: null, subject: "b" },
    { step: null, subject: "c" },
  ];
  assert.deepEqual(
    sortSequence(legacy).map((e) => e.subject),
    ["a", "b", "c"],
  );
});

test("deux emails de même rang ne s'inversent pas", () => {
  const dup = [{ step: 2, subject: "premier" }, { step: 2, subject: "second" }, { step: 1 }];
  const out = sortSequence(dup);
  assert.equal(out[1].subject, "premier");
  assert.equal(out[2].subject, "second");
});

test("le tableau reçu n'est jamais modifié sur place", () => {
  const input = [{ step: 3 }, { step: 1 }];
  sortSequence(input);
  assert.deepEqual(
    input.map((e) => e.step),
    [3, 1],
  );
});

test("les consignes du prompt listent les cinq temps, numérotés", () => {
  // Le prompt et l'écran lisent la MÊME source : c'est ce qui garantit
  // que le libellé affiché corresponde à ce qu'on a demandé d'écrire.
  const g = sequenceGuidance();
  RESULT_SEQUENCE.forEach((b, i) => {
    assert.ok(g.includes(`${i + 1}. ${b.title}`), `temps ${i + 1} absent des consignes`);
  });
});

test("aucun tiret long dans les libellés vus par l'élève", () => {
  // Règle absolue de Béné sur tout contenu user-visible.
  for (const b of RESULT_SEQUENCE) {
    assert.ok(!/[—–]/.test(b.title), `tiret long dans "${b.title}"`);
    assert.ok(!/[—–]/.test(b.intent), `tiret long dans une consigne`);
  }
});
