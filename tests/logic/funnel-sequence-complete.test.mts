// tests/logic/funnel-sequence-complete.test.mts
//
// UN PROFIL QUI N'A QU'UN SEUL EMAIL.
//
// Fabienne, 7 août 2026 : "J'ai lancé la création des 5 mails pour mes 3
// profils. A chaque fois deux des profils en ont bien 5 mais il y a
// toujours un profil qui n'en a qu'un."
//
// -- TROIS CAUSES EMPILÉES, ET LA TROISIÈME EST LA PIRE ----------------
//
// 1. LE GABARIT DU PROMPT montrait un tableau à UN SEUL email, sous le
//    titre "Format exact", juste au dessus de "EXACTEMENT 5 emails". On
//    montrait au modèle une réponse à un email en la présentant comme le
//    format à respecter.
//
// 2. LA RÉPARATION D'UNE RÉPONSE COUPÉE remontait à la dernière virgule
//    hors chaîne. Cette virgule est À L'INTÉRIEUR du dernier email
//    conservé (entre `subject` et `body`), donc elle sacrifiait un email
//    complet de plus et rendait le suivant sans corps. Mesuré : une
//    coupure au quart de la réponse ne laissait qu'UN email, vide.
//
// 3. RIEN NE VÉRIFIAIT LE COMPTE. `emails.length > 0` suffisait à
//    déclarer la séquence réussie, et le bandeau d'alerte ne repérait que
//    les profils à ZÉRO email. Fabienne n'a donc eu aucune indication :
//    elle l'a découvert en lisant.

import { test } from "node:test";
import assert from "node:assert/strict";

import { extractJson } from "../../lib/generate/aiJson.ts";
import {
  RESULT_SEQUENCE,
  isSequenceComplete,
  missingSequenceSteps,
  sequenceRank,
  sequenceSkeleton,
  sequenceGuidance,
} from "../../lib/funnelSequence.ts";

/** Une réponse de modèle réaliste : 5 emails, corps de bonne longueur. */
function reponseComplete(): string {
  return JSON.stringify({
    emails: RESULT_SEQUENCE.map((b, i) => ({
      step: i + 1,
      subject: `Objet ${i + 1}`,
      body: `${b.title}. ` + "Une phrase de contenu utile pour ce profil. ".repeat(14),
    })),
  });
}

const compte = (r: unknown) =>
  Array.isArray((r as { emails?: unknown[] })?.emails)
    ? (r as { emails: unknown[] }).emails.length
    : 0;
const avecCorps = (r: unknown) =>
  Array.isArray((r as { emails?: { body?: string }[] })?.emails)
    ? (r as { emails: { body?: string }[] }).emails.filter((e) => e.body).length
    : 0;

test("une reponse complete rend ses 5 emails", () => {
  const r = extractJson(reponseComplete());
  assert.equal(compte(r), RESULT_SEQUENCE.length);
  assert.equal(avecCorps(r), RESULT_SEQUENCE.length);
});

test("une reponse coupee garde TOUS les emails entiers, avec leur corps", () => {
  // C'est le coeur du retour de Fabienne. L'ancienne reparation coupait a
  // la derniere virgule hors chaine, donc amputait toujours un email de
  // plus. Ici, tout email termine doit ressortir COMPLET.
  const complet = reponseComplete();
  for (const part of [0.25, 0.35, 0.5, 0.65, 0.8, 0.95]) {
    const tronque = complet.slice(0, Math.floor(complet.length * part));
    const r = extractJson(tronque);
    const n = compte(r);
    assert.ok(n >= 1, `coupure a ${part * 100}% : plus aucun email`);
    assert.equal(
      avecCorps(r),
      n,
      `coupure a ${part * 100}% : ${n - avecCorps(r)} email(s) sans corps`,
    );
  }
});

test("une coupure tardive ne fait pas retomber a un seul email", () => {
  // Le symptome exact : deux profils a 5, un profil a 1. Une reponse
  // coupee aux trois quarts doit rendre PLUSIEURS emails, jamais un.
  const complet = reponseComplete();
  const r = extractJson(complet.slice(0, Math.floor(complet.length * 0.75)));
  assert.ok(compte(r) >= 3, `attendu au moins 3 emails, obtenu ${compte(r)}`);
});

