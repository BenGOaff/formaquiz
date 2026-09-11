// tests/logic/alerte-vente-encaissee.test.mts
//
// UNE VENTE ENCAISSÉE PAR NOTRE BON DE COMMANDE PRÉVIENT BÉNÉ (11 septembre 2026).
//
// Béné : "il me faut aussi une alerte quand je fais une nouvelle vente
// via notre système, par email." L'Atelier vend un achat unique : chaque
// encaissement, par carte ou par PayPal, est une nouvelle vente.
//
// Le contenu vit dans `lib/ventes/alerteVente.ts`, identique à l'octet
// près à celui de Tiquiz (`cmp` des deux fichiers). Ce filet tient ce qui
// est propre à ce dépôt : les deux points d'encaissement appellent
// l'alerte APRÈS la commission, avec la nature `premiere`, par le seul
// chemin d'envoi qui fait UN email (Béné, 25 août : "je reçois toujours
// ce genre de mails en double").

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { contenuAlerteVente, natureDeLaFactureStripe } from "@/lib/ventes/alerteVente";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const source = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const TIRET_LONG = /[–—]/;

test("le contenu nomme l'Atelier, le montant et le produit, sans tiret cadratin", () => {
  const c = contenuAlerteVente({
    app: "L'Atelier du Quiz",
    moyen: "paypal",
    nature: "premiere",
    email: "eleve@example.com",
    produit: "L'Atelier du Quiz",
    montantCents: 4700,
    devise: "eur",
    reference: "CAP-1",
    compteCree: true,
    lienAdmin: "https://quizing.tipote.com/admin/eleves",
  });
  assert.match(c.subject, /^Nouvelle vente L'Atelier du Quiz/);
  assert.match(c.subject, /47,00\s?€/);
  assert.ok(c.html.includes("Le compte vient d'être créé."));
  assert.ok(c.html.includes("PayPal"));
  assert.doesNotMatch(c.subject, TIRET_LONG);
  assert.doesNotMatch(c.html, TIRET_LONG);
  assert.equal(natureDeLaFactureStripe("subscription_cycle", 100), "echeance");
});

for (const [nom, fichier] of [
  ["Stripe", "app/api/commande/webhook/route.ts"],
  ["PayPal", "app/api/commande/paypal/webhook/route.ts"],
] as const) {
  test(`${nom} : l'alerte part APRES la commission, en nouvelle vente`, () => {
    const code = sansCommentaires(source(fichier));
    const commission = code.lastIndexOf("commissionnerVente(");
    const alerte = code.indexOf("alerterVenteEncaissee(");
    assert.ok(commission > 0 && alerte > commission, "l'alerte part apres la commission");
    assert.equal((code.match(/alerterVenteEncaissee\(/g) ?? []).length, 1, "une seule alerte par vente");
    const bloc = code.slice(alerte, code.indexOf("});", alerte));
    assert.match(bloc, /nature: "premiere"/);
    assert.match(bloc, /compteCree: octroi\.created/);
  });
}

test("l'alerte passe par alerterAdmins et ne leve jamais", () => {
  const code = sansCommentaires(source("lib/email/venteEncaisseeAlerte.ts"));
  assert.match(code, /alerterAdmins\(/);
  assert.match(code, /try \{/);
  assert.ok(!code.includes("ADMIN_EMAILS"));
  assert.ok(!code.includes("throw "));
});
