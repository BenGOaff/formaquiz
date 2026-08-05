// tests/logic/bonus-generator.test.mts
//
// Le générateur de bonus post-quiz. Prompt écrit par Béné (4 août 2026),
// corrigé ensemble le 5.
//
// Ce fichier fige ce qui, sinon, se perdra au premier remaniement du
// prompt. Chaque test correspond à une décision prise avec elle, pas à
// une préférence de style.

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
  audience: "coachs bien-être qui veulent remplir leur agenda sans pub",
  niche: "coaching holistique pour femmes entrepreneures",
  tone: "direct et chaleureux, tutoiement",
  quizTheme: "Quel est ton profil de vendeuse sur Instagram ?",
  offer: "accompagnement 3 mois Agenda plein",
  trigger: "completion",
  variant: "single",
  results: [],
  ...over,
});

// ── Les 5 critères : ce qui compte le plus pour elle ─────────────────

test("les 5 critères sont un CONTROLE, pas une liste décorative", () => {
  // "Le plus important à mes yeux c'est ça." Ils vivaient en fin de
  // prompt sous forme de cases à cocher : on disait au modèle qu'ils
  // comptaient sans jamais lui faire vérifier quoi que ce soit.
  const p = buildPistesSystemPrompt(brief());
  assert.match(p, /Tu les VERIFIES avant de montrer quoi que ce soit/);
  assert.match(p, /REMPLACES ce qui en rate un au lieu de le commenter/);
  for (const c of ["UTILE", "SPECIFIQUE", "CIBLE", "APPLICABLE", "UNIQUE"]) {
    assert.match(p, new RegExp(c), `le critère ${c} doit être nommé`);
  }
});

test("les 5 critères suivent jusque dans la production", () => {
  // Les vérifier pour choisir une piste puis les oublier en écrivant le
  // contenu, c'est ne les avoir appliqués à rien.
  for (const block of PRODUCTION_BLOCKS) {
    assert.match(buildProductionSystemPrompt(brief(), block), /LES 5 CRITERES/);
  }
});

// ── La correction de Béné sur l'audit personnalisé ───────────────────

test("personnalisé est encouragé, sur mesure est signalé", () => {
  // Ma première version interdisait les formats qui coûtent son temps.
  // Béné : "sauf si on arrive à créer un système qui analyse finement les
  // réponses pour délivrer le bon bonus ?" Elle a raison : ce qui coûte
  // cher n'est pas la personnalisation, c'est l'humain dans la boucle.
  const p = buildPistesSystemPrompt(brief());
  assert.match(p, /PERSONNALISE, OUI/);
  assert.match(p, /SUR MESURE, NON/);
  assert.match(p, /\{score_<axe>\}/, "Tiquiz sait déjà personnaliser, il faut le lui dire");
  assert.match(
    p,
    /tu le DIS explicitement dans la piste/,
    "un format qui coûte son temps doit l'annoncer, pas se cacher derrière le mot personnalisé",
  );
});

test("l'audit personnalisé reste proposable", () => {
  // L'interdire aurait retiré le format le plus fort du lot.
  assert.ok(BONUS_FORMATS.includes("audit personnalisé"));
  assert.ok(BONUS_FORMATS.includes("calculateur"));
});

// ── Ce que le produit sait vraiment stocker ──────────────────────────

