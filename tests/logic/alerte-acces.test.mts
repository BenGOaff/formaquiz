// tests/logic/alerte-acces.test.mts
//
// UN PAIEMENT SANS ACCÈS, OU UN TAG NON POSÉ, PRÉVIENT BÉNÉ PAR EMAIL
// (11 septembre 2026). Jumeau du test de Tiquiz : le module pur est le
// même, les webhooks sont les siens.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { alerteAccesNecessaire, contenuAlerteAcces } from "@/lib/ventes/alerteAcces";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const lire = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const source = (rel: string) => sansCommentaires(lire(rel));

test("on alerte sur un échec CONSTATÉ, jamais sur un doute", () => {
  assert.equal(alerteAccesNecessaire({ ok: false, raison: "x" }), true);
  assert.equal(alerteAccesNecessaire({ ok: true, compteCree: true, emailAccesEnvoye: null, tagsPoses: false }), true);
  // L'Atelier ne dit pas si son email d'accès est parti : `null`, silence.
  assert.equal(alerteAccesNecessaire({ ok: true, compteCree: true, emailAccesEnvoye: null, tagsPoses: true }), false);
});

test("le contenu dit quoi faire, sans tiret cadratin", () => {
  const c = contenuAlerteAcces({
    app: "L'Atelier du Quiz", moyen: "stripe", email: "a@b.fr", produit: "L'Atelier",
    reference: "cs_1", lienAdmin: "https://quizing.tipote.com/admin/eleves",
    octroi: { ok: true, compteCree: false, emailAccesEnvoye: null, tagsPoses: false },
  });
  assert.match(c.subject, /^Accès ouvert mais incomplet L'Atelier du Quiz/);
  assert.match(c.texte, /Pose le tag à la main/);
  assert.doesNotMatch(c.texte + c.html, /[—–]/);
});

test("le module pur est le MÊME que celui de Tiquiz, à l'octet près", () => {
  const ici = lire("lib/ventes/alerteAcces.ts");
  const jumeau = path.join(process.cwd(), "..", "tiquiz", "lib", "ventes", "alerteAcces.ts");
  let la: string | null = null;
  try { la = readFileSync(jumeau, "utf8"); } catch { la = null; }
  if (la !== null) assert.equal(ici, la, "cmp lib/ventes/alerteAcces.ts ../tiquiz/lib/ventes/alerteAcces.ts");
});

test("les DEUX webhooks alertent AVANT le 502 d'octroi, et disent si le tag est passé", () => {
  for (const fichier of ["app/api/commande/webhook/route.ts", "app/api/commande/paypal/webhook/route.ts"]) {
    const src = source(fichier);
    const refus = src.indexOf('reason: octroi.reason ?? "grant_failed" }, { status: 502 }');
    assert.ok(refus > 0, `${fichier} : 502 d'octroi introuvable`);
    assert.match(src.slice(Math.max(0, refus - 700), refus), /alerterAccesIncomplet\(/, `${fichier} : le 502 part sans alerte`);
    // Le résultat du tag est LU, pas jeté : sans ça, `tagsPoses` serait toujours inconnu.
    assert.match(src, /const tagPose = await poserTagAcheteur\(/, `${fichier} : le résultat du tag n'est pas lu`);
    assert.match(src, /tagsPoses: tagPose/, `${fichier} : le tag n'entre pas dans l'alerte`);
    // L'email d'accès n'est PAS connu ici : on le dit (null), on ne devine pas.
    assert.match(src, /emailAccesEnvoye: null/);
  }
});
