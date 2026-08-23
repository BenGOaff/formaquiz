// tests/logic/standalone-env.test.mts
//
// LE SERVEUR STANDALONE DOIT AVOIR SES FICHIERS D'ENVIRONNEMENT.
//
// PANNE DU 22 AOÛT AU SOIR. Béné : "pourquoi j'ai tous mes contenus mais
// pas mes clients dans Tipote ?" La question contenait le diagnostic.
//
// `.next/standalone/server.js` fait `process.chdir(__dirname)`, donc Next
// cherche ses fichiers d'environnement DANS `.next/standalone/`. Next n'y
// copie rien. L'app vivait donc uniquement sur ce que PM2 gardait en
// mémoire, hérité d'un `--update-env` parfois vieux de plusieurs mois.
//
// Ce qui a produit exactement ce partage :
//   - les CONTENUS s'affichaient, parce qu'ils passent par la clé anon,
//     GRAVÉE dans le build au moment du `next build` ;
//   - les CLIENTS avaient disparu, parce qu'ils passent par la clé de
//     service, lue dans le processus, où PM2 avait poussé celle de
//     l'autre app.
//
// Le même journal portait un `Missing env var POPQUIZ_TUS_URL` pour une
// variable pourtant présente dans `.env.local` : même cause.
//
// L'ATELIER N'A PAS DE POSTBUILD, et on n'en invente pas un ce soir :
// personne n'a verifie comment `formaquiz-prod` est lance. Le test se
// limite donc ici au controle des cles. La copie du .env vit dans les
// deux autres repos, ou le postbuild existe et est verifie.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("le controle des cles regarde AUSSI le processus qui tourne", () => {
  // `pm2 env` affichait encore l'ancienne clé alors que le processus
  // tournait déjà avec la bonne. `/proc/<pid>/environ` ne ment pas.
  //
  // Et la détection se fait sur le DOSSIER DE TRAVAIL du processus, pas
  // sur sa ligne de commande : `server.js` fait `chdir(__dirname)`, donc
  // le cwd est fiable, que PM2 ait lancé un chemin absolu ou relatif.
  // Une première version regardait la ligne de commande et ratait le
  // second cas.
  const src = fs.readFileSync(path.join(process.cwd(), "scripts/check-supabase-keys.mjs"), "utf8");
  assert.ok(src.includes("/proc"), "le controle ne lit plus l'environnement du processus");
  assert.ok(src.includes("readlinkSync"), "la detection ne passe plus par le dossier de travail");
  assert.ok(
    !/cmdline[\s\S]{0,200}includes\(attendu\)/.test(src),
    "la detection est revenue a la ligne de commande, qui rate un lancement relatif",
  );
});
