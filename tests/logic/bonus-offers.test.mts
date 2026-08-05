// tests/logic/bonus-offers.test.mts
//
// Monique, 5 août 2026 :
//
//   "Mon quiz permet d'identifier quelle est l'offre la plus adaptée à la
//    personne qui le fait. Du coup, je n'ai pas une offre à proposer,
//    mais 3. Chaque profil mène vers une offre différente. Et là, le
//    bonus, même s'il peut être différent par profil, mène quand même
//    vers une seule offre. J'ai mis la promesse pour ma dernière offre,
//    parce que c'est celle que je mets en avant. Est-ce que ça ne va pas
//    paraître incohérent pour la personne dont le résultat lui propose
//    une autre de mes offres ?"
//
// Si. Et c'est le contraire exact de ce que son quiz vient de faire.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BONUS_PLANS,
  analyzeOfferCoverage,
  hasOfferPerProfile,
  isPerProfile,
  offerForProfile,
  type BonusOffer,
} from "../../lib/bonus/offers.ts";
import { buildPistesSystemPrompt, buildProductionSystemPrompt, renderBriefForPrompt, type BonusBrief } from "../../lib/prompts/bonus.ts";

const offre = (promise: string, profileIndexes: number[] = []): BonusOffer => ({
  promise,
  kind: "accompagnement ou coaching",
  price: "500 euros",
  profileIndexes,
});

// Le cas de Monique : 3 offres, 3 profils, une offre chacun.
const MONIQUE: BonusOffer[] = [
  offre("Je fais le site a ta place, cle en main", [0]),
  offre("Je t'accompagne pendant que tu le fais toi-meme", [1]),
  offre("Tu suis la formation en autonomie", [2]),
];

const brief = (over: Partial<BonusBrief> = {}): BonusBrief => ({
  offers: MONIQUE,
  trigger: "completion",
  plan: "per_profile_offer",
  quizTitle: "Quelle formule te correspond ?",
  quizIntro: "Trouve la formule adaptee a ton aisance avec le digital",
  addressForm: "tu",
  profiles: [
    { title: "La deleguante", description: "tu preferes confier" },
    { title: "L'accompagnee", description: "tu veux apprendre en faisant" },
    { title: "L'autonome", description: "tu te debrouilles seule" },
  ],
  shareTagName: "partage-quiz",
  ...over,
});

// ── Les trois plans, et la quatrième combinaison qui n'existe pas ────

test("il y a TROIS plans, pas quatre combinaisons", () => {
  // Deux reglages independants ("un bonus ou plusieurs" et "une offre ou
  // plusieurs") donneraient quatre cas, dont un INCOHERENT : un bonus
  // COMMUN qui devrait mener vers des offres DIFFERENTES. Un seul texte,
  // lu par tout le monde, ne peut pas pointer vers trois offres sans
  // redevenir le probleme de Monique.
  assert.deepEqual([...BONUS_PLANS], ["shared", "per_profile", "per_profile_offer"]);
});

test("le bonus commun ne peut PAS avoir une offre par profil", () => {
  // C'est la garantie apportee par le choix unique : la combinaison
  // impossible ne se compose pas.
  assert.equal(isPerProfile("shared"), false);
  assert.equal(hasOfferPerProfile("shared"), false);
});

test("une offre par profil implique un bonus par profil", () => {
  assert.equal(isPerProfile("per_profile_offer"), true);
  assert.equal(hasOfferPerProfile("per_profile_offer"), true);
});

test("un bonus par profil peut ne mener qu'a une seule offre", () => {
  // C'est le cas courant, et il reste le defaut d'un quiz a profils.
  assert.equal(isPerProfile("per_profile"), true);
  assert.equal(hasOfferPerProfile("per_profile"), false);
});

// ── Chaque profil reçoit SON offre ───────────────────────────────────

test("chaque profil de Monique recoit son offre a elle", () => {
  assert.match(offerForProfile("per_profile_offer", MONIQUE, 0)!.promise, /cle en main/);
  assert.match(offerForProfile("per_profile_offer", MONIQUE, 1)!.promise, /accompagne/);
  assert.match(offerForProfile("per_profile_offer", MONIQUE, 2)!.promise, /autonomie/);
});

test("hors de ce plan, c'est toujours la premiere offre", () => {
  // Il n'y en a qu'une, et c'est celle qu'elle a saisie : le numero de
  // profil ne doit rien changer.
  for (const plan of ["shared", "per_profile"] as const) {
    for (const i of [0, 1, 2, 7]) {
      assert.match(offerForProfile(plan, MONIQUE, i)!.promise, /cle en main/, `${plan} ${i}`);
    }
  }
});

test("un profil sans offre rend null, il n'emprunte pas celle du voisin", () => {
  // Emprunter, c'est exactement l'incoherence que Monique decrit : le
  // quiz dit A, le bonus vend B.
  assert.equal(offerForProfile("per_profile_offer", MONIQUE, 3), null);
});

