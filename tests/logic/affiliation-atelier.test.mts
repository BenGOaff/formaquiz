// tests/logic/affiliation-atelier.test.mts
//
// L'ATELIER LIT NOS LIENS ET PAIE DEPUIS NOTRE REGISTRE (26 août 2026).
//
// Béné : "je veux notre propre système d'affiliation pour l'atelier
// comme pour tiquiz, je pensais que tu avais déjà bossé dessus."
//
// Ce qui était cassé, et qui l'était EN SILENCE :
// 1. l'Atelier ne lisait que `?sa=`. Depuis que nos liens portent
//    `?ref=` (24 août), le lien Atelier de l'espace affilié ne payait
//    plus PERSONNE : ni Systeme.io, ni nous ;
// 2. il commissionnait contre SON registre (`profiles.sio_affiliate_id`),
//    donc un affilié inscrit chez nous sans compte Systeme.io n'existait
//    pas et n'était payé sur rien ;
// 3. son cookie durait 90 jours quand la promesse est d'UN AN.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { buildCustomId, readCustomId } from "@/lib/checkout/paypalOwner";
import { SA_MAX_AGE_SECONDS } from "@/lib/affiliate/sa";
import {
  pickRef,
  readRef,
  readRefFromBrowser,
  REF_COOKIE,
  REF_MAX_AGE_SECONDS,
  REF_PARAM,
} from "@/lib/affiliate/refLien";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

// ── 1. Le format du code, jumeau de celui de Tipote ──

test("un code accepté par Tipote est accepté ici", () => {
  for (const bon of ["jocelyne", "marie-claire", "abc", "a1b2c3", "x".repeat(20)]) {
    assert.equal(readRef(bon), bon, bon);
  }
  // Un code refusé ici et accepté là-bas serait un affilié jamais payé,
  // sans le moindre symptôme.
  for (const mauvais of ["ab", "x".repeat(21), "-jocelyne", "jocelyne-", "jo celyne", "JO_CELYNE", ""]) {
    assert.equal(readRef(mauvais), null, mauvais);
  }
  // Une majuscule est ramenée en minuscules, pas rejetée : l'affilié
  // dicte son code au téléphone, il ne tape pas un identifiant.
  assert.equal(readRef("Jocelyne"), "jocelyne");
});

test("l'URL gagne sur le cookie : c'est le DERNIER lien qui ferme la vente", () => {
  assert.equal(pickRef("christian", "martine"), "christian");
  assert.equal(pickRef(null, "martine"), "martine");
  assert.equal(pickRef("!!", "martine"), "martine", "une URL illisible ne doit pas effacer le cookie");
  assert.equal(pickRef(null, null), null);
});

test("le bon de commande retrouve le code dans l'URL comme dans le cookie", () => {
  assert.equal(readRefFromBrowser(`?${REF_PARAM}=jocelyne`, ""), "jocelyne");
  assert.equal(readRefFromBrowser("", `${REF_COOKIE}=martine; autre=1`), "martine");
  assert.equal(readRefFromBrowser("", "autre=1"), null);
  // Ne jette jamais : ces valeurs viennent d'une URL publique.
  assert.equal(readRefFromBrowser("%%%", "%%%"), null);
});

// ── 2. Un an, des deux côtés ──

test("les deux cookies d'affiliation durent UN AN", () => {
  const unAn = 365 * 24 * 60 * 60;
  assert.equal(REF_MAX_AGE_SECONDS, unAn, "le code public n'est plus garanti un an");
  assert.equal(SA_MAX_AGE_SECONDS, unAn, "le `sa` est resté à 90 jours : deux durées, deux promesses");
});

