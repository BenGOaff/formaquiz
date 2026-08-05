// lib/tiquizAccount.ts
//
// QUAND LE COMPTE RELIÉ NE MONTRE RIEN, ON NE CONCLUT PAS QU'ELLE N'A
// RIEN FAIT.
//
// -- POURQUOI (Jocelyne, 4 et 5 août 2026) ----------------------------
//
// Six semaines à lire "tu n'as pas encore de quiz" alors qu'elle en
// avait trois en ligne, avec 2002 vues. Son Atelier était relié à un
// compte créé sous son AUTRE adresse, et vide. L'adresse reliée était
// disponible depuis le début, aucun écran ne la montrait.
//
// La carte "Quiz suivi" a été corrigée le 4 août. Le 5, en cherchant
// ailleurs, on a trouvé que la page Avancées portait le même défaut
// TROIS fois, empilé :
//
//   - le Quiz Doctor : "Aucun quiz détecté sur ton compte Tiquiz. Crée
//     et publie ton quiz (Jour 4)" ;
//   - le panneau de résultats : quatre tuiles à zéro, sans un mot ;
//   - les conseils du coach : "Ton quiz n'a pas encore de visiteurs."
//
// Trois affirmations au présent de l'indicatif, sur la même page, sur
// une chose qu'aucune des trois ne savait. C'est le défaut que
// `lib/prompts/evidence.ts` interdit à nos IA, et qu'on écrivait nous
// mêmes en dur dans l'interface.
//
// -- LA RÈGLE ---------------------------------------------------------
//
// Un compte relié muet a DEUX explications, et une seule est un
// problème : elle débute, ou on regarde le mauvais compte. Tant qu'on
// ne peut pas trancher, on nomme les deux et on affiche l'adresse
// reliée, qui est la seule information qui permette de trancher.
//
// La décision vit ici, en fonction pure, parce qu'elle est prise à
// quatre endroits et que quatre endroits qui décident séparément
// finissent toujours par dire quatre choses différentes.

/** Ce qu'on a constaté, quand on a constaté quelque chose. */
export type SilenceReason =
  /** Le compte n'a aucun quiz. */
  | "no-quiz"
  /** Il a des quiz, mais pas la moindre visite. */
  | "no-activity";

export type SilenceInput = {
  connected: boolean;
  /** Nombre de quiz sur le compte relié. `null` = on n'a pas pu le
   *  savoir (API indisponible, migration en retard). */
  quizCount: number | null;
  /** Visites cumulées sur le compte relié. `null` = inconnu. */
  views: number | null;
};

/**
 * Le compte relié est-il muet, et pour quelle raison observée ?
 *
 * `null` veut dire "on ne dit rien" : soit il n'y a pas de doute, soit
 * on ne sait pas, et ne pas savoir n'autorise aucune phrase. C'est la
 * même prudence que `loadError` sur la carte du tableau de bord : une
 * liste qu'on n'a pas pu charger n'est pas une liste vide.
 */
export function readAccountSilence(input: SilenceInput): SilenceReason | null {
  if (!input.connected) return null;
  if (input.quizCount === 0) return "no-quiz";
  // Des quiz mais aucune visite. On ne le dit QUE si on a vraiment
  // compté zéro : `null` (métriques absentes, synchro jamais faite)
  // n'est pas zéro.
  if (input.quizCount !== null && input.quizCount > 0 && input.views === 0) {
    return "no-activity";
  }
  // Compte dont on ignore le contenu : on se tait. Mieux vaut un écran
  // qui n'explique rien qu'un écran qui accuse.
  return null;
}

export type SilenceCopy = {
  /** Le constat, et lui seul. */
  lead: string;
  /** Les DEUX explications possibles, jamais une seule. */
  causes: string;
  /** Ce qu'elle peut faire pour trancher. */
  action: string;
};

/**
 * Les phrases à afficher. Elles vivent ici et pas dans les composants :
 * l'Atelier est mono-langue, donc pas d'i18n à traverser, et c'est le
 * seul moyen que les quatre écrans disent mot pour mot la même chose.
 *
 * `providerName` vient de `providerLabel()` : un élève dont le quiz est
 * sur Tipote ne doit pas lire "ton compte Tiquiz" (retour Maurice,
 * 29 juillet 2026, qui a été envoyé sur le mauvais login).
 */
export function silenceCopy(reason: SilenceReason, providerName: string): SilenceCopy {
  const causes =
    `Deux explications possibles, et une seule est un problème : soit c'est le début, ` +
    `soit tes quiz vivent sur un autre compte ${providerName}, sous une autre adresse email. ` +
    `Le deuxième cas est fréquent quand on a une adresse pro et une adresse perso, et rien ` +
    `ne te le signale.`;
  return {
    lead:
      reason === "no-quiz"
        ? `Ce compte ${providerName} ne contient aucun quiz.`
        : `Ce compte ${providerName} n'a encore enregistré aucune visite.`,
    causes,
    action:
      `Regarde l'adresse ci-dessus : c'est elle qu'on interroge. Si ce n'est pas la bonne, ` +
      `change de compte, tes badges déjà obtenus restent acquis.`,
  };
}

/** La ligne qui montre l'adresse interrogée, ou dit qu'on ne l'a pas. */
export function accountLine(providerName: string, email: string | null): string {
  const clean = (email ?? "").trim();
  return clean
    ? clean
    : `Adresse inconnue (reconnecte ton compte ${providerName} pour la voir)`;
}
