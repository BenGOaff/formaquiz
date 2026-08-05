import { test } from "node:test";
import assert from "node:assert/strict";
import { bonusShape } from "../../lib/bonus/shape.ts";

// Béné, 5 août 2026 : "on peut plutôt demander à Claude ou GPT de coder
// ça (...) 1000000 fois plus simple et moderne !!" Le format choisi
// decide de la forme, une fois, ici : le modele ne doit plus improviser
// un outil different a chaque generation.

test("ce qui se manipule devient une page", () => {
  for (const f of ["calculateur", "Calculateur", "audit personnalisé", "GPT ou générateur"]) {
    assert.equal(bonusShape(f), "page", f);
  }
});

test("ce qui se lit reste un document", () => {
  for (const f of ["checklist", "template", "swipe file", "workbook", "plan d'action", "pack de prompts"]) {
    assert.equal(bonusShape(f), "document", f);
  }
});

test("ce qui s'organise n'a rien a fabriquer", () => {
  for (const f of ["atelier live", "challenge", "podcast privé", "accès à une partie de l'offre"]) {
    assert.equal(bonusShape(f), "acces", f);
  }
});

test("les accents et la casse ne changent rien", () => {
  // Le format revient du modele : il ecrit "Audit Personnalise" aussi
  // souvent que "audit personnalisé".
  assert.equal(bonusShape("Audit Personnalise"), "page");
  assert.equal(bonusShape("  CALCULATEUR  "), "page");
});

test("un format invente est lu sur ses mots", () => {
  assert.equal(bonusShape("simulateur de perte mensuelle"), "page");
  assert.equal(bonusShape("générateur de titres"), "page");
});

test("l'inconnu retombe sur le document, jamais sur la page", () => {
  // Se tromper vers le document fait perdre une occasion ; se tromper
  // vers la page envoie coder une soiree pour rien.
  for (const f of ["", "   ", "quelque chose de nouveau", "ebook"]) {
    assert.equal(bonusShape(f), "document", JSON.stringify(f));
  }
});
