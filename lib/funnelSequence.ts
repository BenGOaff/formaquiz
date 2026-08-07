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
      "Il VIENT de lire son profil sur la page de résultat : ne le réécris pas. Tu le nommes en une phrase pour qu'il se retrouve, puis tu apportes ce que la page ne disait pas : ce que ce profil implique pour la suite, et ce qui arrive dans les prochains jours. Cet email est la trace durable de son résultat, pas sa copie. Aucune vente ici.",
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
 * Le RANG d'un email dans la séquence, 1 à 5.
 *
 * -- POURQUOI CE N'EST PAS SA PLACE DANS LA LISTE ----------------------
 *
 * L'écran et le fichier téléchargé numérotaient les emails par leur
 * index. Tant que la séquence est complète, index + 1 = rang, et ça ne
 * se voit pas. Dès qu'un temps manque, tout ce qui suit porte le nom du
 * temps précédent : le "Ce qui le retient" s'affiche comme "Un conseil
 * qu'il peut appliquer", et l'élève colle le mauvais email dans le
 * mauvais endroit de son workflow.
 *
 * C'est le défaut d'Adeline sous un autre visage : une POSITION servait
 * d'identité. `step` est l'identité, la position n'est qu'un repli pour
 * les campagnes écrites avant qu'on l'enregistre.
 */
export function sequenceRank(email: { step?: number | null }, index: number): number {
  return typeof email.step === "number" && Number.isFinite(email.step)
    ? email.step
    : index + 1;
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

/**
 * Les temps qui MANQUENT dans une séquence, par leur rang.
 *
 * Sans ce contrôle, une séquence d'un seul email passait pour un succès :
 * on n'exigeait que "au moins un email". Fabienne n'a donc reçu aucune
 * alerte, et le bandeau qui nomme les profils ratés ne la concernait pas,
 * puisqu'il ne repère que les profils à ZÉRO email.
 *
 * Un rang en double compte pour un seul : deux emails "step 2" ne
 * remplacent pas le 3 manquant.
 */
export function missingSequenceSteps(
  emails: readonly { step?: number | null }[],
): number[] {
  const presents = new Set(
    emails
      .map((e) => e.step)
      .filter((s): s is number => typeof s === "number" && Number.isFinite(s)),
  );
  const manquants: number[] = [];
  for (let rang = 1; rang <= RESULT_SEQUENCE.length; rang += 1) {
    if (!presents.has(rang)) manquants.push(rang);
  }
  return manquants;
}

/** Vrai quand la séquence porte bien ses cinq temps. */
export function isSequenceComplete(
  emails: readonly { step?: number | null }[],
): boolean {
  return missingSequenceSteps(emails).length === 0;
}

/** Le bloc de consignes injecté dans le prompt. */
export function sequenceGuidance(): string {
  return RESULT_SEQUENCE.map((b, i) => `  ${i + 1}. ${b.title} : ${b.intent}`).join("\n");
}

/**
 * Le gabarit de sortie, avec SES CINQ ENTRÉES.
 *
 * -- POURQUOI CINQ ET PAS UNE (Fabienne, 7 août 2026) ------------------
 *
 * "Deux des profils en ont bien 5 mais il y a toujours un profil qui
 * n'en a qu'un."
 *
 * Le gabarit du prompt montrait un tableau à UN SEUL email, sous le
 * titre "Format exact", juste au dessus de la consigne "EXACTEMENT 5
 * emails". On montrait donc au modèle une réponse à un email en la
 * présentant comme le format à respecter. Un modèle qui suit la FORME
 * plutôt que la phrase s'arrête à un, et il n'a pas tort : c'est ce
 * qu'on lui a montré.
 *
 * Exactement le défaut déjà corrigé côté Tiquiz le 3 août, où l'exemple
 * d'options contredisait sa propre règle. **Un prompt est du code : son
 * exemple ne doit jamais contredire sa consigne.**
 *
 * Le gabarit est donc DÉRIVÉ de `RESULT_SEQUENCE` : ajouter un temps à
 * la séquence met à jour l'exemple tout seul, et le test le vérifie.
 */
export function sequenceSkeleton(): string {
  // Les valeurs sont des EMPLACEMENTS, pas du contenu : les chevrons le
  // disent sans ambiguïté. Sans eux, un modèle recopie volontiers le
  // libellé du temps comme corps de l'email.
  const entrees = RESULT_SEQUENCE.map(
    (b, i) =>
      `    {"step": ${i + 1}, "subject": "<objet de l'email ${i + 1}>", "body": "<corps de l'email ${i + 1}, ${b.title}>"}`,
  ).join(",\n");
  return `{"emails": [\n${entrees}\n  ]}`;
}
