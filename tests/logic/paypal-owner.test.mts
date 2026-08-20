// tests/logic/paypal-owner.test.mts
//
// PAYER L'ATELIER EN PAYPAL, ET CE QUI NE DOIT JAMAIS BOUGER DEDANS.
//
// Beaucoup de gens n'ont pas envie de sortir leur carte et paient en
// PayPal ou pas du tout. Un bon de commande sans PayPal, ce ne sont pas
// des ventes qui passent ailleurs : ce sont des ventes qui ne se font
// pas.
//
// Ces tests ne parlent pas à PayPal. Ils figent les décisions qui, si
// elles changeaient sans qu'on le voie, coûteraient de l'argent.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { paypalAmount, readCustomId } from "../../lib/checkout/paypalOwner.ts";
import { OWNER_CATALOG } from "../../lib/checkout/catalog.ts";

test("le montant envoye a PayPal a TOUJOURS deux decimales", () => {
  // PayPal refuse "47". Il veut "47.00". Une division affichee telle
  // quelle passerait le typecheck et serait refusee en production, sur
  // une vraie vente, sans que rien ne l'ait dit avant.
  assert.equal(paypalAmount(4700), "47.00");
  assert.equal(paypalAmount(1700), "17.00");
  assert.equal(paypalAmount(999), "9.99");
  assert.equal(paypalAmount(50), "0.50");
  assert.equal(paypalAmount(5), "0.05");
});

test("le prix PayPal est EXACTEMENT celui du catalogue", () => {
  // Le meme prix affiche a un endroit et preleve a un autre est la
  // faute la plus couteuse qu'un bon de commande puisse commettre. Ici
  // les deux moyens de paiement lisent la MEME source.
  for (const produit of Object.values(OWNER_CATALOG)) {
    const attendu = (produit.amountCents / 100).toFixed(2);
    assert.equal(
      paypalAmount(produit.amountCents),
      attendu,
      `le montant PayPal de ${produit.id} ne correspond plus au catalogue`,
    );
  }
});

test("le produit et l'affiliee font l'aller-retour dans custom_id", () => {
  // `custom_id` est le seul champ qui survit a tout le parcours PayPal :
  // c'est lui qu'on relit dans le webhook pour savoir QUOI ouvrir et A
  // QUI verser la commission. S'il se lisait mal, l'acces s'ouvrirait
  // sur le mauvais produit ou pas du tout.
  assert.deepEqual(readCustomId("atelier"), { productId: "atelier", affiliateRef: null });
  assert.deepEqual(readCustomId("atelier|GWENN23"), {
    productId: "atelier",
    affiliateRef: "GWENN23",
  });
  // Ce qu'on ne sait pas lire n'ouvre rien, plutot que d'ouvrir au hasard.
  assert.deepEqual(readCustomId(""), { productId: null, affiliateRef: null });
  assert.deepEqual(readCustomId(null), { productId: null, affiliateRef: null });
  assert.deepEqual(readCustomId(undefined), { productId: null, affiliateRef: null });
});

test("on n'encaisse pas de vrai argent tant que rien n'ouvre l'acces", () => {
  // Le garde-fou le plus important du chantier, et il est invisible :
  // un compte PayPal LIVE branche avant que le webhook existe
  // encaisserait des ventes que personne n'ouvrirait. C'est le drame
  // Ivan, sauf que cette fois l'argent serait sur notre compte.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/paypal/route.ts"),
    "utf8",
  );
  assert.ok(
    src.includes('compte.mode === "live" && !readOwnerPaypalWebhookId(process.env)'),
    "le garde-fou LIVE sans webhook a disparu de la route PayPal",
  );
  assert.ok(src.includes('reason: "live_without_webhook"'), "la raison renvoyee a change");
});

test("un appel de webhook non authentifie n'ouvre RIEN", () => {
  // PayPal ne signe pas avec un secret partage : on lui RENVOIE
  // l'en-tete et le corps, et c'est lui qui dit si c'est authentique.
  // Sans cette verification, cette adresse distribue l'Atelier a qui la
  // connait.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/paypal/webhook/route.ts"),
    "utf8",
  );
  const verif = src.indexOf("verifyOwnerPaypalWebhook");
  const octroi = src.indexOf("grantAccessByEmail(");
  assert.ok(verif > 0 && octroi > 0, "verification ou octroi absent");
  assert.ok(verif < octroi, "l'acces s'ouvre AVANT que l'appel soit authentifie");
  assert.ok(
    src.includes("logWebhookEvent("),
    "l'idempotence a disparu : un reessai de PayPal rejouerait la vente",
  );
});

test("le webhook ouvre sur l'encaissement, jamais sur l'approbation", () => {
  // Une commande APPROUVEE n'est pas une commande PAYEE : l'argent n'a
  // pas bouge tant qu'on n'a pas capture. Ouvrir sur l'approbation
  // donnerait l'Atelier a quelqu'un qui n'a rien paye.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/paypal/webhook/route.ts"),
    "utf8",
  );
  assert.ok(
    src.includes('eventType !== "PAYMENT.CAPTURE.COMPLETED"'),
    "l'evenement qui ouvre l'acces a change",
  );
  assert.ok(
    !src.includes("CHECKOUT.ORDER.APPROVED"),
    "le webhook ouvre sur l'approbation : l'argent n'a pas encore bouge a ce moment la",
  );
  assert.ok(
    src.includes('eventType === "PAYMENT.CAPTURE.REFUNDED"'),
    "le remboursement PayPal ne ferme plus l'acces",
  );
});

test("une panne de carte n'emporte PAS PayPal", () => {
  // Le premier jet sortait du composant des que Stripe echouait, donc
  // une cle Stripe absente faisait disparaitre AUSSI le bouton PayPal :
  // l'acheteur se retrouvait sans aucun moyen de payer alors qu'il en
  // restait un qui marchait. Deux moyens de paiement, deux sorts
  // independants.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/commande/[produit]/CommandeClient.tsx"),
    "utf8",
  );
  const definition = src.indexOf("const blocPaypal");
  const sortieErreur = src.indexOf("if (erreur) {");
  assert.ok(definition > 0, "le bloc PayPal n'est plus une variable rendue partout");
  assert.ok(definition < sortieErreur, "le bloc PayPal est defini APRES la sortie d'erreur");
  // Les deux sorties anticipees le rendent, et le rendu normal aussi.
  assert.equal(
    (src.match(/\{blocPaypal\}/g) ?? []).length,
    3,
    "le bloc PayPal n'est pas rendu dans les TROIS branches (erreur, sans cle, normal)",
  );
});
