#!/usr/bin/env node
// scripts/ingest-coach-rag.mjs
//
// Indexe le contenu (formation + doc fonctionnelle Tiquiz) dans la table
// coach_chunks, pour le RAG du coach. Découpe le markdown en chunks,
// calcule les embeddings EN LOCAL (multilingual-e5-small, aucune clé), et
// remplit la table (rebuild complet).
//
// GOUVERNANCE : liste blanche stricte ci-dessous. On n'indexe QUE du
// contenu destiné aux élèves. JAMAIS de specs internes, de marges
// revendeur, de secrets ou de code : tout ce qui est indexé peut ressortir
// dans une réponse du coach.
//
// Usage (sur le serveur, après un déploiement ou une modif de contenu) :
//   cd ~/quizing && set -a; . .env; set +a && npm run rag:ingest
// Le script charge aussi le .env tout seul (best-effort).
//
// Env : SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
//       TIQUIZ_REPO_PATH (optionnel, défaut ../tiquiz-app) pour la doc Tiquiz.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env as xenovaEnv } from "@xenova/transformers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── .env best-effort (comme scripts/check-pending-migrations.mjs) ──
function loadDotenv() {
  for (const name of [".env", ".env.local"]) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadDotenv();

// Mode aperçu : découpe et compte les chunks sans embeddings ni écriture DB.
// Utile pour vérifier ce qui sera indexé. Usage : npm run rag:ingest -- --dry
const DRY = process.argv.includes("--dry");

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY;

if (!DRY && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  console.error("ENV manquantes : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── LISTE BLANCHE des sources (contenu destiné aux élèves uniquement) ──
const CONTENU = join(ROOT, "contenu");
const TIQUIZ_REPO =
  process.env.TIQUIZ_REPO_PATH || join(ROOT, "..", "tiquiz-app");

// Dossiers de formation indexés (student-facing). Exclus volontairement :
// "tournage" (notes de tournage), "exemples growth hacks" (PDF/captures).
const CONTENU_DIRS = [
  "parcours",
  "bonus",
  "ressources-eleves",
  "structure",
  "support-jours",
];

// Doc Tiquiz : VOLONTAIREMENT VIDE. Vérification faite le 26/07/2026 :
// CAHIER_DES_CHARGES.md et PRODUCT_BRIEF.md sont des docs DÉVELOPPEUR /
// stratégie (noms de variables secrètes SYSTEME_IO_WEBHOOK_SECRET /
// RESELLER_SECRETS_KEY, architecture de sécurité HMAC + AES, chemins de
// fichiers, schémas d'auth des endpoints, comparaisons concurrents). Rien de
// tout ça ne doit pouvoir ressortir dans une réponse du coach à un élève.
// Le fonctionnement Tiquiz destiné aux élèves est déjà couvert par le bloc
// vérifié TIQUIZ_FACTS (lib/coach/knowledge.ts). Pour ajouter une doc Tiquiz
// student-safe, dépose un .md dédié dans contenu/ (il sera indexé).
const TIQUIZ_DOCS = [];

function listMarkdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listMarkdown(p));
    else if (/\.(md|txt)$/i.test(name)) out.push(p);
  }
  return out;
}

function collectSources() {
  const files = [];
  for (const d of CONTENU_DIRS) {
    for (const f of listMarkdown(join(CONTENU, d))) {
      files.push({ path: f, source: "formation/" + relative(CONTENU, f).replace(/\\/g, "/") });
    }
  }
  for (const doc of TIQUIZ_DOCS) {
    const p = join(TIQUIZ_REPO, doc);
    if (existsSync(p)) files.push({ path: p, source: "tiquiz/" + doc });
    else console.warn(`(doc Tiquiz absente, ignorée) ${p}`);
  }
  return files;
}

// ── Découpage markdown en chunks (~1200 caractères, coupe sur les titres
//    et les paragraphes, avec un léger chevauchement). ──
const MAX_CHARS = 1200;
const OVERLAP = 150;

