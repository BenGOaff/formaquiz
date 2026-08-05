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
import { SECTION_ACCENTS, sectionAccent } from "../../lib/bonus/accents.ts";

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
  assert.match(html, /class="badge a\d">Jour 1</);
  assert.equal((html.match(/<section class="a\d">/g) ?? []).length, 3);
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


// ── La couleur : l'Atelier n'est pas le quiz d'une cliente ───────────
//
// Béné, 5 août 2026 : "ça c'était pour les quiz des users, ceux qu'ils
// affichent à leurs visiteurs ! Dans l'Atelier tu peux te lâcher et
// réutiliser le branding de l'Atelier et de Tiquiz ! Ça n'est pas
// montré aux visiteurs de nos users !"

test("les sections sont colorées, et le cycle est stable", () => {
  // Stable : regenerer un bloc ne redistribue pas les couleurs sous ses
  // yeux, et la premiere section est toujours a la couleur de la marque.
  assert.equal(sectionAccent(0).hex, "#5D6CDB", "la marque de l'Atelier et de Tiquiz");
  assert.equal(sectionAccent(0).key, sectionAccent(SECTION_ACCENTS.length).key);
  assert.notEqual(sectionAccent(0).key, sectionAccent(1).key);
});

test("un index absurde ne casse pas le rendu", () => {
  for (const i of [-1, -7, NaN, 1.5, 999]) {
    assert.ok(sectionAccent(i).hex.startsWith("#"), String(i));
  }
});

test("les classes Tailwind sont ecrites en toutes lettres", () => {
  // Tailwind ne genere que ce qu'il voit dans le source : une classe
  // fabriquee par concatenation sort SANS style, et personne ne s'en
  // apercoit avant de regarder l'ecran.
  const src = readFileSync(new URL("../../lib/bonus/accents.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /`(bg|text|border)-\$\{/, "aucune classe construite a l'execution");
  for (const a of SECTION_ACCENTS) {
    assert.match(a.badge, /^bg-[a-z]+-\d{2,3}/, `${a.key} : pastille`);
    assert.match(a.head, /^bg-[a-z]+-\d{2,3}/, `${a.key} : en-tete`);
  }
});

test("le PDF porte les MEMES couleurs que l'ecran", () => {
  // Deux palettes ecrites separement divergent au premier ajustement, et
  // personne ne le voit avant d'imprimer.
  const doc = parseBonusDoc(REEL);
  const html = buildPrintableHtml(doc, { title: "Mon bonus" });
  for (let i = 0; i < doc.sections.length; i++) {
    assert.ok(html.includes(sectionAccent(i).hex), `la section ${i + 1} garde sa couleur`);
  }
  assert.match(html, /class="cover"/, "le titre a son bandeau de marque");
});

// ── Le prompt à copier vit dans son propre bloc (5 août 2026) ────────

const AVEC_PROMPT = `## Le prompt a copier dans Claude ou ChatGPT

Colle ce prompt tel quel.

\`\`\`
Tu es developpeur front. Ecris UN SEUL fichier HTML autonome.

## Les champs
- Visiteurs par mois
- Prix moyen

1. Calcule visiteurs * 0,05 * prix
2. Affiche le resultat en euros
\`\`\`

Relis, puis publie la page.`;

test("un bloc de code n'est pas decoupe en titres, listes et etapes", () => {
  // Un prompt contient des dieses, des tirets et des chiffres. Parses
  // comme du markdown, il ressortait en morceaux, donc incopiable.
  const doc = parseBonusDoc(AVEC_PROMPT);
  const code = doc.sections[0].blocks.find((b) => b.kind === "code");
  assert.ok(code && code.kind === "code");
  assert.match(code.text, /^Tu es developpeur front/);
  assert.match(code.text, /## Les champs/, "les dieses restent DANS le prompt");
  assert.match(code.text, /- Visiteurs par mois/, "les tirets aussi");
  assert.equal(doc.sections.length, 1, "aucune section fabriquee depuis le prompt");
});

test("les retours a la ligne du prompt sont conserves", () => {
  const doc = parseBonusDoc(AVEC_PROMPT);
  const code = doc.sections[0].blocks.find((b) => b.kind === "code");
  assert.ok(code && code.kind === "code");
  assert.ok(code.text.includes("\n"), "un prompt sur une seule ligne est illisible");
});

test("une cloture jamais refermee n'avale pas la fin du document", () => {
  // Le modele oublie regulierement le ``` final.
  const doc = parseBonusDoc("## T\n```\nligne de prompt\nautre ligne");
  const code = doc.sections[0].blocks.find((b) => b.kind === "code");
  assert.ok(code && code.kind === "code");
  assert.match(code.text, /autre ligne/);
});

test("le PDF garde le prompt en bloc, pas en paragraphe", () => {
  const html = buildPrintableHtml(parseBonusDoc(AVEC_PROMPT), { title: "T" });
  assert.match(html, /<pre class="code">/);
  assert.match(html, /white-space: pre-wrap/);
  assert.doesNotMatch(html, /<script/);
});

test("le prompt a son bouton Copier a l'ecran", () => {
  // C'est tout l'interet : elle le colle dans Claude ou ChatGPT.
  const src = readFileSync(new URL("../../components/BonusDocument.tsx", import.meta.url), "utf8");
  assert.match(src, /kind === "code"/);
  assert.match(src, /whitespace-pre-wrap/);
  assert.match(src, /clipboard\.writeText/);
});
