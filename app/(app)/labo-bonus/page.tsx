import { redirect } from "next/navigation";

import { getViewer } from "@/lib/parcours";
import { fetchQuizAudit } from "@/lib/integrations/tiquiz";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { type BonusProjectSummary } from "@/lib/bonus/project";
import { BonusLabClient } from "./BonusLabClient";

export const dynamic = "force-dynamic";

/**
 * Le générateur de bonus post-quiz.
 *
 * OUVERT À TOUS LES ÉLÈVES depuis le 5 août 2026. Il a vécu deux jours
 * en page non listée, réservée aux admins, le temps que Béné vérifie sa
 * sortie sur de vrais cas : un générateur qui consomme des tokens et rend
 * un livrable que personne n'a lu n'a rien à faire devant des élèves (la
 * campagne email du 3 août est sortie en JSON brut à l'écran).
 *
 * L'entrée vit dans l'onglet "Bonus post-quiz" de la page Bonus.
 */
export default async function LaboBonusPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // TOUT CE QUE LE QUIZ SAIT DEJA, on ne le redemande pas (retour Bene,
  // 5 aout 2026). Echec silencieux : la page marche sans, la route
  // refuse proprement s'il n'y a aucun quiz relie.
  const quizzes = await fetchQuizAudit(viewer.userId).catch(() => null);
  const quiz = (quizzes ?? []).find((q) => q.status === "active") ?? (quizzes ?? [])[0] ?? null;

  // CE QU'IL A DEJA CREE, charge ici et pas au montage : sans ca l'ecran
  // s'ouvrirait sur le formulaire vide puis basculerait sur sa liste, ce
  // qui donne l'impression d'avoir failli tout perdre. Best-effort : si
  // la migration n'est pas encore passee, la liste est vide et le
  // generateur fonctionne comme avant.
  const initialProjects = await loadProjects(viewer.userId);

  return (
    <BonusLabClient
      quizTitle={quiz?.title ?? null}
      profiles={(quiz?.resultProfiles ?? []).map((p) => p.title).filter(Boolean)}
      viralityEnabled={quiz?.viralityEnabled === true}
      initialProjects={initialProjects}
    />
  );
}

async function loadProjects(userId: string): Promise<BonusProjectSummary[]> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("bonus_projects")
      .select("id, title, quiz_title, chosen, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      title: (r.title as string) || "Bonus sans titre",
      quizTitle: (r.quiz_title as string | null) ?? null,
      format: ((r.chosen as { format?: string } | null)?.format ?? null) as string | null,
      updatedAt: r.updated_at as string,
    }));
  } catch {
    return [];
  }
}
