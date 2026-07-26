// lib/coach/embedder.ts
// Embeddings LOCAUX (aucune API externe, aucune clé) pour le RAG du coach.
// Modèle multilingual-e5-small (384 dimensions) exécuté via transformers.js
// (ONNX) directement dans le process Node. Français bien géré.
//
// e5 attend un préfixe : "query: ..." pour une requête, "passage: ..." pour
// un document indexé. On respecte cette convention (sinon la qualité chute).
//
// Le modèle (~120 Mo) est téléchargé une fois au premier appel puis mis en
// cache sur le disque. Sur le VPS (disque large), c'est transparent.
import "server-only";
import path from "node:path";

// Import paresseux : transformers.js est lourd (onnxruntime natif), on ne le
// charge qu'au premier embedding réel, jamais au build.
type Extractor = (
  text: string | string[],
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

export const EMBED_MODEL = "Xenova/multilingual-e5-small";
export const EMBED_DIM = 384;

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      // Cache disque stable (persiste entre redémarrages). Surchargable par
      // env pour pointer un volume dédié si besoin.
      env.cacheDir =
        process.env.TRANSFORMERS_CACHE ||
        path.join(process.cwd(), ".cache", "transformers");
      const pipe = await pipeline("feature-extraction", EMBED_MODEL);
      return pipe as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

async function embed(prefixed: string): Promise<number[]> {
  const extractor = await getExtractor();
  const out = await extractor(prefixed, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

/** Embedding d'une REQUÊTE utilisateur (préfixe e5 "query: "). */
export async function embedQuery(text: string): Promise<number[]> {
  return embed(`query: ${text.replace(/\s+/g, " ").trim()}`);
}

/** Embedding d'un DOCUMENT à indexer (préfixe e5 "passage: "). */
export async function embedPassage(text: string): Promise<number[]> {
  return embed(`passage: ${text.replace(/\s+/g, " ").trim()}`);
}

/** Format pgvector attendu par Supabase RPC : "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
