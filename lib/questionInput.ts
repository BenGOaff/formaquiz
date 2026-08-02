// lib/questionInput.ts
//
// Quel champ une question présente à l'élève, et donc quelle colonne on
// écrit quand il répond.
//
// DRAME MAURICE (2 août 2026) : "quand je clique sur la question 5 du
// jour 7, ça me dit : impossible de valider le jour. Réessaie dans un
// instant." Depuis la veille au soir, et ça ne passait pas tout seul.
//
// La cause : DEUX définitions de "question à choix" qui ne disaient pas
// la même chose.
//
//   - l'admin      : `type !== "action"`               -> c'est un choix
//   - le visiteur  : `type !== "action" && options.length > 0`
//
// Une question de type recall/decision/self_eval SANS option (une
// consigne, une annonce, une question ouverte creee au clavier) tombe
// entre les deux. L'écran affiche une zone de texte, l'élève écrit, et
// l'envoi mettait `value_text` à null parce que le type n'était pas
// "action". La réponse partait vide en base. Si la question est
// obligatoire, le serveur refuse ensuite de valider le jour : "il reste
// une question sans réponse". Pour toujours, sans que rien ne dise
// laquelle.
//
// C'est la même famille que le funnel d'Adeline et l'alerte de
// Véronique : une règle écrite pour un cas, appliquée telle quelle à un
// autre, et rien qui le contredise avant la cliente.
//
// RÈGLE : une seule fonction décide, et l'écran comme l'envoi
// l'appellent. Le champ affiché et la colonne écrite ne peuvent plus
// diverger, quelle que soit la façon dont la question a été créée.

export type QuestionInputShape = {
  type: string;
  options?: { value: string; label: string }[] | null;
};

export type QuestionDraft = { value_text: string; value_choice: string };

/** "choice" = des boutons d'option ; "text" = une zone de texte libre. */
export type QuestionInputKind = "choice" | "text";

/**
 * Ce que l'élève voit. Des options a proposer -> des boutons. Sinon une
 * zone de texte, y compris pour un type recall/decision/self_eval dont
 * les options n'ont jamais été remplies.
 */
export function questionInputKind(q: QuestionInputShape): QuestionInputKind {
  if (q.type === "action") return "text";
  return (q.options?.length ?? 0) > 0 ? "choice" : "text";
}

/**
 * Ce qu'on envoie au serveur : EXACTEMENT le champ que l'élève a rempli.
 * L'autre colonne est nettoyée (une question qui passe de choix à texte
 * ne doit pas garder l'ancienne valeur à côté).
 */
export function answerPayload(
  q: QuestionInputShape,
  draft: QuestionDraft,
): { value_text: string | null; value_choice: string | null } {
  if (questionInputKind(q) === "choice") {
    return { value_text: null, value_choice: draft.value_choice.trim() || null };
  }
  return { value_text: draft.value_text.trim() || null, value_choice: null };
}

/** L'élève a-t-il répondu ? (sert au bouton Continuer) */
export function draftIsFilled(q: QuestionInputShape, draft: QuestionDraft | null | undefined): boolean {
  if (!draft) return false;
  const { value_text, value_choice } = answerPayload(q, draft);
  return Boolean(value_text || value_choice);
}
