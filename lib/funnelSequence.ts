// lib/funnelSequence.ts
//
// LES 5 TEMPS DE LA SÉQUENCE PAR PROFIL (demande Béné, 3 août 2026).
//
// Elle a envoyé la maquette : "c'est l'attendu d'une séquence générée
// pour chaque profil". Chaque profil de résultat reçoit donc une
// séquence COMPLÈTE de 5 emails, dans cet ordre, avec un objet par email.
//
// Ces cinq temps vivent ICI et nulle part ailleurs : le prompt les dicte
// au modèle, et l'écran les affiche en libellé. Écrits à deux endroits,
// ils divergeraient au premier ajustement, et la séquence promise ne
// serait plus celle qu'on génère.

export interface SequenceBeat {
  /** Titre affiché dans le dossier du profil ("Email 2 : ..."). */
  title: string;
  /** Ce que fait cet email. Sert de consigne au modèle. */
  intent: string;
}

export const RESULT_SEQUENCE: readonly SequenceBeat[] = [
  {
    title: "Son résultat",
    intent:
      "Tu lui renvoies son profil et ce qu'il veut dire. Il ouvre parce que ça parle de lui. Aucune vente ici.",
  },
  {
    title: "Un conseil qu'il peut appliquer",
    intent:
      "Tu donnes avant de demander : un conseil précis, applicable aujourd'hui, tiré de son profil. C'est ce qui installe la confiance.",
  },
  {
    title: "Ce qui le retient",
    intent:
      "Tu réponds à ses objections avant qu'il ait à te les poser. Nomme l'objection la plus probable POUR CE PROFIL, et démonte-la sans agressivité.",
  },
  {
    title: "Ton offre, ou un rendez-vous",
    intent:
      "Tu proposes la suite logique, au moment où elle a du sens. C'est le SEUL email avec un appel à l'action commercial.",
  },
  {
    title: "Rester en contact",
    intent:
      "Une autre ressource, le blog, la chaîne : il reste dans ton univers même s'il n'achète pas aujourd'hui. Aucune pression, aucune relance culpabilisante.",
  },
] as const;

/** Libellé d'un email de la séquence, par sa position (0-indexée). */
export function sequenceBeatTitle(index: number): string {
  return RESULT_SEQUENCE[index]?.title ?? "";
}

/**
 * Remet une séquence dans l'ordre des temps.
 *
 * `step` fait foi. Un modèle qui rend ses emails dans le désordre
 * donnerait sinon une séquence dont la vente arrive avant le conseil,
 * et l'écran collerait le mauvais libellé sur chaque email. Un email
 * sans rang (génération antérieure à la séquence) passe derrière, dans
 * son ordre d'arrivée : il ne s'intercale jamais au milieu.
 *
 * Le tri est STABLE (deux emails de même rang gardent leur ordre) et ne
 * modifie pas le tableau reçu.
 */
export function sortSequence<T extends { step?: number | null }>(emails: readonly T[]): T[] {
  const rank = (e: T, i: number) =>
    typeof e.step === "number" && Number.isFinite(e.step) ? e.step : RESULT_SEQUENCE.length + 1 + i;
  return emails
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e, a.i) - rank(b.e, b.i) || a.i - b.i)
    .map(({ e }) => e);
}

/** Le bloc de consignes injecté dans le prompt. */
export function sequenceGuidance(): string {
  return RESULT_SEQUENCE.map((b, i) => `  ${i + 1}. ${b.title} : ${b.intent}`).join("\n");
}
