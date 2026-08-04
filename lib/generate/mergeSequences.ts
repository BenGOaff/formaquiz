// lib/generate/mergeSequences.ts
//
// Fusionner les séquences d'emails PROFIL PAR PROFIL.
//
// -- POURQUOI (Fabienne et Béné, 4 août 2026) -------------------------
//
// "Il ne peut en faire qu'un ou parfois 2, mais jamais les 3."
//
// La première cause était la limite de débit (trois demandes lancées en
// même temps, cf. lib/generate/retry.ts). Mais il y en avait une
// deuxième, plus grave, et c'est elle qui les faisait tourner en rond :
//
//     l'enregistrement REMPLAÇAIT toute la liste.
//
// Donc relancer pour compléter écrivait par-dessus. Deux profils
// réussis au deuxième essai effaçaient les trois du premier. On leur
// disait "relance pour compléter" alors que relancer DÉTRUISAIT ce qui
// avait marché. Il était impossible d'arriver à trois autrement que par
// un coup de chance où les trois passaient d'un coup.
//
// La fusion se fait donc par PROFIL : ce qui vient d'être écrit gagne
// pour SON profil, et les autres gardent ce qu'ils avaient.

export type SequenceEmail = {
  result: string;
  /** `undefined` sur les campagnes générées avant le 3 août, qui ne
   *  portaient pas encore le rang dans la séquence. */
  step?: number | null;
  subject: string;
  body: string;
};

/** Clé de regroupement : le nom du profil, insensible à la casse et aux
 *  espaces de bord (l'élève le retape parfois à la main). */
function keyOf(result: string): string {
  return result.trim().toLowerCase();
}

/**
 * Fusionne les séquences déjà en base avec celles qu'on vient d'écrire.
 *
 * - un profil présent dans `incoming` est REMPLACÉ par sa nouvelle
 *   version (c'est une regénération volontaire) ;
 * - un profil absent d'`incoming` GARDE ce qu'il avait : c'est tout
 *   l'intérêt du "relance pour compléter" ;
 * - si `knownProfiles` est fourni, un profil qui n'existe plus dans le
 *   quiz est retiré. Sans ça, renommer un profil laisserait sa vieille
 *   séquence traîner pour toujours, sous un nom que l'élève ne
 *   reconnaît plus (même règle que la distribution par résultat :
 *   la source de vérité, ce sont les profils ACTUELS).
 *
 * L'ordre de sortie suit `knownProfiles` quand il est fourni, sinon
 * l'ordre d'arrivée : l'écran affiche les profils dans l'ordre du quiz.
 */
export function mergeSequencesByProfile(
  current: readonly SequenceEmail[],
  incoming: readonly SequenceEmail[],
  knownProfiles?: readonly string[],
): SequenceEmail[] {
  const byProfile = new Map<string, SequenceEmail[]>();
  const order: string[] = [];

  const push = (email: SequenceEmail) => {
    const k = keyOf(email.result);
    if (!byProfile.has(k)) {
      byProfile.set(k, []);
      order.push(k);
    }
    byProfile.get(k)!.push(email);
  };

  for (const e of current) push(e);

  // Ce qui arrive remplace SON profil, et lui seul.
  const touched = new Set(incoming.map((e) => keyOf(e.result)));
  for (const k of touched) {
    if (byProfile.has(k)) byProfile.set(k, []);
  }
  for (const e of incoming) push(e);

  const known = knownProfiles ? new Set(knownProfiles.map(keyOf)) : null;
  const sortedKeys = knownProfiles
    ? [...knownProfiles.map(keyOf), ...order.filter((k) => !knownProfiles.map(keyOf).includes(k))]
    : order;

  const out: SequenceEmail[] = [];
  const seen = new Set<string>();
  for (const k of sortedKeys) {
    if (seen.has(k)) continue;
    seen.add(k);
    if (known && !known.has(k)) continue; // profil supprimé ou renommé
    for (const e of byProfile.get(k) ?? []) out.push(e);
  }
  return out;
}
