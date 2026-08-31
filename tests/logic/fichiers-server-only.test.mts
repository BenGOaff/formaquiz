// tests/logic/fichiers-server-only.test.mts
//
// LES FICHIERS QU'AUCUN TEST NE PEUT CHARGER SE PARSENT QUAND MÊME.
//
// Béné, 31 août 2026, en collant la sortie de son déploiement :
//
//   Build error occurred
//   ./lib/coach/knowledge.ts:353:54  Expected a semicolon
//
// Un backtick avait été écrit DANS une chaîne de connaissance du coach,
// qui est un `template literal`. Il l'a donc refermée, et tout ce qui
// suivait est devenu du code. Le fichier porte `import "server-only"` :
// aucun test ne peut le charger, donc rien ne l'a contredit avant le
// build de PRODUCTION.
//
// C'est le même piège que le verrou des webhooks (24 août) et que
// `objetAlerte` (31 août), mais dans sa forme la plus bête : ce n'est
// même pas une décision non testée, c'est une SYNTAXE non vérifiée.
//
// -- CE QUE CE TEST FAIT, ET POURQUOI IL NE PEUT PAS FAIRE MIEUX ------
//
// Il ne peut pas IMPORTER ces fichiers (c'est tout le problème), donc
// il les PARSE avec le compilateur TypeScript, qui est déjà là. Un
// fichier qui ne se parse pas fait rougir le test au lieu de casser le
// build sur le serveur de prod.
//
// Ça ne remplace pas `npx tsc --noEmit`, qui voit infiniment plus. Ça
// le double sur le seul point qui a vraiment coûté : une faute de
// frappe dans un gros bloc de prose, dans un fichier que le filet
// logique ne touche jamais.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import ts from "typescript";

const RACINE = process.cwd();
const DOSSIERS = ["lib", "app"];

/** Tous les .ts/.tsx du dépôt, sans node_modules ni .next. */
function fichiers(dossier: string, sortie: string[] = []): string[] {
  const abs = path.join(RACINE, dossier);
  if (!fs.existsSync(abs)) return sortie;
  for (const entree of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entree.name === "node_modules" || entree.name.startsWith(".")) continue;
    const rel = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiers(rel, sortie);
    else if (/\.tsx?$/.test(entree.name)) sortie.push(rel);
  }
  return sortie;
}

const TOUS = DOSSIERS.flatMap((d) => fichiers(d));

/** Ceux qu'aucun test ne pourra jamais importer. */
const INTESTABLES = TOUS.filter((rel) => {
  const src = fs.readFileSync(path.join(RACINE, rel), "utf8");
  return /^import\s+["']server-only["'];?$/m.test(src);
});

describe("Un fichier `server-only` se parse, même si aucun test ne peut l'importer", () => {
  test("il y en a au moins un, sinon ce test ne teste plus rien", () => {
    // Un test qui ne peut plus échouer ment (règle du 24 août).
    assert.ok(INTESTABLES.length > 0, "aucun fichier server-only trouve : le filtre est casse");
  });

  for (const rel of INTESTABLES) {
    test(`${rel} se parse`, () => {
      const src = fs.readFileSync(path.join(RACINE, rel), "utf8");
      const fichier = ts.createSourceFile(
        rel,
        src,
        ts.ScriptTarget.ESNext,
        /* setParentNodes */ false,
        rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      // `parseDiagnostics` n'est pas dans les types publics : c'est la
      // seule facon d'obtenir les erreurs de SYNTAXE sans monter un
      // programme complet (ce qui prendrait des secondes par fichier).
      const erreurs =
        (fichier as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ??
        [];
      const lisibles = erreurs.map((d) => {
        const pos = d.start != null ? fichier.getLineAndCharacterOfPosition(d.start) : null;
        const ou = pos ? `${pos.line + 1}:${pos.character + 1}` : "?";
        return `${ou} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
      });
      assert.deepEqual(lisibles, [], `${rel} ne se parse pas`);
    });
  }
});
