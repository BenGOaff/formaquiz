// tests/logic/vies-atelier.test.mts
//
// UN NUMÉRO DE TVA BIEN FORMÉ N'EST PAS UN NUMÉRO QUI EXISTE.
//
// Béné, 27 août 2026 (côté Tiquiz) : "les numéros de TVA sont validés
// sur leur FORME, jamais auprès de VIES. Un numéro bien formé mais
// inexistant produit une autoliquidation injustifiée, donc de la TVA à
// ta charge. On peut corriger ça ?"
//
// Corrigé chez Tiquiz le 27, l'Atelier avait gardé la validation de
// forme seule. **Un garde-fou qui ne protège qu'un des deux jumeaux ne
// protège personne.**
//
// -- CE QUE ÇA COÛTE, ET ÇA COÛTE DEUX FOIS ---------------------------
//
// `BE0123456789` est parfaitement bien formé et n'appartient
// peut-être à personne. Sur une vente de l'Atelier à 47 € :
//
//   1. l'autoliquidation injustifiée met **7,83 € de TVA à la charge de
//      Béné**, découverts au contrôle, des années plus tard ;
//   2. depuis le 31 août, la commission se calcule sur le HT de CETTE
//      facture : une TVA fautivement à zéro fait commissionner sur le
//      TTC, soit **5,48 € de trop** à 70 %.
//
// La même erreur passe deux fois à la caisse.
//
// -- CE QUE VIES N'EST PAS --------------------------------------------
//
// Ce n'est PAS une brique d'affiliation. C'est la TVA des factures que
// l'Atelier émet pour SES ventes PayPal (PayPal n'en émet aucune). Le
// lien avec l'affiliation est indirect et récent : la commission se
// calcule sur le HT de cette facture.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { construireFacture } from "@/lib/facture/construire";
import { resoudreTva } from "@/lib/facture/tva";
import { decouperNumeroTva, lireReponseVies } from "@/lib/facture/vies";

const VENTE = {
  provider: "paypal" as const,
  saleRef: "CAPTURE-1",
  productId: "atelier",
  libelle: "L'Atelier du Quiz",
  currency: "eur",
  totalCents: 4700,
  paidAt: "2026-08-31T10:00:00.000Z",
  emailCle: "acheteur@exemple.fr",
};

describe("Un numéro refusé par VIES ne donne PAS d'autoliquidation", () => {
  test("VIES DIT NON : on facture la TVA du pays du preneur", () => {
    const d = resoudreTva({ pays: "BE", numeroTva: "BE0123456789", vies: "invalide" });
    assert.notEqual(d.regime, "autoliquidation");
    assert.ok(d.tauxBp > 0, "un numero inexistant ne doit pas donner 0 %");
    assert.ok(d.aCompleter.includes("tva-numero-refuse-vies"));
  });

  test("VIES DIT OUI : autoliquidation, et on ne remet plus le sujet sur la table", () => {
    const d = resoudreTva({ pays: "BE", numeroTva: "BE0123456789", vies: "valide" });
    assert.equal(d.regime, "autoliquidation");
    assert.equal(d.tauxBp, 0);
    assert.ok(!d.aCompleter.includes("tva-a-valider-vies"), "la verification a eu lieu");
  });

  test("VIES INJOIGNABLE : on garde l'autoliquidation, et la facture le DIT", () => {
    // VIES interroge les administrations en direct : il est lent, il
    // tombe, certains pays ferment la nuit. Traiter "injoignable" comme
    // "invalide" facturerait 21 % de TVA belge a une entreprise qui a
    // parfaitement le droit a l'autoliquidation.
    for (const vies of ["injoignable", "non-verifie"] as const) {
      const d = resoudreTva({ pays: "BE", numeroTva: "BE0123456789", vies });
      assert.equal(d.regime, "autoliquidation", vies);
      assert.ok(d.aCompleter.includes("tva-a-valider-vies"), vies);
    }
  });

  test("UN NUMÉRO MAL FORMÉ n'attend même pas VIES", () => {
    const d = resoudreTva({ pays: "BE", numeroTva: "n'importe quoi", vies: "valide" });
    assert.notEqual(d.regime, "autoliquidation");
    assert.ok(d.aCompleter.includes("tva-numero-invalide"));
  });

  test("UNE ENTREPRISE FRANÇAISE PAIE, meme avec un numero valide", () => {
    // L'autoliquidation n'existe pas entre deux entreprises du meme
    // pays. Se tromper la, c'est facturer 0 % a tous les clients pros
    // francais et payer leur TVA de sa poche.
    const d = resoudreTva({ pays: "FR", numeroTva: "FR12345678901", vies: "valide" });
    assert.equal(d.regime, "france");
    assert.equal(d.tauxBp, 2000);
  });
});

