// lib/spotlight.ts
// Chantier E : detection des caps "mise en avant" + creation du candidat
// + brouillon d'etude de cas. Server-only. Idempotent (unique user+milestone).
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateCaseStudyDraft } from "@/lib/generate/caseStudy";
import type { TiquizMetrics } from "@/lib/types";

export interface SpotlightMilestone {
  code: string;
  label: string;
  reached: (m: TiquizMetrics) => boolean;
}

// Caps dignes d'une mise en avant (de la vraie traction, pas un coup).
export const SPOTLIGHT_MILESTONES: SpotlightMilestone[] = [
  { code: "leads_10", label: "10 leads captés", reached: (m) => (m.leads ?? 0) >= 10 },
  { code: "leads_50", label: "50 leads captés", reached: (m) => (m.leads ?? 0) >= 50 },
];

export interface NewSpotlight {
  userId: string;
  milestone: string;
  label: string;
}

/**
 * Detecte les caps nouvellement franchis pour un eleve, cree le candidat
 * + le brouillon d'etude de cas. Renvoie les nouveaux candidats.
 */
export async function checkSpotlights(
  userId: string,
  metrics: TiquizMetrics | null,
): Promise<NewSpotlight[]> {
  if (!metrics) return [];

  const { data: existing } = await supabaseAdmin
    .from("spotlights")
    .select("milestone")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.milestone as string));

  const created: NewSpotlight[] = [];
  for (const ms of SPOTLIGHT_MILESTONES) {
    if (have.has(ms.code)) continue;
    if (!ms.reached(metrics)) continue;

    const draft = await generateCaseStudyDraft(userId, metrics);
    const { error } = await supabaseAdmin.from("spotlights").insert({
      user_id: userId,
      milestone: ms.code,
      status: "candidate",
      draft,
      metrics,
    });
    // Conflit = deja cree entre-temps : on ignore.
    if (!error) created.push({ userId, milestone: ms.code, label: ms.label });
  }
  return created;
}
