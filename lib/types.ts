// lib/types.ts — types partagés du parcours L'Atelier du Quiz.

export type QuestionType = "action" | "decision" | "self_eval" | "recall";

export interface QuestionOption {
  value: string;
  label: string;
  tag?: string;
}

export interface Question {
  id: string;
  day_id: string;
  type: QuestionType;
  prompt: string;
  help_text: string | null;
  // Revelation douce apres reponse (questions "recall" surtout) : l'idee a
  // retenir, montree une fois que l'eleve a repondu. Jamais bloquant, jamais
  // un score. NULL = pas de revelation.
  reveal_html: string | null;
  options: QuestionOption[];
  required: boolean;
  // Multi-select : l'élève peut choisir plusieurs options (stockées jointes
  // par des virgules dans answers.value_choice). Défaut false = choix unique.
  multi: boolean;
  sort_order: number;
}

export interface DayResource {
  label: string;
  url: string;
  type?: string;
}

/** Une vidéo d'un jour multi-vidéos (ex. un réseau social). url XOR
 *  video_id : URL externe OU upload auto-hébergé (video_id prioritaire). */
export interface DayVideo {
  title: string;
  url: string | null;
  video_id: string | null;
}

export interface Day {
  id: string;
  day_number: number;
  slug: string | null;
  title: string;
  subtitle: string | null;
  intro_html: string | null;
  video_url: string | null;
  video_id: string | null;
  // Deuxième vidéo optionnelle (certains jours ont cours + démo).
  video2_url: string | null;
  video2_id: string | null;
  // Titres optionnels, affichés dans le bandeau brandé au-dessus du
  // lecteur. Placement dans le texte via [[video:1]] / [[video:2]].
  video_title: string | null;
  video2_title: string | null;
  // Multi-vidéos : liste ordonnée quand un module en a plus de deux
  // (ex. une vidéo par réseau social). Non vide => source des vidéos du
  // jour (video/video2 ignorés). Placement via [[video:N]].
  videos: DayVideo[];
  resources: DayResource[];
  result_html: string | null;
  pepite_html: string | null;
  status: "draft" | "published";
  sort_order: number;
  is_bonus: boolean;
}

export type ProgressStatus = "locked" | "in_progress" | "completed";

/** Metriques agregees remontees du compte Tiquiz de l'eleve. */
export interface TiquizMetrics {
  leads: number;
  views: number;
  completes: number;
  shares: number;
  topQuiz: { title: string; leads: number } | null;
}

/**
 * Ce que Tiquiz (ou Tipote) rend sur le quiz selectionne : les chiffres
 * du parcours ENTIER et les verdicts deja rediges.
 *
 * Jocelyne, 4 aout 2026 : le coach ne recevait que quatre compteurs
 * cumules, donc aucune fuite d'entree visible et rien de vrai a dire sur
 * une question. Il generalisait la methode, ce qui sonne juste et ne dit
 * rien du quiz de la personne en face.
 */
export interface TiquizReadout {
  /** "quiz" : un seul quiz, les verdicts ont un sens. "account" :
   *  plusieurs, aucun verdict n'est fabrique. */
  scope: "quiz" | "account";
  quizTitle: string | null;
  counts: {
    views: number;
    starts: number;
    completes: number;
    leads: number;
    viewsReliable: boolean;
    questionCount: number;
  } | null;
  funnelVerdict: string | null;
  trafficVerdict: string | null;
}

// ── Chantier B : funnel "done-for-you" genere a partir du carnet ──
export interface FunnelEmail {
  subject: string;
  body: string;
}
export interface FunnelResultEmail {
  result: string;
  /**
   * Rang dans la séquence du profil (1 à 5), ou null si le modèle ne l'a
   * pas rendu. L'affichage retombe alors sur l'ordre de la réponse.
   * Cf. lib/funnelSequence.ts.
   */
  step?: number | null;
  subject: string;
  body: string;
}
export interface FunnelLaunch {
  posts: string[];
  dm: string;
  partnerEmail: string;
}
/**
 * La campagne, reduite a DEUX choses (demande Bene, 3 aout 2026 : "je
 * veux JUSTE 5 mails par resultat, pas ce truc j'en ai partout je ne
 * sais meme pas quoi en faire").
 *
 * La sequence de bienvenue et la sequence de vente douce ont ete
 * RETIREES : elles s'empilaient sur la page sans que personne sache
 * quand les envoyer, et elles diluaient la seule chose qui compte,
 * l'email qu'un visiteur recoit apres avoir eu son resultat.
 *
 * Ne pas les reintroduire "au cas ou" : c'est exactement le geste qui a
 * produit l'ecran qu'elle a trouve illisible.
 */
export interface FunnelAssets {
  /** La sequence post-quiz : 5 emails par profil de resultat. */
  byResult: FunnelResultEmail[];
  /** Le kit pour promouvoir le quiz : posts, DM, email partenaire. */
  launch: FunnelLaunch;
}

/** Modele Systeme.io a importer en 1 clic (URL de partage). */
export interface SioTemplate {
  id: string;
  label: string;
  kind: string;
  url: string;
  description: string | null;
  enabled: boolean;
  sort_order: number;
}

export interface DayWithProgress extends Day {
  progress: ProgressStatus;
  unlocked: boolean;
  completed_at: string | null;
}

export interface Answer {
  question_id: string;
  value_text: string | null;
  value_choice: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  niche: string | null;
  level: string | null;
  objective: string | null;
  // Profil business issu de l'onboarding (parcours / coaching adaptes).
  activity_type: string | null;
  maturity: string | null;
  monetization: string | null;
  ads_budget: string | null;
  tiquiz_account_url: string | null;
  diagnostic_completed_at: string | null;
  avatar_url: string | null;
  tiquiz_autolink_optout: boolean;
  // Espace Affiliation : identifiant affilié Systeme.io + 1re activation.
  sio_affiliate_id: string | null;
  affiliate_opted_in_at: string | null;
}