test("le middleware range les DEUX, dans des cookies séparés", () => {
  const src = lire("middleware.ts");
  assert.match(src, /readRef\(req\.nextUrl\.searchParams\.get\(REF_PARAM\)\)/);
  assert.match(src, /res\.cookies\.set\(REF_COOKIE/);
  assert.match(src, /res\.cookies\.set\(SA_COOKIE/);
});

// ── 3. PayPal : le champ est AJOUTÉ EN FIN ──

test("une commande PayPal en cours se relit exactement comme avant", () => {
  // Le 4e champ est ajouté en fin : les positions d'avant ne bougent pas.
  const ancien = readCustomId("atelier|sa0016abcdef0123456789|acheteur@exemple.fr");
  assert.equal(ancien.productId, "atelier");
  assert.equal(ancien.affiliateRef, "sa0016abcdef0123456789");
  assert.equal(ancien.email, "acheteur@exemple.fr");
  assert.equal(ancien.affiliateCode, null, "un ancien custom_id n'a pas de code, et c'est normal");
});

test("le code voyage dans le custom_id et se relit", () => {
  const id = buildCustomId("atelier", "sa0016abcdef0123456789", "Acheteur@Exemple.fr", "jocelyne");
  const lu = readCustomId(id);
  assert.equal(lu.productId, "atelier");
  assert.equal(lu.affiliateRef, "sa0016abcdef0123456789");
  assert.equal(lu.affiliateCode, "jocelyne");
  assert.equal(lu.email, "acheteur@exemple.fr");
  assert.ok(id.length <= 127);
});

test("quand ça déborde, l'ADRESSE ne se sacrifie jamais", () => {
  // 127 caractères max chez PayPal. Une attribution perdue se retrouve
  // par l'email ; un accès ouvert sur la mauvaise adresse ne se retrouve
  // pas.
  const longue = `${"a".repeat(80)}@exemple-tres-long-domaine.fr`;
  const id = buildCustomId("atelier", "sa0016abcdef0123456789abcdef", longue, "jocelyne");
  assert.ok(id.length <= 127, `custom_id de ${id.length} caracteres`);
  assert.ok(id.includes(longue.toLowerCase()), "l'adresse a ete sacrifiee");
});

// ── 4. Le registre central passe en premier, et le repli est encadré ──

test("l'Atelier interroge Tipote AVANT son registre historique", () => {
  const src = lire("lib/affiliate/ownerSale.ts");
  const iCentral = src.indexOf("attribuerChezTipote({");
  const iLocal = src.indexOf("attributeQuizingSale({");
  assert.ok(iCentral > 0 && iLocal > 0, "un des deux appels a disparu");
  assert.ok(iCentral < iLocal, "le registre local passe avant le central : risque de double paiement");
});

test("une panne réseau ne fait PAS basculer l'argent sur l'autre registre", () => {
  // Les deux bases ne partagent aucune contrainte d'unicité : écrire
  // dans les deux paierait deux fois le même affilié, dans deux
  // tableaux de bord différents.
  const src = lire("lib/affiliate/ownerSale.ts");
  assert.match(src, /if \(central === "injoignable"\)/);
  assert.match(src, /"attribue" \| "personne" \| "injoignable"/);
  // Un DOUBLON chez Tipote vaut succès : sinon on en créerait une seconde.
  assert.match(src, /r\?\.status === "duplicate"/);
});

test("la vente Atelier part avec ce qui décide du taux et du payeur", () => {
  const src = lire("lib/affiliate/ownerSale.ts");
  assert.match(src, /source_app: "atelier"/, "sans ça, Tipote paierait 40% au lieu de 70%");
  assert.match(src, /base: "ht"/, "sans ça, la TVA serait retirée deux fois");
  assert.match(src, /regle_par: "nous"/, "sans ça, la ligne serait exclue des lots de virement");
  assert.match(src, /affiliate_code: v\.code/);
  assert.match(src, /affiliate_ref: v\.sa/);
  // Un appel vers l'autre app tourne DANS le webhook : sans délai, une
  // panne de Tipote garde la requête ouverte jusqu'à ce qu'on la tue.
  assert.match(src, /AbortSignal\.timeout\(/);
});

test("un remboursement annule la commission DES DEUX CÔTÉS", () => {
  for (const f of ["app/api/commande/webhook/route.ts", "app/api/commande/paypal/webhook/route.ts"]) {
    const src = lire(f);
    assert.match(src, /refundCommissionByOrder\(/, f);
    assert.match(src, /annulerCommissionChezTipote\(/, `${f} : la ligne centrale murirait puis partirait en virement`);
  }
});

test("le bon de commande envoie le code, dans un champ à lui", () => {
  const client = lire("app/commande/[produit]/CommandeClient.tsx");
  assert.match(client, /readRefFromBrowser/);
  assert.match(client, /code: codeAffilie\(\)/);
  // Les deux ne se devinent JAMAIS l'un l'autre.
  assert.match(client, /ref: refAffiliee\(\)/);
  for (const f of ["app/api/commande/session/route.ts", "app/api/commande/paypal/route.ts"]) {
    assert.match(lire(f), /affiliateCode: typeof body\.code === "string"/, f);
  }
});
