// tests/logic/ai-failure.test.mts
//
// Béné, 5 août 2026 : "la génération du contenu a échoué :
// api/me/bonus:1 Failed to load resource: the server responded with a
// status of 502".
//
// Un 502 nu pour quatre causes différentes, et la même phrase à l'écran
// pour les quatre. Elle ne pouvait ni savoir s'il fallait attendre, ni
// savoir si relancer servait à quelque chose.
//
// Ce fichier fige la traduction "ce qui s'est passé" -> "ce qu'elle
// doit faire".

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  classifyThrown,
  classifyUpstream,
  failureCopy,
  isRetryable,
  statusFor,
} from "../../lib/aiFailure.ts";

// ── Ce qui vient d'en face ───────────────────────────────────────────

test("une saturation est transitoire, donc on peut relancer", () => {
  for (const s of [429, 529, 500, 502, 503]) {
    assert.equal(classifyUpstream(s), "busy", String(s));
    assert.equal(isRetryable("busy"), true);
  }
});

test("un refus ne se relance pas dix fois", () => {
  // 400 / 401 / 404 viennent de ce qu'ON a envoyé : relancer à
  // l'identique redonnera exactement la même erreur.
  for (const s of [400, 401, 403, 404, 413, 422]) {
    assert.equal(classifyUpstream(s), "refused", String(s));
  }
  assert.equal(isRetryable("refused"), false);
});

// ── Ce qui vient de chez nous ────────────────────────────────────────

test("notre propre minuteur se reconnait, et ne passe plus pour une panne", () => {
  // C'est LE cas qui manquait : sans catch, l'abort remontait en
  // exception non gérée et sortait en 500 opaque.
  const timeout = Object.assign(new Error("The operation was aborted"), {
    name: "TimeoutError",
  });
  assert.equal(classifyThrown(timeout), "too_long");

  const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
  assert.equal(classifyThrown(abort), "too_long");
});

test("tout le reste est un probleme de liaison", () => {
  assert.equal(classifyThrown(new TypeError("fetch failed")), "unreachable");
  assert.equal(classifyThrown(null), "unreachable");
  assert.equal(classifyThrown("boum"), "unreachable");
});

// ── Ce que la console montre, et ce que l'ecran dit ──────────────────

test("le statut dit deja de quelle famille on parle", () => {
  // Meme sans le corps de la reponse, une console de navigateur devient
  // informative : 503 = c'est sature, 504 = c'etait trop long.
  assert.equal(statusFor("busy"), 503);
  assert.equal(statusFor("too_long"), 504);
  assert.equal(statusFor("refused"), 502);
  assert.equal(statusFor("unreachable"), 502);
  assert.equal(statusFor("empty"), 502);
});

test("chaque cause a SA phrase, et elles disent quoi faire", () => {
  const causes = ["busy", "too_long", "unreachable", "refused", "unreadable", "no_quiz"];
  const phrases = causes.map((c) => failureCopy(c));
  assert.equal(new Set(phrases).size, causes.length, "aucune phrase recyclee");
  for (const p of phrases) {
    assert.ok(p.length > 30, p);
    assert.doesNotMatch(p, /[—–]/, "regle anti-IA : aucun tiret cadratin");
  }
  // La saturation dit d'attendre, pas de relancer tout de suite.
  assert.match(failureCopy("busy"), /minute/);
});

test("une raison inconnue ne laisse jamais l'ecran muet", () => {
  for (const r of ["", "quelque_chose_de_nouveau", "undefined"]) {
    assert.ok(failureCopy(r).length > 20, r);
  }
});

test("la phrase nomme le bloc concerne quand on le sait", () => {
  // Trois blocs, deux reussis, un rate : sans le nom, elle ne sait pas
  // lequel relancer.
  assert.match(failureCopy("busy", "Le contenu du bonus"), /^Le contenu du bonus : /);
  assert.doesNotMatch(failureCopy("busy"), /^ : /);
});

// ── Et la route s'en sert vraiment ───────────────────────────────────

test("la route ne renvoie plus un 502 unique pour tout", () => {
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /statusFor\(/, "le statut vient de la regle");
  assert.doesNotMatch(
    src,
    /reason: "generation_failed"/,
    "plus de raison fourre-tout : chaque echec se nomme",
  );
});

test("l'appel a Anthropic est protege par un catch", () => {
  // Sans lui, une coupure de notre minuteur sort en 500 non gere : c'est
  // exactement ce qui rendait le diagnostic impossible.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  const call = src.slice(src.indexOf("async function callOnce"), src.indexOf("async function callClaude"));
  assert.match(call, /try \{[\s\S]*await fetch\(/, "le fetch est dans un try");
  assert.match(call, /classifyThrown\(err\)/);
});

test("le budget de temps est partage avec la reprise", () => {
  // Deux minuteurs de 85 s bout a bout = 170 s = une page 524 de
  // Cloudflare, que nous ne controlons pas.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /budgetLeft\(\)/);
  assert.doesNotMatch(src, /AbortSignal\.timeout\(85_000\)/, "plus de minuteur fixe par appel");
});

test("l'ecran passe par la meme regle que le serveur", () => {
  const src = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /failureCopy\(/);
  assert.match(src, /data\.truncated/, "un texte coupe est signale, jamais avale");
});
