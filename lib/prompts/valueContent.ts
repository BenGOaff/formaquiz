// lib/prompts/valueContent.ts
//
// Les 5 critères d'un contenu de valeur, tels que Béné les enseigne.
//
// -- POURQUOI ILS VIVENT ICI (4 août 2026) ----------------------------
//
// Le coach savait dire à un élève "ton bonus n'est pas assez fort", sans
// jamais pouvoir dire POURQUOI ni sur quoi le juger. Un modèle sans
// critère juge au feeling : il approuve ce qui est bien écrit et refuse
// ce qui est mal formulé, ce qui n'a aucun rapport avec la valeur.
//
// Ces cinq critères sont ceux de Béné, mot pour mot. Ils ne sont pas
// paraphrasés : c'est ce qu'elle enseigne, et le coach doit enseigner la
// même chose qu'elle, pas une variante qui sonne pareil.
//
// Le cinquième est le plus important et le plus souvent oublié :
// **unique**. C'est le seul que l'IA ne peut pas produire toute seule,
// et c'est précisément ce qui distingue le contenu d'une créatrice du
// contenu de n'importe qui d'autre.
//
// Réutilisable : le générateur de bonus (chantier à venir) juge ses
// propres propositions sur cette grille.

/** Les 5 critères, dans les mots de Béné. */
export const VALUE_CONTENT_CRITERIA = [
  { name: "Utile", rule: "On peut en tirer un benefice concret." },
  { name: "Specifique", rule: "Tu donnes une strategie, un outil, une methode." },
  { name: "Cible", rule: "Tu t'adresses a une seule audience." },
  { name: "Applicable", rule: "Ton lecteur repart avec une action a mettre en place." },
  { name: "Unique", rule: "Tu es la seule personne a pouvoir l'ecrire comme ca." },
] as const;

/**
 * Le bloc à injecter dans un prompt qui juge ou produit du contenu.
 *
 * On ne se contente pas de lister : on dit QUOI EN FAIRE. Une grille
 * qu'on donne sans mode d'emploi devient une check-list récitée en fin
 * de réponse, ce qui n'aide personne.
 */
export const VALUE_CONTENT_RULES = [
  "",
  "=== LES 5 CRITÈRES D'UN CONTENU DE VALEUR (grille de Béné) ===",
  ...VALUE_CONTENT_CRITERIA.map((c) => `- ${c.name} : ${c.rule}`),
  "",
  "COMMENT T'EN SERVIR, et surtout comment NE PAS t'en servir :",
  "- Quand un élève te montre un contenu, un bonus, un post ou une page, tu le juges sur cette grille. Tu nommes le critère qui MANQUE, un seul, celui qui coûte le plus cher, et tu proposes la correction. Reciter les cinq critères a la fin d'une reponse ne sert a rien : c'est une grille de lecture, pas une conclusion a coller.",
  "- Le critère le plus souvent rate est SPECIFIQUE : un contenu \"sur la productivite\" n'est pas specifique, un contenu \"la methode pour vider sa boite mail en 20 minutes le vendredi\" l'est.",
  "- Le critère le plus souvent OUBLIE est UNIQUE, et c'est le plus precieux : c'est le seul qu'une IA ne peut pas produire a la place de l'eleve. Quand il manque, tu ne reecris pas le contenu, tu poses la question qui va chercher ce que lui seul a vecu, teste, ou rate.",
  "- CIBLE prime sur tout le reste quand il manque : un contenu qui parle a trois audiences a la fois n'en accroche aucune, et corriger les quatre autres criteres n'y changera rien.",
].join("\n");
