// lib/bonus/project.ts
//
// UN BONUS ENREGISTRÉ : comment il s'appelle, ce qu'on en garde.
//
// Béné, 6 août 2026 : "le générateur de bonus est top MAIS on ne peut pas
// retrouver ce qu'on a créé ?"
//
// Non, et rien n'était même enregistré. Ce fichier porte les deux règles
// que ça demande, en fonctions pures pour qu'elles soient testées :
// comment un bonus s'intitule dans la liste, et ce qui a le droit
// d'entrer en base.

import { type BonusOffer, type BonusPlan } from "./offers";

export interface BonusProjectPayload {
  brief: { offers: BonusOffer[]; trigger: string; plan: BonusPlan };
  pistes: unknown[];
  chosen: { index: number; format: string; title: string; punchline: string } | null;
  /** Le markdown produit, par clé de bloc (`guide`, `content:2`, ...). */
  blocks: Record<string, string>;
  quizTitle: string | null;
}

/** Ce que la liste affiche. */
export interface BonusProjectSummary {
  id: string;
  title: string;
  quizTitle: string | null;
  format: string | null;
  updatedAt: string;
}

/** Le repli quand rien ne permet de nommer le bonus. */
export const UNTITLED = "Bonus sans titre";

/**
 * Le nom sous lequel un bonus se retrouve.
 *
 * JAMAIS VIDE, et l'ordre n'est pas arbitraire : on prend d'abord ce que
 * l'élève RECONNAÎTRA. Le titre de la piste retenue est le nom du bonus
 * lui-même ("Le calculateur de ton budget réel"), donc c'est lui. À
 * défaut, la promesse de l'offre, qu'il vient d'écrire de sa main. À
 * défaut, le quiz. Un bonus qui s'appelle "Sans titre" dans une liste
 * est un bonus qu'on ne retrouve pas, c'est à dire exactement le
 * problème qu'on corrige.
 */
export function projectTitle(p: {
  chosen?: { title?: string | null } | null;
  brief?: { offers?: { promise?: string | null }[] } | null;
  quizTitle?: string | null;
}): string {
  const candidats = [
    p.chosen?.title,
    p.brief?.offers?.[0]?.promise,
    p.quizTitle ? `Bonus pour "${p.quizTitle}"` : null,
  ];
  for (const c of candidats) {
    const t = String(c ?? "").replace(/\s+/g, " ").trim();
    // Une promesse d'offre peut être longue : on coupe sur un mot, pas
    // au milieu, sinon la liste affiche des moitiés de mots.
    if (t.length >= 3) return t.length <= 70 ? t : `${t.slice(0, 67).replace(/\s+\S*$/, "")}...`;
  }
  return UNTITLED;
}

/**
 * Est-ce que ce bonus mérite d'être gardé ?
 *
 * On n'enregistre pas une page ouverte puis quittée sans rien faire :
 * elle remplirait la liste de brouillons vides, et l'élève chercherait
 * son vrai bonus au milieu. Le seuil est le premier ACTE de génération,
 * c'est à dire des pistes obtenues.
 */
export function worthSaving(p: Pick<BonusProjectPayload, "pistes" | "blocks">): boolean {
  if (Array.isArray(p.pistes) && p.pistes.length > 0) return true;
  return Object.values(p.blocks ?? {}).some((v) => String(v ?? "").trim().length > 0);
}

/** Au delà, ce n'est plus un bonus, c'est une erreur ou un abus. */
const MAX_BLOCK_CHARS = 120_000;
const MAX_BLOCKS = 40;
const MAX_PISTES = 20;

const BLOCK_KEY = /^(guide|presentation|content)(:\d{1,3})?$/;

/**
 * Ce qui a le droit d'entrer en base.
 *
 * La colonne est du JSONB libre (ajouter un champ au générateur ne doit
 * pas demander une migration), donc le contrôle se fait ici. On borne la
 * FORME et la TAILLE, jamais la liste des champs du brief : c'est
 * exactement le partage de responsabilités de `generator_briefs`.
 *
 * Les clés de bloc, elles, sont contrôlées : elles servent d'index dans
 * l'écran, et une clé fantaisiste y afficherait un dossier qui n'existe
 * pas.
 */
export function sanitizeProject(input: unknown): BonusProjectPayload {
  const o = (input ?? {}) as Record<string, unknown>;
  const brief = (o.brief ?? {}) as Record<string, unknown>;

  const blocks: Record<string, string> = {};
  const rawBlocks = (o.blocks ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawBlocks)) {
    if (Object.keys(blocks).length >= MAX_BLOCKS) break;
    if (!BLOCK_KEY.test(k)) continue;
    const text = typeof v === "string" ? v : "";
    if (!text.trim()) continue;
    blocks[k] = text.slice(0, MAX_BLOCK_CHARS);
  }

  const chosenRaw = o.chosen as Record<string, unknown> | null | undefined;
  const chosen =
    chosenRaw && typeof chosenRaw === "object"
      ? {
          index: Number(chosenRaw.index) || 0,
          format: String(chosenRaw.format ?? "").slice(0, 200),
          title: String(chosenRaw.title ?? "").slice(0, 300),
          punchline: String(chosenRaw.punchline ?? "").slice(0, 600),
        }
      : null;

  return {
    brief: {
      offers: Array.isArray(brief.offers) ? (brief.offers as BonusOffer[]).slice(0, 20) : [],
      trigger: String(brief.trigger ?? "completion"),
      plan: String(brief.plan ?? "shared") as BonusPlan,
    },
    pistes: Array.isArray(o.pistes) ? o.pistes.slice(0, MAX_PISTES) : [],
    chosen,
    blocks,
    quizTitle: o.quizTitle == null ? null : String(o.quizTitle).slice(0, 300),
  };
}

/**
 * Où en est ce bonus, en une phrase.
 *
 * Affichée sur la carte : sans elle, il faut ouvrir les trois bonus pour
 * savoir lequel est fini, ce qui est le même travail que de ne pas avoir
 * de liste du tout.
 */
export function projectProgress(
  blocks: Record<string, string>,
  profileCount: number,
  perProfile: boolean,
): string {
  const rempli = (k: string) => String(blocks?.[k] ?? "").trim().length > 0;
  const contenus = perProfile
    ? Array.from({ length: Math.max(profileCount, 1) }, (_, i) => `content:${i}`)
    : ["content"];

  const faits =
    (rempli("guide") ? 1 : 0) +
    (rempli("presentation") ? 1 : 0) +
    (contenus.some(rempli) ? 1 : 0);

  if (faits === 0) return "Piste choisie, rien de généré";
  if (faits === 3) {
    // Un contenu décliné peut être "présent" sans être complet : le dire
    // évite de croire le bonus terminé alors qu'il manque des profils.
    const manquants = contenus.filter((k) => !rempli(k)).length;
    if (perProfile && manquants > 0) {
      return `Complet, sauf ${manquants} profil${manquants > 1 ? "s" : ""}`;
    }
    return "Complet";
  }
  return `${faits} document${faits > 1 ? "s" : ""} sur 3`;
}
