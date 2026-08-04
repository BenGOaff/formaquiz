// lib/generate/retry.ts
//
// Quand réessayer un appel au modèle, et combien de temps attendre.
//
// -- POURQUOI (Fabienne et Béné, 4 août 2026) -------------------------
//
// "J'ai créé mes 3 tags, les 3 campagnes et les 3 workflows, et quand je
// demande à générer les mails il ne peut en faire qu'un ou parfois 2,
// mais jamais les 3."
//
// Le "parfois 2" est toute l'information. Un bug de code donnerait
// toujours le même nombre ; un résultat qui change d'une fois sur
// l'autre, c'est une limite de débit.
//
// La page lançait les trois profils EN MÊME TEMPS (`Promise.all`), et
// chacun demande 8000 tokens. L'API refuse les appels en trop avec un
// 429, et notre code traitait ce refus comme un échec définitif : le
// profil ressortait vide, en silence. Trois demandes simultanées, une
// ou deux qui passent : exactement ce qu'elles ont vu.
//
// **Un refus temporaire n'est pas un échec.** Il se réessaie, après une
// pause, et il ne doit surtout pas être confondu avec une réponse
// inexploitable du modèle, qui elle ne s'améliorera pas en insistant.

/** Statuts qui veulent dire "reviens dans un instant", pas "c'est mort". */
export function isRetryableStatus(status: number): boolean {
  // 429 : trop d'appels à la fois. 529 : l'API est surchargée.
  // 500 / 502 / 503 / 504 : incident passager côté fournisseur.
  return status === 429 || status === 529 || (status >= 500 && status < 600);
}

/** Nombre de tentatives, la première comprise. */
export const MAX_ATTEMPTS = 3;

const BASE_DELAY_MS = 1500;
const MAX_DELAY_MS = 20_000;

/**
 * Combien attendre avant la tentative suivante.
 *
 * L'en-tête `retry-after` du fournisseur prime : lui seul sait quand sa
 * fenêtre se rouvre. Sinon on double à chaque tentative, ce qui laisse
 * le temps aux appels concurrents de finir.
 *
 * `attempt` commence à 1 (on vient de rater la première tentative).
 */
export function retryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  const seconds = Number(String(retryAfterHeader ?? "").trim());
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.round(seconds * 1000), MAX_DELAY_MS);
  }
  const n = Math.max(1, Math.floor(attempt));
  return Math.min(BASE_DELAY_MS * 2 ** (n - 1), MAX_DELAY_MS);
}

/**
 * Pourquoi une génération n'a pas abouti.
 *
 * On distingue les deux, parce qu'elles n'appellent PAS la même phrase à
 * l'écran : "l'IA est surchargée, relance dans une minute" est
 * actionnable, "réessaie plus tard" ne l'est pas.
 */
export type GenerationFailure =
  /** Trop d'appels, ou incident passager : relancer a du sens. */
  | "busy"
  /** Le modèle a répondu quelque chose d'inexploitable : insister ne sert à rien. */
  | "unusable"
  /** Configuration absente côté serveur. */
  | "not_configured";
