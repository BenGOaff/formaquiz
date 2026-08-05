// tests/logic/bonus-editor.test.mts
//
// Béné, 5 août 2026 : "quand on veut modifier un truc dans le générateur
// de bonus, on tombe sur le markdown au lieu d'un bel éditeur alors
// qu'on l'a partout cet éditeur. C'est moche."
//
// Le document généré vit en markdown : c'est lui qui est découpé en
// sections, affiché à l'écran et imprimé en PDF. Éditer, c'était donc
// forcément éditer le markdown, et on le montrait tel quel.
//
// `lib/bonus/markdownHtml.ts` fait le pont vers l'éditeur de l'Atelier.
// Ce fichier fige la seule chose qui compte vraiment : **on ne perd rien
// en passant par l'éditeur.**

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { editorHtmlToMarkdown, markdownToEditorHtml } from "../../lib/bonus/markdownHtml.ts";
import { parseBonusDoc } from "../../lib/bonus/document.ts";

const REEL = `## Ce que tu vas produire

Un **swipe file** de 7 questions, une par profil de blocage.

## La structure, section par section

### Les 7 questions

- **La question brute**, telle qu'elle apparaîtrait.
- Ce qu'elle fait, en une phrase.

## Le prompt a copier dans Claude ou ChatGPT

\`\`\`
Tu es developpeur front. Ecris UN SEUL fichier HTML.

## Les champs
- Visiteurs par mois
- Prix moyen
\`\`\`

Relis, puis publie la page.`;

// ── L'aller-retour : ce qui compte vraiment ──────────────────────────

test("passer par l'éditeur ne perd rien", () => {
  const back = editorHtmlToMarkdown(markdownToEditorHtml(REEL));
  for (const morceau of [
    "## Ce que tu vas produire",
    "**swipe file**",
    "### Les 7 questions",
    "- Ce qu'elle fait, en une phrase.",
    "Relis, puis publie la page.",
  ]) {
    assert.ok(back.includes(morceau), `perdu : ${morceau}`);
  }
});

test("l'aller-retour est STABLE", () => {
  // Un aller-retour qui derive un peu a chaque passage finit par tout
  // casser au bout de cinq corrections : c'est le pire des cas, parce
  // qu'il n'est visible qu'apres coup.
  const un = editorHtmlToMarkdown(markdownToEditorHtml(REEL));
  const deux = editorHtmlToMarkdown(markdownToEditorHtml(un));
  assert.equal(deux, un);
});

test("la structure du document survit à l'aller-retour", () => {
  // C'est elle qui porte les sections colorees a l'ecran et dans le PDF.
  const avant = parseBonusDoc(REEL);
  const apres = parseBonusDoc(editorHtmlToMarkdown(markdownToEditorHtml(REEL)));
  assert.deepEqual(
    apres.sections.map((s) => s.title),
    avant.sections.map((s) => s.title),
  );
});

