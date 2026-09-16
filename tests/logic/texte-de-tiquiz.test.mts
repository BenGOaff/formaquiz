// tests/logic/texte-de-tiquiz.test.mts
//
// CE QUI ARRIVE DE TIQUIZ N'AFFICHE JAMAIS UNE ENTITE EN CLAIR
// (retour d'un client via Bene, 16 septembre 2026).
//
// « j'ai encore des putains de "Quelle note donneriez-vous a la structure
// de l'entreprise&nbsp;?" !!! Il faut vraiment faire le tour et supprimer
// ca aussi bien cote users que visiteurs. »
//
// L'ATELIER N'EST PAS DANS LE MEME CAS QUE SES DEUX JUMEAUX, ET C'EST
// MESURE : il n'a ni DOMPurify, ni `lib/frenchTypography.ts`. Il ne
// FABRIQUE donc pas l'entite (c'est le serialiseur de DOMPurify qui la
// fabrique chez Tiquiz et Tipote, en reencodant l'espace insecable que
// la typographie francaise vient d'inserer). Il ne fait qu'INGERER le
// titre d'un quiz que Tiquiz lui envoie.
//
// La moitie qui le concerne est donc le DECODAGE, et elle vit ici.
// C'est pour ca que l'Atelier ne porte PAS `lib/texteBrut.ts` : la
// raison est ecrite dans `lib/integrations/tiquiz.ts`, a cote de la
// reexportation.
//
// CE QUI MANQUAIT : les formes NUMERIQUES. La liste d'entites etait
// recopiee a la main, donc elle en oubliait -- c'est la mecanique meme
// du "ca revient toujours".

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { sansCommentaires } from "./aide/sansCommentaires.mts";

import { stripTiquizHtml } from "@/lib/integrations/texteTiquiz";

test("ce que le client a vu : l'entite ne sort jamais en clair", () => {
  const recu = "Quelle note donneriez-vous a la structure de l'entreprise&nbsp;?";
  const vu = stripTiquizHtml(recu);
  assert.ok(!vu.includes("&nbsp;"), vu);
  assert.ok(vu.endsWith("l'entreprise ?"), vu);
});

test("les formes NUMERIQUES de l'insecable sont couvertes", () => {
  // C'est le trou reel : `&#160;` et `&#x00a0;` sont le MEME caractere
  // que `&nbsp;`, et la liste recopiee a la main ne les connaissait pas.
  for (const forme of ["&#160;", "&#x00a0;", "&#xA0;"]) {
    const vu = stripTiquizHtml(`entreprise${forme}?`);
    assert.ok(!/&#/.test(vu), `${forme} -> ${vu}`);
    assert.equal(vu, "entreprise ?");
  }
});

test("une lettre accentuee encodee redevient la lettre", () => {
  // `&eacute;` n'etait pas dans la liste, donc il sortait en clair ; sa
  // forme numerique non plus.
  assert.equal(stripTiquizHtml("Strat&#233;gie"), "Stratégie");
  assert.equal(stripTiquizHtml("Strat&#xe9;gie"), "Stratégie");
});

test("un titre qui contient vraiment le texte `&nbsp;` le garde", () => {
  // `&amp;` se decode EN DERNIER, sinon on double-decode : une creatrice
  // qui ecrit le mot `&nbsp;` dans son titre le verrait disparaitre.
  assert.equal(stripTiquizHtml("le code &amp;nbsp; sert a"), "le code &nbsp; sert a");
});

test("les balises partent, le texte reste lisible", () => {
  assert.equal(
    stripTiquizHtml('Ton meilleur quiz : <div style="color:red">Le grand test</div>'),
    "Ton meilleur quiz : Le grand test",
  );
});

test("la fonction vit dans un module PUR, donc un test peut la charger", () => {
  // C'est la raison d'etre de `texteTiquiz.ts`. `tiquiz.ts` importe
  // `server-only` et `supabaseAdmin` : tant que la fonction y vivait,
  // AUCUN test ne pouvait l'exercer (regle du 1er aout).
  // ON RETIRE LES COMMENTAIRES D'ABORD. Sans ca, le controle tombe sur
  // sa PROPRE explication ("ni `server-only`, ni `supabaseAdmin`") et
  // rougit sur un fichier parfaitement pur.
  const src = sansCommentaires(readFileSync("lib/integrations/texteTiquiz.ts", "utf8"));
  for (const interdit of ["server-only", "supabaseAdmin", "next/headers", "node:fs"]) {
    assert.ok(!src.includes(interdit), `texteTiquiz.ts ne doit pas importer ${interdit}`);
  }
  // Et l'ancien chemin continue de marcher : les appels existants ne
  // changent pas.
  const pont = sansCommentaires(readFileSync("lib/integrations/tiquiz.ts", "utf8"));
  assert.ok(
    /export \{ stripTiquizHtml \} from "\.\/texteTiquiz"/.test(pont),
    "`tiquiz.ts` doit reexporter `stripTiquizHtml`",
  );
});
