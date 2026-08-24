// tests/logic/audit-26-aout.test.mts
//
// L'AUDIT DU 26 AOÛT, CÔTÉ ATELIER.
//
// Deux trous, et le premier est le plus instructif de tout l'audit :
// **la fonction qui annule une commission remboursée existait déjà dans
// ce dépôt.** `refundCommissionByOrder` y vit depuis des mois, branchée
// sur le remboursement SYSTEME.IO. Le jour où l'Atelier a eu son propre
// bon de commande, personne ne l'a rebranchée : une vente remboursée
// chez nous continuait de payer son affilié.
//
// Ce n'est pas un oubli d'écriture, c'est le défaut signature de ces
// dépôts : une logique écrite pour un cas, jamais portée sur l'autre.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { memePersonne, normaliserAdresse } from "@/lib/affiliate/memeAdresse";

const lire = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const stripe = lire("app/api/commande/webhook/route.ts");
const paypal = lire("app/api/commande/paypal/webhook/route.ts");

describe("Une vente remboursée ne paie personne", () => {
  test("LE REMBOURSEMENT CARTE ANNULE LA COMMISSION", () => {
    assert.match(stripe, /refundCommissionByOrder\(`stripe:\$\{paymentIntent\}`\)/);
  });

  test("LE REMBOURSEMENT PAYPAL AUSSI", () => {
    assert.match(paypal, /refundCommissionByOrder\(`paypal:\$\{captureOrigine\}`\)/);
  });

  test("LA CLÉ EST CELLE DE LA CRÉATION", () => {
    // `commissionnerVente` écrit `<moyen>:<reference>`. Une clé qui ne
    // correspond pas n'annule rien, en silence.
    assert.match(lire("lib/affiliate/ownerSale.ts"), /const ref = `\$\{vente\.moyen\}:\$\{reference\}`/);
  });

  test("LA CAPTURE D'ORIGINE VIENT DES LIENS, pas d'un champ", () => {
    // La v2 de PayPal ne porte pas de `sale_id` : le seul fil vers la
    // vente est `links[].href`. Sans lui on n'annulerait rien sur un
    // remboursement dont la commande n'est plus lisible.
    assert.match(paypal, /remboursementDepuisRefund\(event\.resource, event\.create_time\)\?\.saleRef/);
    // Et si on ne la retrouve pas, on le DIT.
    assert.match(paypal, /capture d'origine introuvable/);
  });

  test("UN IMPAYÉ FERME AUSSI, une contestation non", () => {
    assert.match(stripe, /charge\.dispute\.funds_withdrawn/);
    assert.match(stripe, /surRemboursement\(event, "impaye"\)/);
    assert.match(stripe, /charge\.dispute\.created/);
    assert.match(stripe, /acces conserve/);
  });

  test("LA MÉCANIQUE EST UN PARAMÈTRE", () => {
    // Sur un litige, `data.object` est un LITIGE : il n'a pas
    // `amount_refunded`, donc `readRefundOutcome` y répondrait "aucun
    // remboursement" et on ne ferait rien.
    assert.match(stripe, /if \(motif === "remboursement"\) \{[\s\S]{0,300}?readRefundOutcome/);
  });
});

describe("S'affilier à soi même", () => {
  test("LES ALIAS GMAIL SONT LA MÊME BOÎTE", () => {
    // Acheter l'Atelier avec `moi+1@gmail.com` suffisait à se payer
    // 70 % de son propre achat.
    assert.equal(normaliserAdresse("bene+atelier@gmail.com"), "bene@gmail.com");
    assert.ok(memePersonne("B.E.N.E@GoogleMail.com", "bene+x@gmail.com"));
  });

  test("AILLEURS, LES POINTS COMPTENT", () => {
    assert.ok(!memePersonne("jean.dupont@orange.fr", "jeandupont@orange.fr"));
    assert.ok(memePersonne("jean+promo@orange.fr", "jean@orange.fr"));
  });

  test("L'ATTRIBUTION UTILISE LA RÈGLE", () => {
    const src = lire("lib/affiliateTracking.ts");
    assert.match(src, /memePersonne\(aff\.email, email\)/);
    assert.ok(
      !/if \(\(aff\.email \?\? ""\)\.toLowerCase\(\) === email\)/.test(src),
      "la comparaison brute est revenue",
    );
  });
});

describe("Ce qui reste à vérifier chez Systeme.io", () => {
  test("UNE VENTE TIQUIZ ENREGISTRÉE ICI EST SIGNALÉE", () => {
    // Cette route accepte les produits `tiquiz` et les écrit dans la base
    // de l'ATELIER, pendant que le webhook Systeme.io de Tiquiz remonte
    // les mêmes ventes chez TIPOTE. Deux bases, deux contraintes
    // d'unicité, donc rien n'empêche de compter la même vente deux fois,
    // et l'admin ADDITIONNE les deux sources.
    //
    // On ne change pas le routage à l'aveugle : il dépend de ses
    // automatisations Systeme.io, qu'on ne voit pas d'ici. On le rend
    // VISIBLE, et la vérification est dans le cahier des charges.
    const src = lire("app/api/affiliate/sio-sale/route.ts");
    assert.match(src, /source_app === "tiquiz"/);
    assert.match(src, /comptee deux fois/);
  });
});