test("une version par profil dit OU elle atterrit", () => {
  // Vérifié dans le code de Tiquiz : les colonnes bonus vivent sur
  // `quizzes`, pas sur `quiz_results`. Sans cette phrase, la créatrice
  // reçoit quatre versions et cherche une case qui n'existe pas.
  const p = buildPistesSystemPrompt(brief({ variant: "per_result", results: ["A", "B"] }));
  assert.match(p, /ne stocke qu'UN bonus par quiz/);
  assert.match(p, /TAG SYSTEME\.IO/);
});

test("les profils partent dans le contexte quand le bonus est décliné", () => {
  const rendered = renderBriefForPrompt(brief({ variant: "per_result", results: ["La fonceuse", "La discrète"] }));
  assert.match(rendered, /MES PROFILS DE RESULTAT : La fonceuse \| La discrète/);
  assert.doesNotMatch(renderBriefForPrompt(brief()), /MES PROFILS/);
});

// ── Deux déclencheurs, deux psychologies ─────────────────────────────

test("le bonus de partage et le bonus de fin de quiz ne sont pas le même", () => {
  const completion = buildPistesSystemPrompt(brief({ trigger: "completion" }));
  const share = buildPistesSystemPrompt(brief({ trigger: "share" }));
  assert.match(completion, /il attend une SUITE/);
  assert.match(share, /vient de DONNER quelque chose/);
  assert.notEqual(completion, share);
});

test("le sujet intime ne se débloque pas par le partage", () => {
  // Règle de Jocelyne : partager publiquement sur la neuroatypie revient
  // à s'exposer. Un taux de partage bas n'y est pas un défaut du cadeau.
  const p = buildPistesSystemPrompt(brief({ trigger: "share" }));
  assert.match(p, /SUJET INTIME OU STIGMATISANT/);
  assert.match(p, /neuroatypie/);
  assert.match(p, /declenchement A LA COMPLETION/);
});

// ── La forme, et le drame du 3 août ──────────────────────────────────

test("la production se fait en trois blocs séparés", () => {
  // La campagne email est sortie en JSON brut à l'écran parce qu'une
  // réponse trop longue avait été coupée en plein milieu.
  assert.deepEqual([...PRODUCTION_BLOCKS], ["guide", "content", "presentation"]);
  for (const block of PRODUCTION_BLOCKS) {
    const p = buildProductionSystemPrompt(brief(), block);
    assert.match(p, /Tu produis UNIQUEMENT le bloc demande/);
  }
});

test("le contenu s'adapte au format, il ne devient pas de la prose", () => {
  // Rendre un calculateur sous forme de paragraphes, c'est rendre autre
  // chose que ce qui a été choisi, et c'était le format de son propre
  // exemple.
  const p = buildProductionSystemPrompt(brief(), "content");
  assert.match(p, /ADAPTE-TOI AU FORMAT/);
  assert.match(p, /la formule exacte/);
  assert.match(p, /JAMAIS de "ici tu peux ajouter/);
});

test("la route ne renvoie jamais de texte brut illisible", () => {
  // On n'affiche JAMAIS de JSON à une créatrice : elle voit notre panne
  // au lieu de son livrable.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /reason: "unreadable"/);
  assert.match(src, /console\.error\("\[bonus\] pistes illisibles/);
});

// ── Le style, et la règle absolue de Béné ────────────────────────────

test("aucun tiret cadratin dans ce qu'on donne au modèle", () => {
  // Il recopie le ton de ce qu'il reçoit, et le texte produit finit
  // sous les yeux d'une créatrice. Le prompt d'origine en contenait.
  const prompts = [
    buildPistesSystemPrompt(brief()),
    buildPistesSystemPrompt(brief({ variant: "per_result", trigger: "share", results: ["A"] })),
    ...PRODUCTION_BLOCKS.map((b) => buildProductionSystemPrompt(brief(), b)),
  ];
  for (const p of prompts) assert.ok(!/[—–]/.test(p), "un tiret cadratin a survécu");
});

test("et le prompt l'interdit explicitement", () => {
  assert.match(buildPistesSystemPrompt(brief()), /JAMAIS de tiret cadratin/);
});

// ── L'accès, le temps du test ────────────────────────────────────────

test("la page ET la route sont fermées, pas seulement la page", () => {
  // Le gate d'une page ne protège jamais une route : c'est la défense
  // en profondeur, pas de la ceinture et bretelles.
  const page = readFileSync(new URL("../../app/(app)/labo-bonus/page.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(page, /isAdminEmail/);
  assert.match(route, /isAdminEmail/);
});

test("aucun lien de navigation ne mène au labo", () => {
  // "Mets-le sur une page que les users ne connaissent pas."
  for (const f of ["../../components/AppHeader.tsx"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.doesNotMatch(src, /labo-bonus/, `${f} ne doit pas lister la page`);
  }
});