test("les temps manquants sont nommes, pas seulement comptes", () => {
  const seq = [{ step: 1 }, { step: 2 }, { step: 5 }];
  assert.deepEqual(missingSequenceSteps(seq), [3, 4]);
  assert.equal(isSequenceComplete(seq), false);

  const pleine = RESULT_SEQUENCE.map((_, i) => ({ step: i + 1 }));
  assert.deepEqual(missingSequenceSteps(pleine), []);
  assert.equal(isSequenceComplete(pleine), true);
});

test("un rang en double ne comble pas un trou", () => {
  // Cinq emails dont deux au meme rang, ce n'est pas une sequence
  // complete : compter les emails aurait dit oui.
  const seq = [{ step: 1 }, { step: 2 }, { step: 2 }, { step: 3 }, { step: 4 }];
  assert.equal(seq.length, RESULT_SEQUENCE.length);
  assert.equal(isSequenceComplete(seq), false);
  assert.deepEqual(missingSequenceSteps(seq), [5]);
});

test("un seul email n'est PAS une sequence reussie", () => {
  // La regle qui manquait : `emails.length > 0` declarait ce cas gagne.
  assert.equal(isSequenceComplete([{ step: 1 }]), false);
});

test("le libelle d'un email suit son RANG, pas sa place dans la liste", () => {
  // Sequence incomplete : il manque le temps 2. L'email suivant est le
  // temps 3, et il doit s'afficher comme tel. Avec l'index, il portait le
  // nom du temps 2 (meme defaut que le funnel d'Adeline : une position
  // qui sert d'identite).
  const seq = [{ step: 1 }, { step: 3 }, { step: 4 }];
  assert.equal(sequenceRank(seq[1], 1), 3);
  assert.equal(sequenceRank(seq[2], 2), 4);
  // Repli pour les campagnes ecrites avant qu'on enregistre le rang.
  assert.equal(sequenceRank({ step: null }, 0), 1);
  assert.equal(sequenceRank({}, 2), 3);
});

test("le gabarit du prompt montre les 5 emails, pas un", () => {
  // LA cause premiere. Un prompt est du code : son exemple ne doit jamais
  // contredire sa consigne (meme lecon que le prompt quiz de Tiquiz).
  const gabarit = sequenceSkeleton();
  const parsed = extractJson(gabarit) as { emails?: unknown[] } | null;
  assert.ok(parsed, "le gabarit montre au modele un JSON invalide");
  assert.equal(
    parsed!.emails?.length,
    RESULT_SEQUENCE.length,
    "le gabarit ne montre pas les 5 entrees : le modele peut s'arreter avant",
  );
  // Les rangs y sont explicites et distincts.
  const steps = (parsed!.emails as { step: number }[]).map((e) => e.step);
  assert.deepEqual(steps, RESULT_SEQUENCE.map((_, i) => i + 1));
});

test("le gabarit suit la sequence si on lui ajoute un temps", () => {
  // Il est DERIVE de RESULT_SEQUENCE : personne ne peut le laisser
  // derriere en ajoutant un 6e temps.
  assert.equal(
    (sequenceSkeleton().match(/"step":/g) ?? []).length,
    RESULT_SEQUENCE.length,
  );
  assert.equal(
    (sequenceGuidance().split("\n") ?? []).length,
    RESULT_SEQUENCE.length,
  );
});

test("aucun tiret cadratin dans ce qui est ecrit au modele", () => {
  // Regle Béné du 7 juin : ce que le prompt MONTRE, le modele le recopie.
  for (const bloc of [sequenceSkeleton(), sequenceGuidance()]) {
    assert.ok(!/[—–]/.test(bloc), `tiret long dans le prompt : ${bloc.slice(0, 80)}`);
  }
  for (const b of RESULT_SEQUENCE) {
    assert.ok(!/[—–]/.test(b.title + b.intent), `tiret long dans "${b.title}"`);
  }
});
