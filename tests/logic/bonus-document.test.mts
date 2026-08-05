// tests/logic/bonus-document.test.mts
//
// Béné, 5 août 2026 : "dis donc t'as fait aucun effort sur la
// présentation des longs blocs de texte ! Genre : des cases, des
// couleurs, des blocs séparés, une logique, facile à lire et
// comprendre, visuellement agréable et téléchargeable en pdf aussi."
//
// Le rendu passait par `toHtml`, qui sait faire des titres, du gras et
// des listes, et rien d'autre. À l'écran : un mur, avec des "---"
// affichés littéralement et des titres qui ne se distinguaient pas d'un
// paragraphe.
//
// Ce fichier fige la STRUCTURE. C'est elle qui porte la lisibilité, et
// c'est elle que l'écran ET le PDF lisent, pour qu'ils ne puissent pas
// raconter deux choses différentes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { docToPlain, hasStructure, parseBonusDoc } from "../../lib/bonus/document.ts";
import { buildPrintableHtml } from "../../lib/bonus/printable.ts";

// Un extrait fidèle de ce que le générateur a vraiment produit.
const REEL = `## Ce que tu vas produire
Un swipe file de 7 questions de quiz annotées, une par profil de blocage.

---

## La structure, section par section

### Une phrase d'entrée, sans titre
Pas de "bienvenue". Une seule phrase qui nomme ce que le visiteur vient de vivre.

### Les 7 questions, une par une
Chaque question est présentée avec trois éléments.

- **La question brute**, telle qu'elle apparaîtrait dans un vrai quiz.
- **Ce qu'elle fait**, en une phrase.
- **Comment l'adapter**, avec un exemple dans un univers différent.

## Avec quel outil, et en combien de temps
**Outil : Google Docs**, partagé en lecture, lien public.

Jour 1. Ouvre ton compte et regarde tes 10 derniers contenus.
Jour 2. Écris 3 variations de celui qui a marché.
Jour 3. Publie le premier.`;

// ── Ce qui rendait l'écran illisible ─────────────────────────────────

test("les filets horizontaux disparaissent au lieu de s'afficher", () => {
  // "---" apparaissait littéralement dans le texte rendu.
  const doc = parseBonusDoc(REEL);
  const plain = docToPlain(doc);
  assert.doesNotMatch(plain, /^-{3,}$/m);
  assert.doesNotMatch(buildPrintableHtml(doc, { title: "T" }), />-{3,}</);
});

test("les titres deviennent des sections, pas des paragraphes", () => {
  const doc = parseBonusDoc(REEL);
  assert.equal(doc.sections.length, 3);
  assert.deepEqual(
    doc.sections.map((s) => s.title),
    ["Ce que tu vas produire", "La structure, section par section", "Avec quel outil, et en combien de temps"],
  );
});

test("un sous-titre reste DANS sa section", () => {
  // Sinon "Une phrase d'entrée" devenait une section de meme niveau que
  // "La structure", et la hierarchie disparaissait.
  const doc = parseBonusDoc(REEL);
  const structure = doc.sections[1];
  const subs = structure.blocks.filter((b) => b.kind === "sub");
  assert.equal(subs.length, 2);
  assert.equal(subs[0].kind === "sub" && subs[0].title, "Une phrase d'entrée, sans titre");
});

test("une liste reste une liste", () => {
  const doc = parseBonusDoc(REEL);
  const sub = doc.sections[1].blocks.find(
    (b) => b.kind === "sub" && b.title.startsWith("Les 7 questions"),
  );
  assert.ok(sub && sub.kind === "sub");
  const list = sub.blocks.find((b) => b.kind === "list");
  assert.ok(list && list.kind === "list");
  assert.equal(list.items.length, 3);
});

test("un plan en jours sort ses numéros du texte", () => {
  // C'est ce qui rend un plan parcourable d'un coup d'oeil : le numero
  // vit dans une pastille, pas noye dans la phrase.
  const doc = parseBonusDoc(REEL);
  const steps = doc.sections[2].blocks.find((b) => b.kind === "steps");
  assert.ok(steps && steps.kind === "steps");
  assert.equal(steps.items.length, 3);
  assert.equal(steps.items[0].label, "Jour 1");
  assert.match(steps.items[0].text, /^Ouvre ton compte/);
});

test("une seule ligne numérotée reste une phrase", () => {
  // "1. Le fichier est heberge sur un drive" tout seul n'est pas un plan.
  const doc = parseBonusDoc("## T\n1. Une seule ligne qui commence par un chiffre.");
  assert.equal(doc.sections[0].blocks[0].kind, "para");
});

// ── Ce qui ne doit jamais casser ─────────────────────────────────────

test("un texte sans aucune section ne fabrique pas de fausse structure", () => {
  const doc = parseBonusDoc("Juste un paragraphe, sans titre.");
  assert.equal(hasStructure(doc), false);
  assert.equal(doc.sections.length, 0);
  assert.equal(doc.lead.length, 1);
});

test("un titre collé au texte suivant ne perd rien", () => {
  // Le modele oublie regulierement la ligne vide.
  const doc = parseBonusDoc("## Titre\nLa phrase juste apres.");
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].blocks.length, 1);
});

test("un markdown vide ne jette pas", () => {
  for (const v of ["", "   ", "\n\n\n", "---"]) {
    const doc = parseBonusDoc(v);
    assert.equal(doc.sections.length, 0);
    assert.doesNotThrow(() => buildPrintableHtml(doc, { title: "T" }));
  }
});

// ── Le PDF lit le MEME document ──────────────────────────────────────

test("le PDF reprend les sections et les etapes de l'ecran", () => {
  const doc = parseBonusDoc(REEL);
  const html = buildPrintableHtml(doc, { title: "Mon bonus" });
  assert.match(html, /Mon bonus/);
  assert.match(html, /Ce que tu vas produire/);
  assert.match(html, /class="badge">Jour 1</);
  assert.equal((html.match(/<section>/g) ?? []).length, 3);
});

test("le PDF echappe ce qui vient du modele", () => {
  // Ce texte finit dans un document HTML : une balise ecrite par le
  // modele ne doit pas s'executer.
  const doc = parseBonusDoc('## <img src=x onerror=alert(1)>\nUn <script>alert(2)</script> ici.');
  const html = buildPrintableHtml(doc, { title: '"><script>alert(3)</script>' });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
});

test("le gras survit, les balises non", () => {
  const doc = parseBonusDoc("## T\n**Outil : Google Docs**, partagé en lecture.");
  const html = buildPrintableHtml(doc, { title: "T" });
  assert.match(html, /<strong>Outil : Google Docs<\/strong>/);
});

test("une couleur d'accent invalide ne casse pas la feuille de style", () => {
  const doc = parseBonusDoc("## T\nx");
  const html = buildPrintableHtml(doc, { title: "T", accent: "red; } body { display:none" });
  assert.doesNotMatch(html, /display:none/);
  assert.match(html, /#5D6CDB/, "on retombe sur la couleur de marque");
});

// ── Et l'ecran passe bien par ce modele ──────────────────────────────

test("l'ecran n'a plus le droit de rendre le markdown brut", () => {
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(client, /parseBonusDoc\(/);
  assert.doesNotMatch(client, /toHtml\(/, "le rendu passe par le document, jamais par toHtml");
});

