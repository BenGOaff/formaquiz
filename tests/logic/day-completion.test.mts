// tests/logic/day-completion.test.mts
//
// Maurice, 2 août 2026 : "quand je clique sur la question 5 du jour 7,
// ça me dit : impossible de valider le jour. Réessaie dans un instant.
// Ça dure depuis hier soir, je pensais que ça se serait résolu le
// lendemain."
//
// Ça ne pouvait pas se résoudre : sa réponse partait vide en base à
// chaque fois. L'écran affichait une zone de texte, l'envoi croyait
// avoir affaire à une question à choix.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  questionInputKind,
  answerPayload,
  draftIsFilled,
} from "../../lib/questionInput.ts";

const draft = (value_text = "", value_choice = "") => ({ value_text, value_choice });

describe("Maurice : la question 5 du jour 7", () => {
  // Une consigne écrite au clavier, sans option : c'est exactement le cas
  // qui tombait entre les deux définitions de "question à choix".
  const q5 = { type: "recall", options: [] };

  test("l'élève voit une zone de texte", () => {
    assert.equal(questionInputKind(q5), "text");
  });

  test("LE BUG : son texte doit partir, pas un null", () => {
    assert.deepEqual(answerPayload(q5, draft("Compris, je partage le certificat")), {
      value_text: "Compris, je partage le certificat",
      value_choice: null,
    });
  });

  test("le champ affiché et la colonne écrite ne peuvent plus diverger", () => {
    // C'est LA propriété qui protège : quel que soit le type, si l'écran
    // montre du texte, c'est value_text qui part, et réciproquement.
    for (const type of ["action", "decision", "self_eval", "recall"]) {
      const sansOption = { type, options: [] };
      const payload = answerPayload(sansOption, draft("réponse"));
      assert.equal(questionInputKind(sansOption), "text", type);
      assert.equal(payload.value_text, "réponse", type);

      const avecOptions = { type, options: [{ value: "a", label: "A" }] };
      const kind = questionInputKind(avecOptions);
      const p2 = answerPayload(avecOptions, draft("", "a"));
      if (kind === "choice") assert.equal(p2.value_choice, "a", type);
      else assert.equal(p2.value_choice, null, type);
    }
  });

  test("une réponse écrite compte comme une réponse", () => {
    // Sinon le serveur refuse de valider le jour, pour toujours.
    assert.equal(draftIsFilled(q5, draft("ma réponse")), true);
    assert.equal(draftIsFilled(q5, draft("   ")), false);
    assert.equal(draftIsFilled(q5, null), false);
  });
});

describe("Les questions à choix continuent de marcher", () => {
  const qc = { type: "decision", options: [{ value: "oui", label: "Oui" }] };

  test("des options : des boutons, et c'est value_choice qui part", () => {
    assert.equal(questionInputKind(qc), "choice");
    assert.deepEqual(answerPayload(qc, draft("", "oui")), {
      value_text: null,
      value_choice: "oui",
    });
  });

  test("le multi-select reste une chaîne de valeurs", () => {
    assert.equal(answerPayload(qc, draft("", "oui,non")).value_choice, "oui,non");
  });

  test("une question action garde sa zone de texte même si des options traînent", () => {
    const qa = { type: "action", options: [{ value: "a", label: "A" }] };
    assert.equal(questionInputKind(qa), "text");
    assert.equal(answerPayload(qa, draft("mon action")).value_text, "mon action");
  });

  test("l'autre colonne est toujours nettoyée", () => {
    // Une question qui passe de choix à texte ne doit pas garder son
    // ancienne valeur à côté : le serveur la compterait comme une réponse.
    assert.deepEqual(answerPayload(qc, draft("vieux texte", "oui")), {
      value_text: null,
      value_choice: "oui",
    });
  });

  test("options nulles ou absentes : zone de texte, pas un plantage", () => {
    assert.equal(questionInputKind({ type: "recall", options: null }), "text");
    assert.equal(questionInputKind({ type: "recall" }), "text");
  });
});
