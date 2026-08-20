// tests/logic/checkout-catalog.test.mts
//
// LE CATALOGUE DE L'ATELIER, ET CE QU'IL NE DOIT JAMAIS FAIRE.
//
// La leçon vient de Tiquiz, drame Ivan du 7 août 2026 : un prix qui
// change à un endroit et pas à l'autre, et un client qui a payé se
// retrouve sans accès. Le prix, le palier ouvert et le libellé vivent
// donc sur la même ligne, et ces tests interdisent qu'ils se séparent.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  findOwnerProduct,
  formatOwnerPrice,
  ownerBillingKey,
  tierForOwnerProduct,
} from "../../lib/checkout/catalog.ts";

test("un identifiant inconnu ne vend RIEN", () => {
  for (const inconnu of [null, undefined, "", "   ", "bonus", "atelier-plus", "../atelier"]) {
    assert.equal(findOwnerProduct(inconnu), null, `"${inconnu}" a trouvé un produit`);
    assert.equal(tierForOwnerProduct(inconnu), null);
  }
});

test("la casse et les espaces ne changent pas le produit vendu", () => {
  assert.equal(findOwnerProduct("  Atelier ")?.id, "atelier");
});

test("l'Atelier vendu ouvre le palier COMPLET", () => {
  // Vérifié dans app/api/systeme-io/webhook/route.ts, qui sert le bon de
  // commande historique : `tier: "plus"`. Notre paiement doit ouvrir
  // exactement la même chose, sinon un client qui achète chez nous reçoit
  // moins que celui qui achète chez Systeme.io.
  assert.equal(OWNER_CATALOG.atelier.tier, "plus");
});

test("on ne vend QUE l'Atelier complet, a 47 euros", () => {
  // Béné, 20 août : "on vend l'Atelier à 47 € uniquement."
  //
  // Ce test n'est pas une formalité : le tunnel pub et la page de
  // deuxième chance des bonus existent toujours côté Systeme.io, et le
  // réflexe naturel du prochain passage serait de "compléter" le
  // catalogue avec eux. Ce serait mettre en vente chez nous des offres
  // qu'elle ne veut pas y vendre.
  assert.deepEqual(Object.keys(OWNER_CATALOG), ["atelier"]);
  assert.equal(OWNER_CATALOG.atelier.amountCents, 4700);
});

test("la source est DISTINCTE de celle de Systeme.io", () => {
  // Chaque bon de commande écrit sa propre source dans `enrollments` et
  // dans les journaux. Partager celle de Systeme.io mélangerait les deux
  // idempotences, et un événement ancien pourrait rejouer une vente.
  assert.notEqual(OWNER_CATALOG.atelier.source, "systeme_io");
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.ok(p.source.trim(), `${p.id} n'a pas de source`);
  }
});

test("les montants sont des entiers de centimes, strictement positifs", () => {
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.ok(Number.isInteger(p.amountCents), `${p.id} : ${p.amountCents} n'est pas un entier`);
    assert.ok(p.amountCents > 0, `${p.id} : montant nul ou négatif`);
    // Un prix en euros écrit par erreur (47 au lieu de 4700) passerait les
    // deux contrôles ci-dessus et vendrait l'Atelier 0,47 €.
    assert.ok(
      p.amountCents >= 100,
      `${p.id} : ${p.amountCents} centimes, un prix en euros a du se glisser la`,
    );
  }
});

test("l'Atelier est un achat unique, jamais un abonnement", () => {
  // "Paiement unique, accès à vie" est écrit sur la page de vente, dans
  // le carrousel et dans la garantie. Un `interval` posé ici par erreur
  // prélèverait tous les mois quelqu'un à qui on a promis le contraire.
  assert.equal(OWNER_CATALOG.atelier.interval, null);
  assert.equal(ownerBillingKey(OWNER_CATALOG.atelier), "once");
});

test("le prix affiche garde ses centimes et sa devise", () => {
  const affiche = formatOwnerPrice(OWNER_CATALOG.atelier, "fr-FR");
  assert.match(affiche, /47/, `prix affiché inattendu : ${affiche}`);
  assert.match(affiche, /,00/, `les centimes ont disparu : ${affiche}`);
  assert.match(affiche, /€/, `la devise a disparu : ${affiche}`);
});

test("l'ordre d'affichage contient TOUS les produits, une fois chacun", () => {
  assert.deepEqual(
    [...OWNER_PRODUCT_ORDER].sort(),
    Object.keys(OWNER_CATALOG).sort(),
    "l'ordre d'affichage et le catalogue ne contiennent pas les mêmes produits",
  );
  assert.equal(new Set(OWNER_PRODUCT_ORDER).size, OWNER_PRODUCT_ORDER.length, "doublon dans l'ordre");
});

test("le catalogue est la SEULE liste de prix du repo", () => {
  // Le vrai risque n'est pas qu'un prix soit faux, c'est qu'il soit écrit
  // ailleurs une deuxième fois. Ce test interdit qu'un montant en centimes
  // réapparaisse en dur dans un écran ou une route.
  const racine = process.cwd();
  const montants = Object.values(OWNER_CATALOG).map((p) => String(p.amountCents));
  const fautifs: string[] = [];

  const parcourir = (dossier: string) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (entree.name === "node_modules" || entree.name.startsWith(".")) continue;
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        parcourir(chemin);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entree.name)) continue;
      const src = fs.readFileSync(chemin, "utf8");
      for (const m of montants) {
        const regex = new RegExp(`(?<![\\d_])${m}(?![\\d_])`);
        if (regex.test(src)) fautifs.push(`${path.relative(racine, chemin)} : ${m}`);
      }
    }
  };

  for (const d of ["app", "components"]) {
    const chemin = path.join(racine, d);
    if (fs.existsSync(chemin)) parcourir(chemin);
  }

  assert.deepEqual(
    fautifs,
    [],
    `des montants du catalogue sont réécrits en dur :\n${fautifs.join("\n")}\n` +
      `Importe OWNER_CATALOG au lieu de recopier le nombre.`,
  );
});
