// tests/logic/bonus-second-chance.test.mts
//
// LA DEUXIÈME CHANCE : commander les bonus hors de son tunnel d'origine.
//
// Béné, 7 août 2026 : "il faut aussi anticiper ceux qui vont commander la
// mise à jour avec un autre email que celui qu'ils ont utilisé pour
// l'atelier, même si je les préviens sur le bon de commande."
//
// -- LE PIÈGE, ET C'EST TOUT L'OBJET DE CE FICHIER ---------------------
//
// "Cette adresse n'a aucun compte" veut dire DEUX CHOSES OPPOSÉES selon le
// bon de commande :
//
//   tunnel pub      -> normal. L'upsell part parfois avant l'achat à 7 €
//                      (deux automatisations, deux files) et crée le compte.
//   deuxième chance -> anormal. La page vend à des élèves déjà inscrits,
//                      donc l'adresse ne correspond pas à leur compte.
//
// Une logique écrite pour un cas et appliquée telle quelle à l'autre : le
// défaut exact qui a produit le funnel d'Adeline et la fausse alerte de
// Véronique. D'où un PARAMÈTRE obligatoire, jamais une déduction interne.

import { test } from "node:test";
import assert from "node:assert/strict";

import { bonusOrderEmailKind, isOrphanBonusOrder } from "../../lib/access/bonusOrder.ts";
import {
  bonusEmailMismatchEmail,
  bonusUnlockedEmail,
  bonusMismatchAdminEmail,
} from "../../lib/email/templates.ts";

test("sur le tunnel pub, un compte inexistant est NORMAL", () => {
  // Si ce test rougit, chaque acheteur du tunnel pub recoit l'email
  // "verifie ton adresse" alors que tout va bien, et Béné recoit une
  // alerte par vente.
  assert.equal(isOrphanBonusOrder(false, { created: true, previousTier: null }), false);
  assert.equal(isOrphanBonusOrder(false, { created: false, previousTier: "standard" }), false);
});

test("sur la deuxieme chance, un compte cree signale une autre adresse", () => {
  assert.equal(isOrphanBonusOrder(true, { created: true, previousTier: null }), true);
});

test("un compte qui existe SANS achat compte aussi comme orphelin", () => {
  // Le cas qu'on rate en ne regardant que `created` : quelqu'un qui s'etait
  // inscrit sans jamais acheter, ou une adresse connue par un autre
  // produit. Le compte existe, mais ce n'est pas celui de son Atelier.
  assert.equal(isOrphanBonusOrder(true, { created: false, previousTier: null }), true);
  assert.equal(isOrphanBonusOrder(true, { created: false, previousTier: undefined }), true);
});

test("un eleve deja inscrit qui achete ses bonus n'est PAS un cas douteux", () => {
  // Le cas nominal de la page, celui qui doit rester silencieux.
  assert.equal(isOrphanBonusOrder(true, { created: false, previousTier: "standard" }), false);
  assert.equal(isOrphanBonusOrder(true, { created: false, previousTier: "plus" }), false);
});

test("l'email envoye suit la meme decision", () => {
  assert.equal(bonusOrderEmailKind(true, { created: false, previousTier: "standard" }), "unlocked");
  assert.equal(bonusOrderEmailKind(true, { created: true, previousTier: null }), "mismatch");
  assert.equal(bonusOrderEmailKind(false, { created: true, previousTier: null }), "unlocked");
});

test("l'adresse de commande est ECRITE dans les deux emails", () => {
  // C'est le seul moyen pour l'acheteur de voir tout de suite qu'il a
  // commande avec la mauvaise adresse. Sans elle, l'email ne sert a rien.
  const adresse = "prenom.nom@exemple.fr";
  for (const built of [
    bonusUnlockedEmail({ actionUrl: "https://exemple.test/lien", email: adresse }),
    bonusEmailMismatchEmail({ actionUrl: "https://exemple.test/lien", email: adresse }),
  ]) {
    assert.ok(built.html.includes(adresse), "l'adresse de commande n'apparait pas");
    assert.ok(built.html.includes("https://exemple.test/lien"), "le lien de connexion manque");
    assert.ok(built.subject.trim().length > 5);
  }
});

test("l'email de confirmation nomme ce qui vient de s'ouvrir", () => {
  // "Ton acces a ete mis a jour" tout court laisse l'acheteur chercher
  // quoi. Les quatre choses achetees sont nommees.
  const { html } = bonusUnlockedEmail({ actionUrl: "https://exemple.test/l", email: "a@b.fr" });
  for (const attendu of ["bonus", "Campagne", "Systeme.io", "Tiquiz Plus"]) {
    assert.ok(html.includes(attendu), `"${attendu}" absent de l'email de confirmation`);
  }
});

test("l'email de mismatch propose une SORTIE, pas seulement un constat", () => {
  const { html } = bonusEmailMismatchEmail({ actionUrl: "https://exemple.test/l", email: "a@b.fr" });
  assert.ok(/r[ée]ponds/i.test(html), "on ne lui dit pas comment faire corriger");
});

test("aucun tiret cadratin dans ces emails", () => {
  // Regle Béné du 7 juin, sur du contenu lu par un client.
  const emails = [
    bonusUnlockedEmail({ actionUrl: "https://x.test/l", email: "a@b.fr" }),
    bonusEmailMismatchEmail({ actionUrl: "https://x.test/l", email: "a@b.fr" }),
    bonusMismatchAdminEmail({ email: "a@b.fr", source: "sio_atelier_bonus" }),
  ];
  for (const { subject, html } of emails) {
    assert.ok(!/[—–]/.test(subject), `tiret long dans un objet : ${subject}`);
    assert.ok(!/[—–]/.test(html), "tiret long dans un corps d'email");
  }
});

test("l'alerte admin porte l'adresse et le bon de commande", () => {
  const { subject, html } = bonusMismatchAdminEmail({
    email: "client@exemple.fr",
    source: "sio_atelier_bonus",
  });
  assert.ok(subject.includes("client@exemple.fr"));
  assert.ok(html.includes("sio_atelier_bonus"), "impossible de savoir d'ou vient la commande");
});
