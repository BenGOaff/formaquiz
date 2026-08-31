// lib/webhooks/log.ts
//
// LE JOURNAL DES APPELS REÇUS, ET L'IDEMPOTENCE QUI VA AVEC.
//
// Une seule écriture fait les deux choses à la fois : elle garde la trace
// de l'appel, et elle dit s'il avait déjà été traité. C'est la base de
// données qui tranche, via l'index unique `(source, event_id)`, pas un
// `select` suivi d'un `insert` qui laisserait une fenêtre entre les deux.
//
// -- POURQUOI CE FICHIER EXISTE (20 août 2026) -------------------------
//
// Cette fonction vivait dans `lib/webhooks/sioAtelier.ts`, privée. Le
// paiement Stripe a besoin exactement de la même chose, dans la même
// table, avec la même règle. La recopier aurait été la millième
// occurrence du défaut que ce dépôt paie le plus cher.
//
// -- ET LE JOURNAL N'EST PAS DÉCORATIF ---------------------------------
//
// Le 7 août, c'est le journal de production qui a tranché en dix secondes
// le drame Ivan, après deux diagnostics à l'aveugle. Une vente absente de
// cette table n'est jamais arrivée jusqu'à nous : ça se lit, ça ne se
// déduit pas.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { lireVerrou, type VerdictVerrou } from "./verrouRegles";

export interface WebhookLogRow {
  /** Qui nous appelle : `systeme_io`, `stripe`, ... */
  source: string;
  /** L'identifiant de l'événement CHEZ L'APPELANT. C'est lui qui dédoublonne. */
  event_id: string | null;
  event_type: string | null;
  payload: unknown;
  status: string;
  error?: string | null;
}

// -- LE RÉESSAI D'UN WEBHOOK DOIT POUVOIR REPASSER (31 août 2026) -----
//
// `logWebhookEvent` écrit une ligne AVANT le travail, et TOUT conflit
// sur l'index vaut "déjà traité". Or l'index de la migration initiale
// couvre tous les statuts.
//
// Conséquence : dès que le traitement ÉCHOUAIT (Supabase indisponible
// une seconde, Stripe injoignable, `grantAccessByEmail` qui rate), la
// route répondait 502 pour demander un réessai, et **ce réessai était
// refusé par notre propre journal** : ligne existante -> doublon -> 200
// -> le fournisseur arrête de réessayer.
//
// **Une vente encaissée dont le premier traitement rate n'ouvrait donc
// JAMAIS l'accès**, et le symptôme était l'absence de symptôme. Quatre
// chemins des deux webhooks de paiement répondaient 502 en comptant sur
// un réessai qui ne pouvait pas arriver, dont le plus probable en
// pratique : `grant_failed`.
//
// C'est le bug corrigé chez Tiquiz le 24 août. L'Atelier avait gardé
// l'ancienne mécanique, et c'est ici que ça coûte le plus cher : le
// panier le plus gros, la commission la plus forte, et une garantie
// 30 jours qui rend chaque vente visible.
//
// **`logWebhookEvent` RESTE**, et il est toujours le bon outil pour le
// webhook Systeme.io : celui-là ne répond jamais 5xx, donc il ne demande
// aucun réessai, donc un conflit y est un VRAI doublon. Lui faire écrire
// `processing` sans le marquer ensuite le sortirait de l'index et
// rejouerait ses ventes.

/**
 * PostgREST refuse-t-il cette écriture parce qu'il ne connaît pas la
 * colonne ? (`PGRST204`, ou son message.) C'est le seul cas où on
 * réécrit sans elle : toute autre erreur doit remonter telle quelle.
 */
function colonneInconnue(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST204" || /column .* does not exist|find the '.*' column/i.test(error.message ?? "");
}

export async function prendreLeVerrou(row: WebhookLogRow): Promise<VerdictVerrou> {
  const base = {
    source: row.source,
    event_id: row.event_id,
    event_type: row.event_type,
    payload: row.payload,
    // `processing` et pas `received` : c'est CE statut qui est dans
    // l'index, donc c'est lui qui tient le verrou.
    status: "processing",
    error: row.error ?? null,
  };

  // `locked_at` PORTE LE BATTEMENT DE COEUR DU VERROU, et pas
  // `created_at`, qui est la DATE DE LA VENTE (`buildSales` en fait le
  // `paidAt`, l'écran de pilotage trie dessus).
  //
  // REPLI SI LA COLONNE N'EST PAS ENCORE EN PROD : PostgREST rejette
  // l'écriture ENTIÈRE sur une colonne inconnue. Sans ce repli, un
  // déploiement en avance sur la migration ferait échouer la prise du
  // verrou de TOUS les paiements (drame `quiz_events.meta`).
  let { error } = await supabaseAdmin
    .from("webhook_logs")
    .insert({ ...base, locked_at: new Date().toISOString() });
  if (error && colonneInconnue(error)) {
    ({ error } = await supabaseAdmin.from("webhook_logs").insert(base));
  }

  if (!error) return { action: "traiter" };

  const conflit = error.code === "23505" || /duplicate key/i.test(error.message);
  if (!conflit) {
    // Le journal est en panne. On TRAITE quand même : refuser une vente
    // encaissée parce qu'on n'arrive pas à écrire une ligne de journal
    // serait pire que le risque de doublon. On crie, par contre.
    console.error(
      `[webhook] journal indisponible (${error.message}) : traitement quand meme, ` +
        `doublon possible sur ${row.source}/${row.event_id ?? "?"}.`,
    );
    return { action: "traiter" };
  }

  return await relireLeVerrou(row);
}

