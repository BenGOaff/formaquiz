// tests/logic/funnel-sequences.test.mts
//
// Fabienne, 4 août 2026 : "j'ai créé mes 3 tags, les 3 campagnes et les
// 3 workflows, et quand je demande à générer les mails il ne peut en
// faire qu'un ou parfois 2, mais jamais les 3." Béné : "idem, il m'en
// crée seulement deux."
//
// Le "parfois 2" est toute l'information : un bug de code donnerait
// toujours le même nombre. Deux causes empilées, et la deuxième est
// celle qui les faisait tourner en rond.
//
// 1. Les trois demandes partaient EN MÊME TEMPS, chacune pour 8000
//    tokens. L'API refuse les appels en trop avec un 429, et on
//    traitait ce refus comme définitif.
// 2. L'enregistrement REMPLAÇAIT toute la liste. Donc "relance pour
//    compléter" écrivait par-dessus : deux profils réussis au deuxième
//    essai effaçaient les trois du premier.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isRetryableStatus, MAX_ATTEMPTS, retryDelayMs } from "../../lib/generate/retry.ts";
import { mergeSequencesByProfile, type SequenceEmail } from "../../lib/generate/mergeSequences.ts";

const mail = (result: string, step: number): SequenceEmail => ({
  result,
  step,
  subject: `${result} ${step}`,
  body: `corps ${result} ${step}`,
});
const seq = (result: string): SequenceEmail[] => [1, 2, 3, 4, 5].map((s) => mail(result, s));

// ── Un refus temporaire n'est pas un échec ───────────────────────────

test("un 429 se réessaie, c'est une limite de débit", () => {
  assert.equal(isRetryableStatus(429), true);
});

test("une surcharge ou un incident passager aussi", () => {
  for (const s of [500, 502, 503, 504, 529]) {
    assert.equal(isRetryableStatus(s), true, `${s} doit être réessayé`);
  }
});

test("une clé refusée ou une requête invalide ne se réessaient PAS", () => {
  // Insister ne changerait rien et ferait patienter pour rien.
  for (const s of [400, 401, 403, 404, 413, 422]) {
    assert.equal(isRetryableStatus(s), false, `${s} ne doit pas être réessayé`);
  }
});

test("l'attente s'allonge à chaque tentative", () => {
  const first = retryDelayMs(1);
  const second = retryDelayMs(2);
  assert.ok(second > first, "sinon on retape aussitôt dans le même mur");
  assert.ok(retryDelayMs(99) <= 20_000, "et elle reste bornée");
});

test("le fournisseur a le dernier mot sur le délai", () => {
  // Lui seul sait quand sa fenêtre se rouvre.
  assert.equal(retryDelayMs(1, "5"), 5000);
  assert.equal(retryDelayMs(1, "n'importe quoi"), retryDelayMs(1));
});

test("on ne réessaie pas indéfiniment", () => {
  assert.ok(MAX_ATTEMPTS >= 2 && MAX_ATTEMPTS <= 5);
});

// ── Relancer ne doit RIEN détruire ───────────────────────────────────

test("le scénario exact de Fabienne : 2 réussis puis on complète", () => {
  // Premier essai : seuls "Le Bâtisseur" et "L'Explorateur" passent.
  const first = mergeSequencesByProfile([], [...seq("Le Bâtisseur"), ...seq("L'Explorateur")]);
  assert.equal(new Set(first.map((e) => e.result)).size, 2);

  // Elle relance. Cette fois seul le troisième aboutit.
  const second = mergeSequencesByProfile(first, seq("La Rêveuse"), [
    "Le Bâtisseur",
    "L'Explorateur",
    "La Rêveuse",
  ]);

  // Les trois sont là. Avant, les deux premiers étaient effacés.
  assert.deepEqual(
    [...new Set(second.map((e) => e.result))],
    ["Le Bâtisseur", "L'Explorateur", "La Rêveuse"],
  );
  assert.equal(second.length, 15, "5 emails par profil");
});

test("regénérer un profil remplace le sien, et lui seul", () => {
  const current = [...seq("A"), ...seq("B")];
  const refait: SequenceEmail[] = [{ result: "A", step: 1, subject: "neuf", body: "neuf" }];
  const out = mergeSequencesByProfile(current, refait);
  assert.deepEqual(out.filter((e) => e.result === "A"), refait, "A est remplacé en entier");
  assert.equal(out.filter((e) => e.result === "B").length, 5, "B n'a pas bougé");
});

test("un profil renommé ou supprimé ne traîne pas", () => {
  // Sinon l'élève garde pour toujours une séquence sous un nom qu'il ne
  // reconnaît plus (même règle que la distribution par résultat : la
  // vérité, ce sont les profils ACTUELS).
  const current = [...seq("Ancien nom"), ...seq("B")];
  const out = mergeSequencesByProfile(current, seq("B"), ["B"]);
  assert.deepEqual([...new Set(out.map((e) => e.result))], ["B"]);
});

test("sans liste de profils actuels, on ne supprime rien", () => {
  // Fail-open : mieux vaut une séquence en trop qu'une séquence perdue.
  const current = [...seq("A"), ...seq("B")];
  const out = mergeSequencesByProfile(current, seq("B"));
  assert.equal(new Set(out.map((e) => e.result)).size, 2);
});

test("l'ordre suit celui du quiz", () => {
  const current = [...seq("C"), ...seq("A")];
  const out = mergeSequencesByProfile(current, [], ["A", "B", "C"]);
  assert.deepEqual([...new Set(out.map((e) => e.result))], ["A", "C"]);
});

test("une majuscule ou une espace de bord ne crée pas un doublon", () => {
  const out = mergeSequencesByProfile(seq("Le Bâtisseur"), seq("  le bâtisseur "));
  assert.equal(new Set(out.map((e) => e.result.trim().toLowerCase())).size, 1);
  assert.equal(out.length, 5, "l'ancien a bien été remplacé, pas empilé");
});

test("une campagne d'avant le 3 août, sans rang, passe sans casser", () => {
  const vieux = [{ result: "A", subject: "s", body: "b" }] as SequenceEmail[];
  assert.doesNotThrow(() => mergeSequencesByProfile(vieux, seq("B")));
});

// ── Les garde-fous structurels ───────────────────────────────────────

test("les profils sont écrits UN PAR UN, plus en même temps", () => {
  const src = readFileSync(new URL("../../app/(app)/funnel/FunnelClient.tsx", import.meta.url), "utf8");
  assert.ok(
    !/Promise\.all\(\s*titles\.map/.test(src),
    "trois appels de 8000 tokens en parallèle, c'est la cause du 429",
  );
  assert.ok(/for \(const \[i, title\] of titles\.entries\(\)\)/.test(src));
  assert.ok(/knownProfiles: titles/.test(src), "le serveur doit savoir quoi garder");
});

test("l'appel au modèle réessaie vraiment", () => {
  const src = readFileSync(new URL("../../lib/generate/funnel.ts", import.meta.url), "utf8");
  assert.ok(/isRetryableStatus\(res\.status\)/.test(src));
  assert.ok(/retryDelayMs\(attempt/.test(src));
});

test("l'enregistrement fusionne au lieu de remplacer", () => {
  const src = readFileSync(new URL("../../lib/generate/funnel.ts", import.meta.url), "utf8");
  assert.ok(/mergeSequencesByProfile\(/.test(src), "sinon relancer détruit ce qui marchait");
});
