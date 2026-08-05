// tests/logic/bonus-generator.test.mts
//
// Le générateur de bonus post-quiz. Prompt écrit par Béné (4 août 2026),
// corrigé le 5 après son premier vrai test.
//
// Chaque test correspond à une décision prise avec elle, pas à une
// préférence de style.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BONUS_FORMATS,
  PRODUCTION_BLOCKS,
  buildPistesSystemPrompt,
  buildProductionSystemPrompt,
  renderBriefForPrompt,
  type BonusBrief,
} from "../../lib/prompts/bonus.ts";

const brief = (over: Partial<BonusBrief> = {}): BonusBrief => ({
  // Ce que la creatrice saisit, et c'est TOUT ce qu'elle saisit.
  offerPromise:
    "J'aide les personnes TDAH a apaiser leur stress quotidien en 1 mois grace a des techniques simples",
  offerKind: "formation en ligne",
  offerPrice: "97 euros",
  trigger: "completion",
  variant: "single",
  // Repris du quiz suivi.
  quizTitle: "Quel est ton profil de vendeuse sur Instagram ?",
  quizIntro: "Decouvre ce qui bloque tes ventes en 3 minutes",
  addressForm: "tu",
  profiles: [
    { title: "La fonceuse", description: "tu publies beaucoup, tu vends peu" },
    { title: "La discrete", description: "tu n'oses pas proposer" },
  ],
  shareTagName: "partage-quiz",
  ...over,
});

// ── Les 5 critères : ce qui compte le plus pour elle ─────────────────

test("les 5 critères sont un CONTROLE, pas une liste décorative", () => {
  const p = buildPistesSystemPrompt(brief());
  assert.match(p, /Tu les VERIFIES avant de montrer quoi que ce soit/);
  assert.match(p, /REMPLACES ce qui en rate un au lieu de le commenter/);
  for (const c of ["UTILE", "SPECIFIQUE", "CIBLE", "APPLICABLE", "UNIQUE"]) {
    assert.match(p, new RegExp(c), `le critère ${c} doit être nommé`);
  }
});

test("les 5 critères suivent jusque dans la production", () => {
  for (const block of PRODUCTION_BLOCKS) {
    assert.match(buildProductionSystemPrompt(brief(), block), /LES 5 CRITERES/);
  }
});

// ── On ne redemande plus ce que le quiz sait déjà ────────────────────