test("le prompt garde ses retours à la ligne et ses dièses", () => {
  // Un prompt relu comme du markdown ressortirait en titres et en listes,
  // donc incopiable. C'est le seul bloc a proteger integralement.
  const html = markdownToEditorHtml(REEL);
  assert.match(html, /<pre>/);
  const back = editorHtmlToMarkdown(html);
  const doc = parseBonusDoc(back);
  const code = doc.sections[2].blocks.find((b) => b.kind === "code");
  assert.ok(code && code.kind === "code");
  assert.match(code.text, /^Tu es developpeur front/);
  assert.match(code.text, /## Les champs/, "les dieses restent DANS le prompt");
  assert.match(code.text, /- Visiteurs par mois/);
});

// ── Ce que la barre d'outils produit ─────────────────────────────────

test("les titres de l'éditeur redeviennent des titres du document", () => {
  const md = editorHtmlToMarkdown("<h2>Un titre</h2><h3>Un sous-titre</h3><p>Du texte.</p>");
  assert.match(md, /^## Un titre$/m);
  assert.match(md, /^### Un sous-titre$/m);
  assert.match(md, /^Du texte\.$/m);
});

test("une liste à puces reste une liste", () => {
  const md = editorHtmlToMarkdown("<ul><li>Un</li><li>Deux</li></ul>");
  assert.equal(md, "- Un\n- Deux");
});

test("une liste numérotée garde ses numéros", () => {
  // Un plan en 7 jours qui redevient une liste a puces perd ce qui le
  // rend lisible : `parseBonusDoc` en fait des etapes a pastilles.
  const md = editorHtmlToMarkdown("<ol><li>Ouvre ton compte</li><li>Ecris trois variations</li></ol>");
  assert.equal(md, "1. Ouvre ton compte\n2. Ecris trois variations");
  const steps = parseBonusDoc("## T\n" + md).sections[0].blocks.find((b) => b.kind === "steps");
  assert.ok(steps && steps.kind === "steps");
  assert.equal(steps.items[0].label, "1");
});

test("gras, italique, code et liens font l'aller-retour", () => {
  const html = "<p>Du <strong>gras</strong>, de l'<em>italique</em> et un <a href=\"https://tipote.fr\">lien</a>.</p>";
  const md = editorHtmlToMarkdown(html);
  assert.match(md, /\*\*gras\*\*/);
  assert.match(md, /\*italique\*/);
  assert.match(md, /\[lien\]\(https:\/\/tipote\.fr\)/);
  // Et l'editeur sait les relire.
  const again = markdownToEditorHtml(md);
  assert.match(again, /<strong>gras<\/strong>/);
  assert.match(again, /<em>italique<\/em>/);
  assert.match(again, /<a href="https:\/\/tipote\.fr">lien<\/a>/);
});

// ── Ce que `contentEditable` produit vraiment ────────────────────────

test("les habits de execCommand ne ressortent pas à l'écran", () => {
  // Le navigateur enveloppe a tout va : `<span style>`, `<font>`, `<div>`
  // imbriques. Rien de tout ca ne doit finir dans le texte.
  const sale =
    '<div><span style="color: rgb(0,0,0)"><font face="Arial">Une phrase.</font></span></div>' +
    "<div><br></div><div>Une autre.</div>";
  const md = editorHtmlToMarkdown(sale);
  assert.doesNotMatch(md, /<|style=|font/);
  assert.match(md, /Une phrase\./);
  assert.match(md, /Une autre\./);
});

test("une balise de style vide ne fabrique pas d'astérisques", () => {
  // `<strong></strong>` reste souvent derriere une suppression : sans
  // garde, il ressortait en `****` au milieu d'une phrase.
  const md = editorHtmlToMarkdown("<p>Avant <strong></strong>apres.</p>");
  assert.doesNotMatch(md, /\*/);
});

test("l'espace de bord ne rentre pas dans les marqueurs", () => {
  // `** mot**` n'est pas du gras : c'est deux asterisques et un mot.
  const md = editorHtmlToMarkdown("<p>Un <strong> mot </strong>ici.</p>");
  assert.match(md, /\*\*mot\*\*/);
  assert.doesNotMatch(md, /\*\* /);
});

test("les entités reviennent en vrais caractères", () => {
  const md = editorHtmlToMarkdown("<p>Prix&nbsp;: 30&nbsp;&amp;&nbsp;plus &lt;fin&gt;</p>");
  assert.match(md, /Prix : 30 & plus <fin>/);
});

test("un contenu vide ne jette pas", () => {
  for (const v of ["", "   ", "<p></p>", "<div><br></div>"]) {
    assert.doesNotThrow(() => editorHtmlToMarkdown(v));
    assert.doesNotThrow(() => markdownToEditorHtml(v));
  }
});

test("les filets horizontaux ne reviennent pas", () => {
  // `parseBonusDoc` les jette : les garder ici les ferait reapparaitre
  // dans le markdown a chaque sauvegarde.
  assert.doesNotMatch(markdownToEditorHtml("## T\n\n---\n\nx"), /---/);
});

// ── L'écran s'en sert vraiment ───────────────────────────────────────

test("l'édition ne montre plus de markdown brut", () => {
  const src = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /RichTextEditor/);
  assert.match(src, /markdownToEditorHtml\(/);
  assert.match(src, /editorHtmlToMarkdown\(/);
  // Le champ "promesse de ton offre" reste une zone de texte ordinaire,
  // et c'est tres bien : ce qui est proscrit, c'est le DOCUMENT rendu en
  // police a chasse fixe. Viser `<textarea>` tout court ferait rougir ce
  // test pour la mauvaise raison, donc il finirait desactive.
  assert.doesNotMatch(src, /font-mono/, "le document ne s'edite plus en markdown brut");
});

test("le rendu sait afficher tout ce que l'éditeur produit", () => {
  // Sinon elle met un mot en italique et voit des asterisques chez son
  // visiteur. Les deux rendus (ecran et PDF) doivent couvrir la meme
  // liste.
  const ecran = readFileSync(new URL("../../components/BonusDocument.tsx", import.meta.url), "utf8");
  const pdf = readFileSync(new URL("../../lib/bonus/printable.ts", import.meta.url), "utf8");
  for (const src of [ecran, pdf]) {
    assert.match(src, /<strong>\$1<\/strong>/);
    assert.match(src, /<em>\$2<\/em>/);
    assert.match(src, /\\\[\(\[\^\\\]\]\+\)\\\]/, "les liens sont rendus");
  }
});

test("un lien écrit par un modèle ne peut pas exécuter de script", () => {
  const ecran = readFileSync(new URL("../../components/BonusDocument.tsx", import.meta.url), "utf8");
  assert.match(ecran, /https\?:\\\/\\\//, "seuls http, https, mailto et les chemins passent");
  assert.match(ecran, /safeUrl/);
});

test("le sélecteur de schémas ne s'affiche pas hors du parcours", () => {
  // Il insere un shortcode `[[figure:...]]` que SEUL le rendu du parcours
  // sait resoudre : ailleurs, il ressortirait en texte brut.
  const src = readFileSync(
    new URL("../../components/admin/RichTextEditor.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /figures = true/, "defaut vrai : aucun appel existant ne change");
  assert.match(src, /\{figures && \(/);
});
