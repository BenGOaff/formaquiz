// lib/types.ts — types partagés du parcours FormaQuiz.

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
  options: QuestionOption[];
  required: boolean;
  sort_order: number;
}

export interface DayResource {
  label: string;
  url: string;
  type?: string;
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
  resources: DayResource[];
  result_html: string | null;
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
}