test("le contexte est rempli par le quiz, pas par la créatrice", () => {
  // "On ne réutilise pas assez les données du quiz : pourquoi ne pas
  // prendre le quiz suivi par l'Atelier et récupérer toutes ces infos
  // automatiquement ?" Et "mon audience" / "ma niche" n'étaient même pas
  // différenciables.
  const rendered = renderBriefForPrompt(brief());
  assert.match(rendered, /Quel est ton profil de vendeuse sur Instagram/);
  assert.match(rendered, /La fonceuse/);
  assert.match(rendered, /J'aide les personnes TDAH/);
  assert.match(rendered, /FORMAT DE L'OFFRE : formation en ligne/);
  assert.match(rendered, /PRIX : 97 euros/);
});

test("le ton vient du quiz, il ne se redemande pas", () => {
  assert.match(buildPistesSystemPrompt(brief()), /tu TUTOIES le lecteur, comme le quiz/);
  assert.match(
    buildPistesSystemPrompt(brief({ addressForm: "vous" })),
    /tu VOUVOIES le lecteur, comme le quiz/,
  );
});

test("la creatrice ne saisit que ce que le quiz ignore", () => {
  // Trois champs, et trois seulement : la promesse de l'offre, son
  // format, son prix. Plus les deux choix (declencheur, decline ou non).
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  const schema = route.slice(route.indexOf("const briefSchema"), route.indexOf("const schema ="));
  for (const champ of ["offerPromise", "offerKind", "offerPrice", "trigger", "variant"]) {
    assert.ok(schema.includes(champ), `${champ} doit etre saisi`);
  }
  for (const repris of ["quizTitle", "addressForm", "profiles", "shareTagName", "audience", "niche"]) {
    assert.ok(!schema.includes(repris), `${repris} ne doit PAS venir du client`);
  }
});

// ── Un bonus par profil, écrit un profil à la fois ───────────────────

test("quand le bonus est décliné, on écrit pour UN profil à la fois", () => {
  // Le premier contenu généré traitait les quatre profils dans un seul
  // document ("si ta fuite c'est le trafic... si c'est la capture...").
  // Le visiteur devait chercher sa section dans un catalogue : ça rate
  // trois des cinq critères d'un coup (ciblé, applicable, unique).
  const un = renderBriefForPrompt(brief({ variant: "per_result" }), 0);
  assert.match(un, /LE PROFIL POUR LEQUEL TU ECRIS, ET LUI SEUL/);
  assert.match(un, /La fonceuse/);
  assert.doesNotMatch(un, /La discrete/);

  const p = buildProductionSystemPrompt(brief({ variant: "per_result" }), "content", 0);
  assert.match(p, /TU ECRIS POUR UN SEUL PROFIL/);
  assert.match(p, /INTERDIT d'ecrire "si ton cas c'est X/);
});

test("sans déclinaison, le contenu reste commun", () => {
  const p = buildProductionSystemPrompt(brief(), "content");
  assert.doesNotMatch(p, /TU ECRIS POUR UN SEUL PROFIL/);
});

// ── La livraison, la vraie ───────────────────────────────────────────

test("la livraison passe par le TAG, jamais par un lien collé dans un résultat", () => {
  // "Ben non" (Béné, 5 août 2026) : le fichier vit sur un drive, et
  // c'est une automatisation Systeme.io sur le tag qui envoie l'email.
  const guide = buildProductionSystemPrompt(brief({ trigger: "share" }), "guide");
  assert.match(guide, /Tag ajoute a un contact/);
  assert.match(guide, /partage-quiz/, "le vrai nom du tag du quiz est repris");
  assert.match(guide, /N'ECRIS JAMAIS qu'il faut coller le lien dans les resultats/);
});

test("le piège du lien de drive restreint est nommé", () => {
  // La créatrice ne le verra JAMAIS : elle, elle a accès au fichier.
  const guide = buildProductionSystemPrompt(brief(), "guide");
  assert.match(guide, /tout le monde avec le lien/);
  assert.match(guide, /la creatrice ne le verra jamais/);
});

test("le tag change selon le déclencheur", () => {
  assert.match(buildProductionSystemPrompt(brief({ trigger: "share" }), "guide"), /tag de partage/);
  assert.match(
    buildProductionSystemPrompt(brief({ trigger: "completion", variant: "per_result" }), "guide"),
    /tag Systeme\.io du profil obtenu/,
  );
});

// ── La correction de Béné sur l'audit personnalisé ───────────────────

test("personnalisé est encouragé, sur mesure est signalé", () => {
  const p = buildPistesSystemPrompt(brief());
  assert.match(p, /PERSONNALISE, OUI/);
  assert.match(p, /SUR MESURE, NON/);
  assert.match(p, /tu le DIS explicitement dans la piste/);
});

test("l'audit personnalisé reste proposable", () => {
  assert.ok(BONUS_FORMATS.includes("audit personnalisé"));
  assert.ok(BONUS_FORMATS.includes("calculateur"));
});

// ── Deux déclencheurs, deux psychologies ─────────────────────────────

test("le bonus de partage et le bonus de fin de quiz ne sont pas le même", () => {
  const completion = buildPistesSystemPrompt(brief({ trigger: "completion" }));
  const share = buildPistesSystemPrompt(brief({ trigger: "share" }));
  assert.match(completion, /il attend une SUITE/);
  assert.match(share, /vient de DONNER quelque chose/);
});

test("le sujet intime ne se débloque pas par le partage", () => {
  const p = buildPistesSystemPrompt(brief({ trigger: "share" }));
  assert.match(p, /SUJET INTIME OU STIGMATISANT/);
  assert.match(p, /declenchement A LA COMPLETION/);
});

// ── Le rendu, et le drame du 3 août ──────────────────────────────────

test("le rendu est structuré, pas un pavé", () => {
  // "Ce bloc de texte c'est indigeste, on a les moyens de faire BEAUCOUP
  // plus facile à lire."
  for (const block of PRODUCTION_BLOCKS) {
    const p = buildProductionSystemPrompt(brief(), block);
    assert.match(p, /MISE EN FORME, et elle compte autant que le fond/);
    assert.match(p, /Un pave de texte ne se lit pas/);
  }
  assert.match(buildProductionSystemPrompt(brief(), "guide"), /## Comment il arrive chez ton visiteur/);
});

test("la production se fait en trois blocs séparés", () => {
  assert.deepEqual([...PRODUCTION_BLOCKS], ["guide", "content", "presentation"]);
  for (const block of PRODUCTION_BLOCKS) {
    assert.match(buildProductionSystemPrompt(brief(), block), /Tu produis UNIQUEMENT le bloc demande/);
  }
});

test("le contenu s'adapte au format, il ne devient pas de la prose", () => {
  const p = buildProductionSystemPrompt(brief(), "content");
  assert.match(p, /ADAPTE-TOI AU FORMAT/);
  assert.match(p, /la formule exacte/);
});

test("la route ne renvoie jamais de texte brut illisible", () => {
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /reason: "unreadable"/);
});

test("sans quiz relié, la route refuse et le dit", () => {
  // Un refus n'est pas une panne : 409, avec une raison exploitable.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /reason: "no_quiz" \}, \{ status: 409 \}/);
});

// ── Le style, et la règle absolue de Béné ────────────────────────────

test("aucun tiret cadratin dans ce qu'on donne au modèle", () => {
  const prompts = [
    buildPistesSystemPrompt(brief()),
    buildPistesSystemPrompt(brief({ variant: "per_result", trigger: "share" })),
    ...PRODUCTION_BLOCKS.map((b) => buildProductionSystemPrompt(brief(), b)),
  ];
  for (const p of prompts) assert.ok(!/[—–]/.test(p), "un tiret cadratin a survécu");
});

// ── L'accès, le temps du test ────────────────────────────────────────

test("la page ET la route sont fermées, pas seulement la page", () => {
  const page = readFileSync(new URL("../../app/(app)/labo-bonus/page.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(page, /isAdminEmail/);
  assert.match(route, /isAdminEmail/);
});

test("aucun jargon interne ne fuite dans l'interface", () => {
  // "Tu penseras à enlever ce genre de choses pour les users : un bloc à
  // la fois, ça ne peut pas se couper en plein milieu comme la campagne
  // email en juillet." Nos drames internes n'ont rien a faire a l'ecran.
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  // On ne regarde que le JSX rendu, pas les commentaires du fichier.
  const jsx = client.slice(client.indexOf("return ("));
  for (const mot of ["campagne email", "JSON", "juillet", "en test", "non listée"]) {
    assert.ok(!jsx.includes(mot), `"${mot}" ne doit pas etre affiche`);
  }
});
