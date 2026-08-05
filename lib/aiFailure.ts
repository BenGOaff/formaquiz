// lib/aiFailure.ts
//
// POURQUOI UNE GÉNÉRATION N'A PAS ABOUTI.
//
// -- CE QUI A DÉCLENCHÉ CE FICHIER (Béné, 5 août 2026) ----------------
//
//   "la génération du contenu a échoué : api/me/bonus:1 Failed to load
//    resource: the server responded with a status of 502"
//
// Un 502 nu, et rien pour savoir laquelle des quatre causes possibles
// s'est produite : Anthropic saturé, Anthropic qui refuse la requête, la
// génération trop longue coupée par notre propre minuteur, ou le réseau.
// Les quatre appelaient des réactions différentes (attendre une minute,
// corriger le prompt, relancer, vérifier la connexion) et l'écran disait
// la même phrase pour les quatre.
//
// C'est le défaut du 3 août dans une autre robe : un `ok: false` DOIT
// produire quelque chose d'exploitable à l'écran. Ici il en produisait
// bien un, mais qui ne distinguait rien.
//
// -- CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS -------------------
//
// Il traduit un statut HTTP ou une exception en RAISON.
//
// -- IL NE DÉCIDE PAS CE QUI SE RÉESSAIE ------------------------------
//
// Ça, c'est `lib/generate/retry.ts`, écrit le 4 août pour Fabienne (ses
// trois emails dont "un ou parfois deux" seulement sortaient). J'avais
// commencé par réécrire la liste des statuts transitoires ici : c'est
// exactement le défaut que ce repo corrige en boucle, une règle écrite à
// deux endroits finit toujours par diverger. Ce module s'appuie donc
// dessus au lieu de la recopier, et le délai entre deux tentatives vient
// de là aussi (avec l'en-tête `retry-after` du fournisseur, que lui seul
// sait renseigner).

// Import RELATIF avec l'extension : le runner de tests de ce repo ne
// resout pas l'alias `@/` (contrairement a celui de Tiquiz).
import { isRetryableStatus } from "./generate/retry.ts";

/** Ce qui a empêché la génération, du point de vue de la créatrice. */
export type AiFailure =
  /** En face, c'est saturé. Ça repart tout seul : on peut réessayer. */
  | "busy"
  /** Notre minuteur a coupé avant la fin. Relancer, ou demander moins. */
  | "too_long"
  /** La requête a été refusée : c'est chez nous qu'il faut chercher. */
  | "refused"
  /** On n'a même pas joint le service. */
  | "unreachable"
  /** Réponse reçue, mais vide. */
  | "empty";

/**
 * Le statut renvoyé par Anthropic, traduit en raison.
 *
 * 429 (trop de requêtes), 529 (surcharge) et les 5xx sont TRANSITOIRES :
 * la même requête passera dans une minute. Les autres 4xx viennent de ce
 * qu'on a envoyé, donc réessayer ne sert à rien et il faut le dire, sinon
 * la créatrice relance dix fois pour rien.
 *
 * La liste elle-même vit dans `lib/generate/retry.ts`, et une seule fois.
 */
export function classifyUpstream(status: number): AiFailure {
  return isRetryableStatus(status) ? "busy" : "refused";
}

/**
 * L'exception levée par `fetch`, traduite en raison.
 *
 * `AbortSignal.timeout` lève une `TimeoutError` ; un `AbortController`
 * lève une `AbortError`. Les deux veulent dire "c'était trop long", et
 * c'est la distinction qui manquait : sans elle, une coupure de notre
 * propre minuteur ressemblait à une panne d'Anthropic.
 */
export function classifyThrown(err: unknown): AiFailure {
  const name =
    typeof err === "object" && err !== null && "name" in err ? String((err as Error).name) : "";
  if (name === "TimeoutError" || name === "AbortError") return "too_long";
  return "unreachable";
}

/** Relancer tout seul n'a de sens que sur une saturation. */
export function isRetryable(failure: AiFailure): boolean {
  return failure === "busy";
}

/**
 * La phrase montrée à la créatrice, et surtout CE QU'ELLE DOIT FAIRE.
 *
 * Elle vit côté écran (l'Atelier est mono-langue, contrairement à Tiquiz
 * et Tipote) mais elle vit dans ce module, à côté de la règle qui la
 * choisit : une phrase écrite dans le composant finit toujours par dire
 * autre chose que ce que la raison signifie.
 *
 * `what` nomme le bloc concerné ("Le contenu du bonus"), pour qu'on
 * sache lequel des trois a échoué quand les deux autres sont là.
 */
export function failureCopy(reason: string, what?: string): string {
  const quoi = what ? `${what} : ` : "";
  switch (reason) {
    case "busy":
      return `${quoi}les serveurs de l'IA sont saturés en ce moment. Attends une minute et relance, rien n'est perdu.`;
    case "too_long":
      return `${quoi}la génération a dépassé le temps disponible et s'est arrêtée. Relance, ça passe en général au deuxième essai.`;
    case "unreachable":
      return `${quoi}impossible de joindre le service de génération. Vérifie ta connexion, puis relance.`;
    case "refused":
      return `${quoi}la demande a été refusée par l'IA. Ce n'est pas de ton côté : signale-le-moi, je regarde le journal du serveur.`;
    case "unreadable":
      return `${quoi}la réponse est arrivée dans un format illisible. Relance, c'est en général bon du premier coup.`;
    case "offer_coverage":
      return "Chaque profil de résultat doit être relié à une offre, et à une seule. Complète les cases en haut de la page, puis relance.";
    case "no_quiz":
      return "Aucun quiz trouvé sur ton compte relié. Connecte le bon compte, ou crée ton quiz d'abord.";
    default:
      return `${quoi}ça n'a pas abouti. Relance, le reste de ton travail est gardé.`;
  }
}

/**
 * Le statut HTTP que NOTRE route renvoie pour cette raison.
 *
 * Un refus n'est pas une panne (règle du 3 août) : le statut dit de
 * quelle famille on parle, pour que même une console de navigateur, sans
 * le corps de la réponse, soit informative.
 */
export function statusFor(failure: AiFailure): number {
  if (failure === "busy") return 503;
  if (failure === "too_long") return 504;
  return 502;
}
