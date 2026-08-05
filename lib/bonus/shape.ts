// lib/bonus/shape.ts
//
// UN BONUS N'A PAS TOUJOURS LA FORME D'UN PDF.
//
// -- CE QUI A DÉCLENCHÉ CE FICHIER (Béné, 5 août 2026) ----------------
//
// Le guide généré pour un calculateur lui a proposé Google Sheets, une
// formule par champ, la feuille publiée en page web, et "entre 2 h 45 et
// 3 heures pour les quatre profils". Puis Calconic, gratuit jusqu'à 50
// vues par mois. Sa réaction :
//
//   "On peut plutôt demander à Claude ou GPT de coder ça en donnant le
//    prompt exact à utiliser à l'user, on lui dit de l'héberger sur une
//    page de blog ou de tunnel sur Systeme.io et d'envoyer le lien dans
//    le premier email ?? 1000000 fois plus simple et moderne !!"
//
// Elle a raison sur les deux plans. Trois heures de formules dans un
// tableur, c'est le prix que payait quelqu'un qui n'avait pas d'autre
// choix, et ce n'est plus le cas. Et une feuille de calcul publiée n'est
// pas un livrable : c'est une feuille de calcul publiée.
//
// -- POURQUOI LA FORME EST UNE RÈGLE, ET PAS UN JUGEMENT DU MODÈLE ----
//
// Le modèle décidait tout seul, dans le corps du texte, comment le bonus
// se fabrique et comment il se livre. Il choisissait donc un outil
// différent à chaque génération, parfois un tableur, parfois un service
// payant, et la partie livraison ne correspondait plus à ce qui avait
// été décrit juste au dessus.
//
// La forme se déduit du FORMAT choisi, une fois, ici. Le prompt reçoit
// ensuite des consignes qui ne parlent que de cette forme là. C'est la
// même règle que partout dans ce repo : quand deux endroits recalculent
// la même décision, ils finissent par ne plus dire la même chose.

/** Ce qu'on fabrique vraiment, et donc comment ça se livre. */
export type BonusShape =
  /** Un fichier qui se lit : PDF sur un drive, lien dans l'email. */
  | "document"
  /** Un outil qui se manipule : une page codée par l'IA, publiée sur
   *  une page de blog ou de tunnel, lien dans l'email. */
  | "page"
  /** Un accès : une date, un flux, une porte ouverte sur l'offre. Rien
   *  à fabriquer, tout à organiser. */
  | "acces";

/**
 * Les formats qui produisent une PAGE.
 *
 * Le critère : le visiteur SAISIT quelque chose et la page lui répond.
 * Un PDF ne peut pas faire ça, et un tableur le fait mal.
 *
 * Volontairement court. Classer un format en "page" par excès enverrait
 * la créatrice coder une page pour quelque chose qui se lit très bien
 * imprimé, ce qui est le défaut inverse de celui qu'on corrige.
 */
const PAGE_FORMATS = ["calculateur", "gpt ou générateur", "audit personnalisé"];

/** Les formats qui ne se fabriquent pas : ils s'organisent. */
const ACCESS_FORMATS = [
  "atelier live",
  "challenge",
  "podcast privé",
  "accès à une partie de l'offre",
];

/**
 * La forme d'un bonus, d'après son format.
 *
 * `format` arrive du modèle : il est censé venir de `BONUS_FORMATS`,
 * mais on ne peut pas en dépendre. La comparaison est donc tolérante
 * (accents, casse, espaces), et tout ce qu'on ne reconnaît pas retombe
 * sur `"document"`, la forme la plus courante et la moins coûteuse à
 * produire. Se tromper vers le document fait perdre une occasion ; se
 * tromper vers la page fait perdre une soirée.
 */
export function bonusShape(format: string): BonusShape {
  const f = normalize(format);
  if (!f) return "document";
  if (PAGE_FORMATS.some((p) => f.includes(normalize(p)))) return "page";
  if (ACCESS_FORMATS.some((p) => f.includes(normalize(p)))) return "acces";
  // Un format inventé par le modèle : on lit les mots qui trahissent une
  // saisie de l'utilisateur.
  if (/(calculat|simulat|generateur|generator|diagnostic interactif)/.test(f)) return "page";
  return "document";
}

function normalize(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