/** Que dit la ligne qui nous a bloqués ? */
async function relireLeVerrou(row: WebhookLogRow): Promise<VerdictVerrou> {
  // `select("*")` et pas une liste de colonnes : nommer `locked_at`
  // avant que la migration ne soit passée ferait échouer TOUTE la
  // requête, donc le verrou deviendrait illisible, donc l'événement ne
  // repasserait plus jamais. Même précaution que `getViewer`.
  const { data, error } = await supabaseAdmin
    .from("webhook_logs")
    .select("*")
    .eq("source", row.source)
    .eq("event_id", row.event_id)
    .in("status", ["processing", "processed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // On sait qu'il y a eu conflit, donc une ligne existe. Ne pas
    // pouvoir la relire est le cas où on ne SAIT pas : on s'arrête,
    // parce que rejouer une vente coûte plus cher que la retarder, et
    // le fournisseur réessaiera.
    console.error(
      `[webhook] verrou illisible sur ${row.source}/${row.event_id ?? "?"} : on ne traite pas.`,
    );
    return { action: "en_cours" };
  }

  const ligne = data as {
    id: string;
    status: string;
    created_at: string;
    locked_at?: string | null;
  };
  // LA DÉCISION est pure et testée (`verrouRegles.ts`). Ici on ne fait
  // que lui donner la ligne et l'heure.
  const verdict = lireVerrou(ligne, Date.now());
  if (verdict.action !== "traiter") return verdict;

  // Le traitement précédent est mort en route. On REPREND, et on
  // repousse le battement de coeur pour que le suivant ne reprenne pas
  // par dessus nous.
  //
  // **JAMAIS `created_at`.** C'est la date de la vente : la repousser
  // déplaçait la vente au jour de la reprise dans l'écran de pilotage,
  // et la faisait remonter en tête de liste. Repli sur l'ancien
  // comportement tant que `locked_at` n'existe pas : sans horodatage
  // repoussé, deux reprises simultanées valent mieux qu'un verrou
  // jamais relâché.
  const { error: repriseErr } = await supabaseAdmin
    .from("webhook_logs")
    .update({ locked_at: new Date().toISOString(), status: "processing" })
    .eq("id", ligne.id);
  if (repriseErr && colonneInconnue(repriseErr)) {
    await supabaseAdmin
      .from("webhook_logs")
      .update({ created_at: new Date().toISOString(), status: "processing" })
      .eq("id", ligne.id);
  }
  console.warn(
    `[webhook] traitement precedent abandonne sur ${row.source}/${row.event_id ?? "?"} : on reprend.`,
  );
  return { action: "traiter" };
}

/**
 * Le travail est fini. Sans cet appel, l'événement reste `processing`,
 * donc il sera REPRIS deux minutes plus tard : c'est le filet, pas le
 * fonctionnement normal.
 */
export async function marquerTraite(
  source: string,
  eventId: string | null,
  statut: "processed" | "error" = "processed",
  detail?: string | null,
): Promise<void> {
  if (!eventId) return;
  try {
    const { error } = await supabaseAdmin
      .from("webhook_logs")
      .update({ status: statut, error: detail ?? null })
      .eq("source", source)
      .eq("event_id", eventId)
      .eq("status", "processing");
    if (error) {
      console.error(`[webhook] marquage ${statut} impossible sur ${source}/${eventId} : ${error.message}`);
    }
  } catch (e) {
    console.error(`[webhook] marquage impossible : ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * ÉCRIT LA LIGNE, ET DIT SI L'ÉVÉNEMENT AVAIT DÉJÀ ÉTÉ TRAITÉ.
 *
 * Gardée pour le webhook Systeme.io, et pour lui seul : il ne répond
 * jamais 5xx, donc il ne demande aucun réessai, donc un conflit y est un
 * VRAI doublon. Voir le bloc au dessus de `prendreLeVerrou`.
 *
 * `duplicate: true` veut dire "on a déjà fait le travail" : l'appelant
 * s'arrête là et répond 200. Sans ça, un réessai de Systeme.io rejouerait
 * une vente, et un remboursement rejoué rouvrirait un accès révoqué.
 */
export async function logWebhookEvent(row: WebhookLogRow): Promise<{ duplicate: boolean }> {
  const { error } = await supabaseAdmin.from("webhook_logs").insert({
    source: row.source,
    event_id: row.event_id,
    event_type: row.event_type,
    payload: row.payload,
    status: row.status,
    error: row.error ?? null,
  });
  // Conflit sur l'index unique (source, event_id) = event déjà traité.
  if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
    return { duplicate: true };
  }
  return { duplicate: false };
}