test("une offre peut servir plusieurs profils", () => {
  // Monique a 3 offres, mais quelqu'un d'autre peut en avoir 2 pour 4
  // profils.
  const deux = [offre("La rapide", [0, 1]), offre("La complete", [2, 3])];
  assert.match(offerForProfile("per_profile_offer", deux, 1)!.promise, /rapide/);
  assert.match(offerForProfile("per_profile_offer", deux, 3)!.promise, /complete/);
  assert.equal(analyzeOfferCoverage("per_profile_offer", deux, 4).ok, true);
});

// ── On prévient AVANT de produire ────────────────────────────────────

test("un profil oublie est nomme, pas devine", () => {
  const trois = analyzeOfferCoverage("per_profile_offer", MONIQUE, 4);
  assert.equal(trois.ok, false);
  assert.deepEqual(trois.missing, [3]);
});

test("un profil dans deux offres bloque aussi", () => {
  // On ne peut pas choisir a sa place, et deviner produirait exactement
  // l'incoherence qu'on corrige.
  const c = analyzeOfferCoverage("per_profile_offer", [offre("A", [0]), offre("B", [0, 1])], 2);
  assert.equal(c.ok, false);
  assert.deepEqual(c.duplicated, [0]);
});

test("une offre qui ne sert personne est signalee sans bloquer", () => {
  // Ce n'est presque jamais volontaire : c'est un profil oublie dans une
  // case a cocher. Mais ca n'empeche pas de produire.
  const c = analyzeOfferCoverage("per_profile_offer", [offre("A", [0]), offre("B", [])], 1);
  assert.deepEqual(c.unused, [1]);
  assert.equal(c.ok, true);
});

test("hors du plan a offres multiples, il n'y a rien a couvrir", () => {
  for (const plan of ["shared", "per_profile"] as const) {
    assert.equal(analyzeOfferCoverage(plan, [offre("A")], 4).ok, true, plan);
  }
});

test("une structure inconnue ne bloque pas", () => {
  // Fail-open : on ne refuse pas sur une donnee qu'on n'a pas.
  assert.equal(analyzeOfferCoverage("per_profile_offer", MONIQUE, 0).ok, true);
});

// ── Ce que le modèle reçoit ──────────────────────────────────────────

test("le prompt du profil 1 ne parle QUE de l'offre du profil 1", () => {
  const rendu = renderBriefForPrompt(brief(), 1);
  assert.match(rendu, /accompagne/);
  assert.doesNotMatch(rendu, /cle en main/, "l'offre d'un autre profil ne doit pas fuiter");
  assert.doesNotMatch(rendu, /autonomie/);
});

test("avant de choisir un profil, le modele voit la carte complete", () => {
  // C'est ce qui permet a l'etape des pistes de proposer un format qui
  // tienne pour les trois offres.
  const rendu = renderBriefForPrompt(brief());
  assert.match(rendu, /CHAQUE PROFIL MENE VERS SA PROPRE OFFRE/);
  assert.match(rendu, /La deleguante -> Je fais le site a ta place/);
});

test("les pistes savent qu'un format doit tenir pour toutes les offres", () => {
  const p = buildPistesSystemPrompt(brief());
  assert.match(p, /CHAQUE PROFIL MENE VERS UNE OFFRE DIFFERENTE/);
  assert.match(p, /ne marcherait que pour une des offres/);
});

test("le guide dit que l'appel a l'action change d'un profil a l'autre", () => {
  // Sans ca, elle produit un seul fichier et se retrouve avec le probleme
  // du depart.
  const g = buildProductionSystemPrompt(brief(), "guide", undefined, "checklist");
  assert.match(g, /CHAQUE VERSION MENE VERS UNE OFFRE DIFFERENTE/);
  assert.match(g, /Ne laisse pas croire qu'un seul fichier suffit/);
});

test("une seule offre : rien de tout ca n'apparait", () => {
  // Le cas courant ne doit pas s'alourdir des consignes d'un cas rare.
  const p = buildPistesSystemPrompt(brief({ plan: "per_profile", offers: [offre("Une seule")] }));
  assert.doesNotMatch(p, /OFFRE DIFFERENTE/);
});

// ── L'écran, et le refus du serveur ──────────────────────────────────

test("le serveur refuse une couverture incomplete", () => {
  // L'ecran previent, mais c'est le serveur qui tranche : un bonus ecrit
  // pour un profil qui ne mene nulle part fait travailler pour rien.
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(route, /analyzeOfferCoverage/);
  assert.match(route, /reason: "offer_coverage"/);
});

test("le refus dit quoi corriger, pas seulement que ca a rate", () => {
  const src = readFileSync(new URL("../../lib/aiFailure.ts", import.meta.url), "utf8");
  assert.match(src, /case "offer_coverage"/);
  assert.match(src, /relié à une offre, et à une seule/);
});

test("cocher un profil dans une offre le retire des autres", () => {
  // Sinon on fabrique a la main l'ambiguite qu'on vient de rendre
  // bloquante.
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(client, /toggleOfferProfile/);
  assert.match(client, /profileIndexes: o\.profileIndexes\.filter\(\(x\) => x !== p\)/);
});

test("l'ecran nomme les profils sans offre", () => {
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(client, /coverage\.missing\.map\(\(i\) => profiles\[i\]\)/);
});
