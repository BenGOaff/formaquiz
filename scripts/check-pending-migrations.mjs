#!/usr/bin/env node
// scripts/check-pending-migrations.mjs (FormaQuiz)
//
// Detecte AUTOMATIQUEMENT les migrations Supabase non appliquees en lisant
// TOUS les .sql de supabase/migrations/ et en testant l'existence des
// tables / colonnes qu'ils declarent. Porte du meme outil sur Tiquiz.
//
// Methode (best-effort, conservateur pour eviter les faux positifs) :
//   - CREATE TABLE [IF NOT EXISTS] <nom>            -> verifie la table
//   - ALTER TABLE <table> ADD COLUMN <col>          -> verifie la colonne
//   - Ignore : INSERT, UPDATE, DROP, CREATE INDEX/POLICY/TRIGGER/FUNCTION,
//              GRANT, NOTIFY, etc. (donc les seeds ne sont pas detectes ici)
//
// Usage (sur le serveur, env charge) :
//   cd ~/formaquiz && set -a; . .env; set +a
//   npm run check:migrations-pending
//
// Exit : 0 si tout est applique, 1 si au moins 1 migration en retard.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  console.error("Sur le serveur : cd ~/formaquiz && set -a; . .env; set +a ; puis relance.");
  process.exit(2);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function parseSql(sql) {
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
  const tables = new Set();
  const columnsByTable = new Map();

  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?(\w+)["']?/gi;
  for (const m of stripped.matchAll(createRe)) tables.add(m[1].toLowerCase());

  const alterBlockRe = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?["']?(\w+)["']?([\s\S]*?);/gi;
  for (const m of stripped.matchAll(alterBlockRe)) {
    const table = m[1].toLowerCase();
    const body = m[2];
    const addColRe = /\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?["']?(\w+)["']?/gi;
    for (const c of body.matchAll(addColRe)) {
      const col = c[1].toLowerCase();
      if (["constraint", "primary", "foreign", "unique", "check", "index"].includes(col)) continue;
      if (!columnsByTable.has(table)) columnsByTable.set(table, new Set());
      columnsByTable.get(table).add(col);
    }
  }
  return { tables, columnsByTable };
}

async function tableExists(table) {
  const { error } = await supa.from(table).select("*", { count: "exact", head: true }).limit(0);
  if (!error) return { exists: true };
  if (error.code === "PGRST205" || /relation.*does not exist/i.test(error.message)) {
    return { exists: false, reason: error.message };
  }
  return { exists: true, warning: `${error.code} ${error.message}` };
}

async function columnExists(table, col) {
  const { error } = await supa.from(table).select(col).limit(1);
  if (!error) return { exists: true };
  if (error.code === "PGRST204" || /column.*does not exist/i.test(error.message)) {
    return { exists: false, reason: error.message };
  }
  if (error.code === "PGRST205" || /relation.*does not exist/i.test(error.message)) {
    return { exists: false, reason: `TABLE ABSENTE : ${error.message}` };
  }
  return { exists: true, warning: `${error.code} ${error.message}` };
}

async function main() {
  console.log(`> check:migrations-pending FormaQuiz (${SUPABASE_URL})`);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  console.log(`  ${files.length} fichiers .sql a scanner dans supabase/migrations/`);

  let totalChecks = 0;
  let totalFails = 0;
  const failedMigrations = [];

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const { tables, columnsByTable } = parseSql(sql);
    if (tables.size === 0 && columnsByTable.size === 0) continue;

    const fails = [];
    for (const t of tables) {
      totalChecks += 1;
      const r = await tableExists(t);
      if (!r.exists) fails.push(`TABLE ${t} ABSENTE : ${r.reason}`);
    }
    for (const [t, cols] of columnsByTable) {
      for (const c of cols) {
        totalChecks += 1;
        const r = await columnExists(t, c);
        if (!r.exists) fails.push(`${t}.${c} ABSENT : ${r.reason}`);
      }
    }

    if (fails.length > 0) {
      totalFails += fails.length;
      failedMigrations.push({ file, fails });
      console.log(`\nX ${file}`);
      for (const f of fails) console.log(`    ${f}`);
    } else {
      console.log(`OK ${file}`);
    }
  }

  console.log("\n------------------------");
  console.log(`Resultat : ${totalChecks - totalFails} ok / ${totalFails} manquants sur ${totalChecks} checks (${files.length} fichiers)`);

  if (failedMigrations.length > 0) {
    console.log("\n🚨 MIGRATIONS A APPLIQUER SUR SUPABASE (FormaQuiz) :");
    for (const m of failedMigrations) console.log(`  - supabase/migrations/${m.file}`);
    console.log("\nComment appliquer : Studio FormaQuiz -> SQL Editor -> coller chaque fichier -> Run, puis relancer ce script.");
    process.exit(1);
  }
  console.log("Toutes les migrations detectables sont appliquees. ok");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
