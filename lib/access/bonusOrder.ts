// lib/access/bonusOrder.ts
//
// LA COMMANDE DE BONUS ARRIVÉE SUR UNE ADRESSE QU'ON NE CONNAÎT PAS.
//
// Béné, 7 août 2026 : "il faut aussi anticiper ceux qui vont commander la
// mise à jour avec un autre email que celui qu'ils ont utilisé pour
// l'atelier, même si je les préviens sur le bon de commande."
//
// -- POURQUOI CE N'EST PAS "LE COMPTE N'EXISTE PAS" --------------------
//
// Le même signal veut dire deux choses opposées selon le bon de commande.
//
// Sur le tunnel pub, l'upsell à 47 € part parfois AVANT l'achat à 7 €
// (deux automatisations Systeme.io, deux files) : le compte n'existe pas
// encore, et c'est parfaitement normal.
//
// Sur la page de deuxième chance, qui vend les bonus à des élèves déjà
// inscrits, un compte absent est au contraire le symptôme : la personne a
// commandé avec une autre adresse que la sienne.
//
// C'est pour ça que la mécanique est un PARAMÈTRE et pas une déduction
// faite à l'intérieur (même règle que `analyzeResultCoverage(mode, ...)`
// côté Tiquiz) : on ne peut pas appeler cette fonction sans avoir dit de
// quel bon de commande on parle.

import type { AtelierTier } from "@/lib/access/tiers";

export interface BonusOrderState {
  /** Le compte vient-il d'être créé par cet octroi ? */
  created: boolean;
  /**
   * Palier AVANT l'octroi. `null`/`undefined` = aucun enrollment, donc
   * cette adresse n'avait jamais acheté l'Atelier.
   */
  previousTier: AtelierTier | null | undefined;
}

/**
 * Cette commande est-elle arrivée sur la mauvaise adresse ?
 *
 * @param expectsExistingAccount vrai pour la page de deuxième chance,
 *   faux pour les tunnels d'acquisition.
 *
 * Deux façons d'être orphelin, et la deuxième compte autant que la
 * première : le compte a dû être créé, OU il existait mais sans le
 * moindre enrollment (quelqu'un qui s'était inscrit sans jamais acheter,
 * ou une adresse créée par un autre produit). Ne regarder que `created`
 * laisserait passer ce second cas en silence.
 */
export function isOrphanBonusOrder(
  expectsExistingAccount: boolean,
  state: BonusOrderState,
): boolean {
  if (!expectsExistingAccount) return false;
  return state.created === true || state.previousTier == null;
}

/**
 * Quel email envoyer après une commande de bonus.
 *
 * `"mismatch"` explique où sont ses bonus et propose de les basculer sur
 * son compte habituel. `"unlocked"` confirme simplement l'ouverture.
 */
export function bonusOrderEmailKind(
  expectsExistingAccount: boolean,
  state: BonusOrderState,
): "mismatch" | "unlocked" {
  return isOrphanBonusOrder(expectsExistingAccount, state) ? "mismatch" : "unlocked";
}