describe("La facture porte la décision, et la commission en dépend", () => {
  test("UN NUMÉRO REFUSÉ produit une facture AVEC TVA", () => {
    const f = construireFacture("facture", VENTE, { pays: "BE", tvaNumero: "BE0123456789" } as Parameters<typeof construireFacture>[2], "invalide");
    assert.ok(f.tvaCents > 0, "sans TVA, Bene la paie de sa poche");
    assert.equal(f.htCents + f.tvaCents, 4700);
  });

  test("le meme numero ACCEPTE produit une facture a 0 %", () => {
    const f = construireFacture("facture", VENTE, { pays: "BE", tvaNumero: "BE0123456789" } as Parameters<typeof construireFacture>[2], "valide");
    assert.equal(f.tvaCents, 0);
    assert.equal(f.htCents, 4700);
  });

  test("`vies` EST OBLIGATOIRE : le compilateur refuse un appelant muet", () => {
    // On ne peut pas le tester au type, mais on peut exiger que la
    // signature le porte : un defaut optionnel ferait taire la question
    // au premier appelant qui l'oublie.
    const src = fs.readFileSync(path.join(process.cwd(), "lib/facture/construire.ts"), "utf8");
    assert.match(src, /vies: ControleVies,/);
    assert.ok(!/vies\?:/.test(src), "un `vies` optionnel rouvre exactement le trou");
  });
});

describe("Le numero envoye a VIES est decoupe avant de partir", () => {
  test("espaces, points et casse ne doivent pas faire refuser un numero valide", () => {
    assert.deepEqual(decouperNumeroTva(" be 0123.456789 "), { pays: "BE", numero: "0123456789" });
  });

  test("la Grece ecrit EL sur ses numeros et GR sur ses adresses", () => {
    // Le seul pays ou le prefixe du numero n'est pas le code du pays :
    // l'oublier ferait refuser toutes les autoliquidations grecques.
    assert.deepEqual(decouperNumeroTva("EL123456789"), { pays: "EL", numero: "123456789" });
  });

  test("une saisie vide ne DERANGE PAS la Commission", () => {
    assert.equal(decouperNumeroTva(""), null);
    assert.equal(decouperNumeroTva(null), null);
    assert.equal(decouperNumeroTva("FR"), null);
  });

  test("ce decoupage ne JUGE pas : c'est `numeroTvaBienForme` qui juge", () => {
    // "bonjour" a la FORME d'un numero (deux lettres puis du texte),
    // donc il se decoupe. Ce n'est pas un defaut : le decoupage prepare
    // l'appel, il ne valide rien. Un mot pareil est arrete AVANT, par
    // `resoudreTva`, qui n'accorde jamais d'autoliquidation sur un
    // numero mal forme (teste plus haut).
    assert.deepEqual(decouperNumeroTva("bonjour"), { pays: "BO", numero: "NJOUR" });
    assert.notEqual(
      resoudreTva({ pays: "BE", numeroTva: "bonjour", vies: "valide" }).regime,
      "autoliquidation",
    );
  });

  test("une reponse illisible de VIES vaut INJOIGNABLE, jamais invalide", () => {
    // Traiter un silence comme un refus facturerait 21 % a une
    // entreprise qui a le droit a l'autoliquidation.
    assert.equal(lireReponseVies({ valid: true }), "valide");
    assert.equal(lireReponseVies({ valid: false }), "invalide");
    assert.equal(lireReponseVies({}), "injoignable");
    assert.equal(lireReponseVies(null), "injoignable");
  });
});
