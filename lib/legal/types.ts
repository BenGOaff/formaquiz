// lib/legal/types.ts
//
// LA FORME D'UNE PAGE LÉGALE.
//
// Jumeau de `lib/legal/types.ts` chez Tiquiz, à UNE différence près qui
// est la seule qui compte : **l'Atelier est monolingue.** Il n'a pas de
// `messages/`, pas de `next-intl`, et son interface est en français.
// Un `Record<locale, LegalPage>` recopié ici ferait croire à des
// traductions qui n'existent pas, et le premier passage qui ajoute une
// langue à l'app croirait le corpus déjà traduit.
//
// Le jour où l'Atelier devient multilingue, c'est cette forme qui
// change, et le compilateur listera tout ce qu'il faut traduire.

export type LegalBody = string | string[];

export type LegalSection = {
  /** Le titre de section (h2), rendu tel quel. */
  h: string;
  /** Un ou plusieurs paragraphes, ou une liste à puces. */
  body: LegalBody[];
};

export type LegalPage = {
  /** Le titre visible (h1). */
  title: string;
  /** "Dernière mise à jour : ..." déjà rédigé. */
  lastUpdated: string;
  /** Préambule facultatif, avant la première section. */
  intro?: string;
  sections: LegalSection[];
};

/**
 * LES PAGES QUI EXISTENT, ET CELLE QUI N'EXISTE PAS.
 *
 * `affiliate` est ABSENT, et c'est une décision de Béné (31 août) :
 * "on gère tout sur affiliate et le reste montre seulement". Les
 * conditions du programme sont maintenues à UN seul endroit,
 * `quiz.tipote.com/affiliate`. Les recopier ici donnerait deux textes
 * qui divergent, et c'est celui qu'on ne maintient pas que l'élève
 * lirait.
 */
export type LegalSlug = "privacy" | "legal" | "terms" | "terms-of-use" | "cookies";

export const LEGAL_SLUGS: LegalSlug[] = [
  "legal",
  "terms",
  "terms-of-use",
  "privacy",
  "cookies",
];

/** Le chemin public d'une page légale. */
export const LEGAL_PATHS: Record<LegalSlug, string> = {
  legal: "/legal",
  terms: "/terms",
  "terms-of-use": "/terms-of-use",
  privacy: "/privacy",
  cookies: "/cookies",
};
