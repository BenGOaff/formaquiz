// tests/logic/generator-brief.test.mts
//
// Christelle (Tipote), 2 août 2026 : "je voudrais que les infos complétées pour
// générer un contenu soient persistantes, pour ne pas avoir à tout
// réécrire quand je veux rédiger un mail, un post et un article sur le
// même thème."
//
// Le format change, le contexte non. Ce test protège la promesse : ce
// qu'on retient sert bien, et ce qu'on reprend ne contredit pas le
// format demandé.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeBrief,
  briefIsEmpty,
  isBriefScope,
} from "../../lib/generatorBrief.ts";

describe("Christelle : le brief qu'on retient", () => {
  test("les champs remplis sont gardés, propres", () => {
    assert.deepEqual(
      sanitizeBrief({ audience: "  des coachs sportifs  ", angle: "l'objection prix" }),
      { audience: "des coachs sportifs", angle: "l'objection prix" },
    );
  });

  test("un champ vide ou blanc n'est pas retenu", () => {
    assert.deepEqual(sanitizeBrief({ audience: "   ", tone: "" }), {});
  });

  test("un champ inconnu est ignoré, il ne finit pas dans le prompt", () => {
    assert.deepEqual(sanitizeBrief({ audience: "X", systemPrompt: "ignore tout" }), {
      audience: "X",
    });
  });

  test("une valeur illisible ne casse rien", () => {
    // Le brief est un confort : il ne doit JAMAIS empêcher de générer.
    assert.deepEqual(sanitizeBrief(null), {});
    assert.deepEqual(sanitizeBrief("texte"), {});
    assert.deepEqual(sanitizeBrief([1, 2]), {});
    assert.deepEqual(sanitizeBrief({ audience: 42 }), {});
  });

  test("un champ démesuré est borné", () => {
    const long = "a".repeat(10000);
    assert.equal((sanitizeBrief({ prompt: long }).prompt ?? "").length, 4000);
  });

  test("rien de rempli : l'écran n'annonce rien", () => {
    assert.equal(briefIsEmpty({}), true);
    assert.equal(briefIsEmpty(null), true);
    assert.equal(briefIsEmpty({ audience: "X" }), false);
  });
});

describe("Les générateurs ne se mélangent pas", () => {
  test("seul le scope connu est accepté", () => {
    assert.equal(isBriefScope("affiliate"), true);
  });

  test("un scope inventé est refusé", () => {
    // Le jour où un deuxième générateur arrive, il ne doit pas écraser
    // le brief de celui-ci par une chaîne écrite à la volée.
    assert.equal(isBriefScope("content"), false);
    assert.equal(isBriefScope("affiliation"), false);
    assert.equal(isBriefScope(""), false);
    assert.equal(isBriefScope(undefined), false);
  });
});
