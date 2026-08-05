// lib/bonus/offers.ts
//
// PLUSIEURS OFFRES, UNE PAR PROFIL.
//
// -- CE QUI A DÉCLENCHÉ CE FICHIER (Monique, 5 août 2026) -------------
//
//   "Mon quiz permet d'identifier quelle est l'offre la plus adaptée à
//    la personne qui le fait, en tenant compte de son aisance avec les
//    outils digitaux, de sa capacité à être autonome ou non. Du coup, je
//    n'ai pas une offre à proposer, mais 3. Chaque profil mène vers une
//    offre différente. Et là, le bonus, même s'il peut être différent par
//    profil, mène quand même vers une seule offre. J'ai mis la promesse
//    pour ma dernière offre, parce que c'est celle que je mets en avant.
//    Est-ce que ça ne va pas paraître incohérent pour la personne dont le
//    résultat lui propose une autre de mes offres ?"
//
// Si. Et c'est exactement le contraire de ce que le quiz vient de faire :
// il a pris la peine de dire à cette personne quelle offre lui convient,
// et le bonus la renvoie vers une autre. Le générateur supposait UNE
// offre, ce qui est le cas courant mais pas le seul.
//
// -- POURQUOI UN SEUL CHOIX À TROIS VALEURS, ET PAS DEUX RÉGLAGES -----
//
// On pourrait croire à deux questions indépendantes : "un bonus ou
// plusieurs ?" et "une offre ou plusieurs ?". Ça ferait quatre
// combinaisons, dont une est INCOHÉRENTE : un bonus COMMUN qui devrait
// mener vers des offres DIFFÉRENTES. Un seul texte, lu par tout le
// monde, ne peut pas pointer vers trois offres sans redevenir le
// problème que Monique décrit.
//
// Trois valeurs, donc, et la quatrième est impossible par construction.
// C'est la règle du repo : quand un cas a plusieurs mécaniques, la
// mécanique est un paramètre explicite, pas une combinaison qu'on espère
// que personne ne composera de travers.

import type { OfferKind } from "../prompts/bonus.ts";

/** Ce que la créatrice vend, et à qui. */
export type BonusOffer = {
  /** La promesse, en une phrase. */
  promise: string;
  kind: OfferKind;
  /** Texte libre : "97 euros", "à partir de 1200 euros", "sur devis". */
  price: string;
  /**
   * Les profils de résultat auxquels CETTE offre s'adresse, par index.
   *
   * Une offre peut en servir plusieurs (Monique a 3 offres pour 4
   * profils). Ignoré hors du plan `per_profile_offer`, où il n'y a
   * qu'une offre pour tout le monde.
   */
  profileIndexes: number[];
};

/**
 * Comment le bonus et l'offre se déclinent. UN choix, trois valeurs.
 *
 * L'ordre est celui de l'effort croissant : c'est celui dans lequel les
 * cartes sont proposées, pour que la plus simple soit la première.
 */
export const BONUS_PLANS = ["shared", "per_profile", "per_profile_offer"] as const;
export type BonusPlan = (typeof BONUS_PLANS)[number];

/** Le bonus est-il décliné par profil ? Vrai pour deux des trois plans. */
export function isPerProfile(plan: BonusPlan): boolean {
  return plan !== "shared";
}

/** L'offre change-t-elle selon le profil ? Vrai pour un seul plan. */
export function hasOfferPerProfile(plan: BonusPlan): boolean {
  return plan === "per_profile_offer";
}

/**
 * L'offre qui s'applique à un profil.
 *
 * Hors du plan à offres multiples, c'est toujours la première : il n'y
 * en a qu'une, et c'est elle que la créatrice a saisie.
 *
 * `null` quand un profil n'est couvert par aucune offre. L'appelant DOIT
 * traiter ce cas : écrire un bonus qui ne mène nulle part, c'est faire
 * travailler la créatrice pour rien.
 */
export function offerForProfile(
  plan: BonusPlan,
  offers: BonusOffer[],
  profileIndex: number,
): BonusOffer | null {
  if (offers.length === 0) return null;
  if (!hasOfferPerProfile(plan)) return offers[0];
  return offers.find((o) => o.profileIndexes.includes(profileIndex)) ?? null;
}

export type OfferCoverage = {
  ok: boolean;
  /** Les profils (index) qu'aucune offre ne couvre. */
  missing: number[];
  /** Les profils (index) que PLUSIEURS offres revendiquent. */
  duplicated: number[];
  /** Les offres (index) qui ne servent aucun profil. */
  unused: number[];
};

/**
 * Chaque profil a-t-il exactement une offre ?
 *
 * Même famille que `analyzeTrancheCoverage` côté Tiquiz : on prévient la
 * créatrice AVANT de produire, au lieu de la laisser découvrir le trou
 * dans le texte généré. Les trois défauts ont des conséquences
 * différentes, donc ils se nomment séparément :
 *
 * - un profil SANS offre : son bonus n'a nulle part où mener ;
 * - un profil avec DEUX offres : on ne peut pas choisir à sa place, et
 *   deviner produirait exactement l'incohérence qu'on corrige ;
 * - une offre qui ne sert PERSONNE : ce n'est pas bloquant, mais c'est
 *   presque toujours un profil oublié dans une case à cocher.
 *
 * Hors du plan à offres multiples, il n'y a rien à couvrir : une seule
 * offre s'adresse à tout le monde.
 */
export function analyzeOfferCoverage(
  plan: BonusPlan,
  offers: BonusOffer[],
  profileCount: number,
): OfferCoverage {
  const empty: OfferCoverage = { ok: true, missing: [], duplicated: [], unused: [] };
  if (!hasOfferPerProfile(plan)) return empty;
  // Structure inconnue : on ne bloque pas sur une donnée qu'on n'a pas.
  if (profileCount <= 0) return empty;

  const missing: number[] = [];
  const duplicated: number[] = [];
  for (let i = 0; i < profileCount; i++) {
    const n = offers.filter((o) => o.profileIndexes.includes(i)).length;
    if (n === 0) missing.push(i);
    if (n > 1) duplicated.push(i);
  }
  const unused = offers
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.profileIndexes.some((p) => p >= 0 && p < profileCount))
    .map(({ i }) => i);

  return { ok: missing.length === 0 && duplicated.length === 0, missing, duplicated, unused };
}
