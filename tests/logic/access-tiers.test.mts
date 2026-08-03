// tests/logic/access-tiers.test.mts
//
// Campagne pub, 3 août 2026. Béné : "il faut que ce soit fiable pour que
// je n'aie pas de bugs dès que ça va commencer."
//
// Ce fichier est le filet de cette phrase. Chaque test décrit un scénario
// qui COÛTE de l'argent ou la confiance d'un client s'il tombe :
//   - un élève existant qui perd un accès qu'il avait payé ;
//   - un client à 47 € rétrogradé par un webhook rejoué ;
//   - le produit à 47 € donné à quelqu'un qui a payé 7 €.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ADS_PLUS_TRIAL_DAYS,
  canAccessBonusDays,
  canAccessSection,
  includesPlusTrial,
  isPlusOnlySection,
  mergeTier,
  resolveTier,
} from "../../lib/access/tiers.ts";

// ── Les élèves existants ne perdent rien ────────────────────────────

test("un enrollment sans palier vaut PLUS : les élèves d'avant gardent tout", () => {
  // C'est le scénario le plus coûteux du lot. Tous les élèves actuels ont
  // payé l'Atelier complet et leurs lignes n'ont pas de palier.
  assert.equal(resolveTier(null), "plus");
  assert.equal(resolveTier(undefined), "plus");
  assert.equal(resolveTier(""), "plus");
});

test("une valeur illisible ouvre tout, elle ne verrouille jamais", () => {
  // Migration pas encore passée, typo, vieille ligne : on préfère un
  // accès trop large (rattrapable en une requête) à un client lésé.
  assert.equal(resolveTier("nawak"), "plus");
  assert.equal(resolveTier("STANDARD"), "plus");
  assert.equal(resolveTier("Standard"), "plus");
});

test("seule la valeur exacte 'standard' restreint", () => {
  assert.equal(resolveTier("standard"), "standard");
  assert.equal(resolveTier("plus"), "plus");
});

// ── Le palier ne redescend jamais tout seul ─────────────────────────

test("l'upsell 47 € fait monter le palier", () => {
  assert.equal(mergeTier("standard", "plus"), "plus");
});

test("un webhook 7 € rejoué NE rétrograde PAS un client à 47 €", () => {
  // Systeme.io réessaie et réordonne. Si l'upsell arrive avant l'achat,
  // ou si le webhook 7 € double, un écrasement naïf ferait perdre à un
  // client qui vient de payer le prix fort ce qu'il vient d'acheter.
  assert.equal(mergeTier("plus", "standard"), "plus");
});

test("un premier achat pose son palier tel quel", () => {
  assert.equal(mergeTier(null, "standard"), "standard");
  assert.equal(mergeTier(undefined, "plus"), "plus");
});

test("rejouer le même achat ne change rien", () => {
  assert.equal(mergeTier("standard", "standard"), "standard");
  assert.equal(mergeTier("plus", "plus"), "plus");
});

// ── Ce qui est verrouillé, et surtout ce qui ne l'est pas ───────────

test("la Campagne est réservée au palier 47 €", () => {
  assert.equal(isPlusOnlySection("/funnel"), true);
  assert.equal(canAccessSection("standard", "/funnel"), false);
  assert.equal(canAccessSection("plus", "/funnel"), true);
});

test("tout ce qui est vendu à 7 € reste ouvert", () => {
  // La formation, le carnet, les avancées, le Quiz Doctor, le certificat
  // et l'affiliation sont dans l'offre à 7 €. Les verrouiller ferait
  // exactement le bug que Béné redoute au lancement.
  for (const p of [
    "/dashboard",
    "/jour/3",
    "/carnet",
    "/avancees",
    "/diagnostic",
    "/certificat",
    "/affiliation",
    "/profil",
  ]) {
    assert.equal(canAccessSection("standard", p), true, `${p} doit rester ouvert à 7 €`);
  }
});

test("le verrou porte sur le SEGMENT, pas sur le préfixe brut", () => {
  // Sans ça, verrouiller "/funnel" verrouillerait un futur
  // "/funnel-public" ou "/funnels" sans que personne l'ait décidé.
  assert.equal(isPlusOnlySection("/funnel-public"), false);
  assert.equal(isPlusOnlySection("/funnels"), false);
  // ...mais les sous-pages de la section, elles, suivent.
  assert.equal(isPlusOnlySection("/funnel/emails"), true);
});

test("la query string et le slash final ne trompent pas le verrou", () => {
  assert.equal(isPlusOnlySection("/funnel/"), true);
  assert.equal(isPlusOnlySection("/funnel?from=nav"), true);
  assert.equal(isPlusOnlySection("funnel"), true);
});

// ── L'essai Tiquiz Plus de la campagne ──────────────────────────────

test("la campagne offre 15 jours, pas les 2 mois de l'opération des 20 places", () => {
  assert.equal(ADS_PLUS_TRIAL_DAYS, 15);
});

// ── Les bonus (jours is_bonus) ──────────────────────────────────────

test("les bonus sont réservés au palier 47 €", () => {
  // Béné : "pour les 7 € tout sauf les 15 jours gratuits à Tiquiz, les
  // bonus quand tu veux et le /funnel."
  assert.equal(canAccessBonusDays("standard"), false);
  assert.equal(canAccessBonusDays("plus"), true);
});

test("les jours du PARCOURS restent ouverts à 7 €", () => {
  // Seuls les jours marqués is_bonus sont verrouillés. Verrouiller
  // "/jour" en bloc couperait la formation elle-même, qui est le produit
  // vendu à 7 €.
  assert.equal(canAccessSection("standard", "/jour/1"), true);
  assert.equal(canAccessSection("standard", "/jour/7"), true);
});

test("les 15 jours de Tiquiz Plus ne sont inclus qu'à 47 €", () => {
  assert.equal(includesPlusTrial("standard"), false);
  assert.equal(includesPlusTrial("plus"), true);
});
