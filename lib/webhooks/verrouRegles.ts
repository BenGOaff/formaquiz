// lib/webhooks/verrouRegles.ts
//
// LA DÉCISION DU VERROU, PURE ET TESTABLE.
//
// `log.ts` importe `supabaseAdmin`, qui exige des variables
// d'environnement AU CHARGEMENT : aucun test ne peut donc l'importer.
// C'est exactement là que les bugs s'installent. La décision vit donc
// ici, séparée de la plomberie.
//
// Jumeau de `lib/webhooks/verrouRegles.ts` chez Tiquiz, porté ici le
// 31 août 2026 : le verrou y avait été corrigé le 24 août, et l'Atelier
// avait gardé l'ancienne mécanique. **Un garde-fou qui ne protège qu'un
// des deux jumeaux ne protège personne**, et c'est ici que ça coûtait le
// plus cher : l'Atelier vend le panier le plus gros, avec la commission
// la plus forte.

/**
 * Au delà de ce délai, une ligne `processing` est considérée MORTE.
 *
 * Un traitement qui dépasse deux minutes a été tué (redémarrage PM2,
 * délai de la plateforme, machine qui redémarre). Trop court, on
 * traiterait deux fois en parallèle ; trop long, une vente resterait
 * bloquée le temps du délai. Deux minutes couvrent largement le pire de
 * nos traitements, qui font trois appels réseau.
 */
export const REPRISE_APRES_MS = 2 * 60 * 1000;

export type VerdictVerrou =
  /** Le verrou est à nous : on traite. */
  | { action: "traiter" }
  /** Déjà fait. On répond 200 sans rien refaire. */
  | { action: "doublon" }
  /**
   * Quelqu'un d'autre est en train de le faire, à l'instant. On demande
   * un réessai PLUS TARD plutôt que de répondre 200 : si son traitement
   * échoue, il faut que quelqu'un repasse.
   */
  | { action: "en_cours" };

export interface LigneDeVerrou {
  status?: string | null;
  /**
   * L'horodatage de la ligne, tel que Postgres le rend.
   *
   * **`created_at` ICI, `received_at` chez Tiquiz.** Les deux tables
   * `webhook_logs` n'ont pas été créées le même jour ni avec le même
   * nom de colonne, et recopier le fichier jumeau tel quel donnait une
   * requête qui échoue : la relecture du verrou répondait alors "je ne
   * sais pas", donc 409, donc l'événement ne passait plus jamais.
   *
   * Attrapé avant d'être poussé, mais c'est LA leçon du portage : un
   * fichier jumeau se relit contre le SCHÉMA d'arrivée, jamais recopié
   * en confiance.
   */
  created_at?: string | null;
}

/**
 * Que faire, au vu de la ligne qui nous a bloqués ?
 *
 * `maintenant` est un PARAMÈTRE : une fonction qui lit l'horloge toute
 * seule n'est pas testable, et un test qui dépend de l'heure est un test
 * qui clignote (leçon du 1er août).
 *
 * Ligne absente ou illisible -> `en_cours`. On SAIT qu'il y a eu
 * conflit, donc une ligne existe : ne pas pouvoir la lire est le cas où
 * on ne sait pas, et rejouer une vente coûte plus cher que la retarder.
 */
export function lireVerrou(
  ligne: LigneDeVerrou | null | undefined,
  maintenant: number,
): VerdictVerrou {
  if (!ligne) return { action: "en_cours" };

  const statut = String(ligne.status ?? "").trim().toLowerCase();
  if (statut === "processed") return { action: "doublon" };

  // Tout autre statut que `processing` est SORTI de l'index : la ligne
  // ne peut pas nous avoir bloqués, donc on ne sait pas ce qu'on lit.
  if (statut !== "processing") return { action: "en_cours" };

  const depuis = ligne.created_at ? Date.parse(ligne.created_at) : Number.NaN;
  // Un horodatage illisible se traite comme un traitement mort : mieux
  // vaut reprendre une vente que la laisser bloquée pour toujours.
  const mort = !Number.isFinite(depuis) || maintenant - depuis > REPRISE_APRES_MS;
  return mort ? { action: "traiter" } : { action: "en_cours" };
}