function chunkMarkdown(text, fileTitle) {
  // Sections délimitées par les titres markdown ; on garde le dernier titre
  // vu comme "titre" du chunk pour l'attribution.
  const lines = text.replace(/\r/g, "").split("\n");
  const sections = [];
  let curTitle = fileTitle;
  let buf = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) sections.push({ title: curTitle, body });
    buf = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      curTitle = h[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  const chunks = [];
  for (const sec of sections) {
    if (sec.body.length <= MAX_CHARS) {
      chunks.push({ title: sec.title, content: sec.body });
      continue;
    }
    // Section longue : découpe par paragraphes en respectant MAX_CHARS.
    const paras = sec.body.split(/\n{2,}/);
    let cur = "";
    for (const para of paras) {
      if ((cur + "\n\n" + para).length > MAX_CHARS && cur) {
        chunks.push({ title: sec.title, content: cur.trim() });
        cur = cur.slice(Math.max(0, cur.length - OVERLAP)) + "\n\n" + para;
      } else {
        cur = cur ? cur + "\n\n" + para : para;
      }
    }
    if (cur.trim()) chunks.push({ title: sec.title, content: cur.trim() });
  }
  // Filtre le bruit (chunks trop courts).
  return chunks.filter((c) => c.content.length >= 40);
}

async function main() {
  const files = collectSources();
  console.log(`▶ ${files.length} fichier(s) source à indexer.`);

  // Prépare tous les chunks.
  const allChunks = [];
  for (const f of files) {
    const raw = readFileSync(f.path, "utf8");
    const fileTitle = f.source.split("/").pop().replace(/\.(md|txt)$/i, "");
    const chunks = chunkMarkdown(raw, fileTitle);
    chunks.forEach((c, i) =>
      allChunks.push({ source: f.source, title: c.title, chunk_index: i, content: c.content }),
    );
  }

  if (DRY) {
    const bySource = {};
    for (const c of allChunks) bySource[c.source] = (bySource[c.source] ?? 0) + 1;
    const lens = allChunks.map((c) => c.content.length).sort((a, b) => a - b);
    console.log(`\n▶ APERÇU (--dry) : ${allChunks.length} chunks depuis ${files.length} fichiers.`);
    console.log(
      `  taille chunk : min ${lens[0]} / médiane ${lens[Math.floor(lens.length / 2)]} / max ${lens[lens.length - 1]} caractères`,
    );
    console.log("  par fichier :");
    for (const [s, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${n}\t${s}`);
    }
    console.log(`\n  exemple de chunk :\n  --- ${allChunks[0]?.source} > ${allChunks[0]?.title} ---`);
    console.log("  " + (allChunks[0]?.content.slice(0, 240) ?? "").replace(/\n/g, "\n  ") + "...");
    return;
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`▶ ${allChunks.length} chunks. Chargement du modèle d'embeddings...`);

  xenovaEnv.cacheDir =
    process.env.TRANSFORMERS_CACHE || join(ROOT, ".cache", "transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");

  // Embeddings (séquentiel, CPU : quelques minutes pour tout le corpus).
  for (let i = 0; i < allChunks.length; i++) {
    const c = allChunks[i];
    const out = await extractor(`passage: ${c.content.replace(/\s+/g, " ").trim()}`, {
      pooling: "mean",
      normalize: true,
    });
    c.embedding = `[${Array.from(out.data).join(",")}]`;
    if ((i + 1) % 25 === 0 || i + 1 === allChunks.length) {
      console.log(`  embeddings ${i + 1}/${allChunks.length}`);
    }
  }

  // Rebuild complet : on vide puis on réinsère par lots.
  console.log("▶ Réécriture de la table coach_chunks...");
  const { error: delErr } = await supa
    .from("coach_chunks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    console.error("Échec du vidage :", delErr.message);
    process.exit(1);
  }

  const BATCH = 100;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const rows = allChunks.slice(i, i + BATCH).map((c) => ({
      source: c.source,
      title: c.title,
      chunk_index: c.chunk_index,
      content: c.content,
      embedding: c.embedding,
    }));
    const { error } = await supa.from("coach_chunks").insert(rows);
    if (error) {
      console.error("Échec d'insertion :", error.message);
      process.exit(1);
    }
  }

  console.log(`✓ Indexé : ${allChunks.length} chunks depuis ${files.length} fichiers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
