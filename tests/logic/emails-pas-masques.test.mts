// tests/logic/emails-pas-masques.test.mts
//
// CLOUDFLARE MASQUAIT LES ADRESSES DES PAGES LEGALES (3 septembre 2026).
//
// L'option « Email Address Obfuscation » remplace toute adresse du HTML
// SERVI par <span class="__cf_email__">[email protected]</span>. Un
// lecteur sans JavaScript (le validateur OAuth de Google, un robot, un
// lecteur d'ecran degrade) lit donc une politique de confidentialite
// sans aucune adresse de contact, alors que le texte en promet une.
//
// MESURE DU 3 SEPTEMBRE, avec l'agent de Googlebot, en production :
//
//   app.tipote.com/legal/privacy      5 masquees
//   app.tipote.com/legal/extension    1
//   atelierduquiz.fr/privacy          1
//   atelierduquiz.fr/legal            1
//   tiquiz.fr/privacy                 0  (corrige le 2 septembre)
//
// Tiquiz avait ete corrige seul : UN GARDE-FOU QUI NE PROTEGE QU'UN DES
// JUMEAUX NE PROTEGE PERSONNE. Ce test vit donc dans les trois depots.
//
// Il lit la SOURCE, pas la page rendue : le rendu depend de Cloudflare,
// qu'aucun test ne peut interroger depuis un runner. Ce qu'on fige, c'est
// que les marqueurs sont POSES et que la raison reste ecrite a cote.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

describe("les adresses des pages legales ne sont pas masquees par Cloudflare", () => {
  test("le composant pose les deux marqueurs officiels", () => {
    const src = lire("components/legal/SansObfuscationEmail.tsx");
    assert.match(src, /<!--email_off-->/, "le marqueur d'ouverture manque");
    assert.match(src, /<!--email_on-->/, "le marqueur de fermeture manque");
  });

  test("la raison est ecrite a cote, sinon le prochain passage les retire", () => {
    const src = lire("components/legal/SansObfuscationEmail.tsx");
    assert.match(src, /Cloudflare/, "le commentaire ne nomme pas la cause");
    assert.match(src, /__cf_email__/, "il ne nomme pas ce que Cloudflare injecte");
  });

  // Toutes les pages legales de l'Atelier passent par LegalPageView :
  // /privacy et /legal. Une seule enveloppe les couvre donc les deux.
  test("LegalPageView enveloppe les sections", () => {
    const src = lire("components/legal/LegalPageView.tsx");
    assert.match(src, /<SansObfuscationEmail>/, "les sections ne sont pas enveloppees");
    assert.match(src, /<\/SansObfuscationEmail>/, "l'enveloppe n'est pas refermee");
  });

  test("les deux ecrans legaux passent bien par ce composant", () => {
    for (const ecran of ["app/privacy/page.tsx", "app/legal/page.tsx"]) {
      assert.match(lire(ecran), /LegalPageView/, `${ecran} ne passe plus par le composant`);
    }
  });
});
