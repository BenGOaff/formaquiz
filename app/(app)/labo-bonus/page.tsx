import { redirect } from "next/navigation";

import { getViewer } from "@/lib/parcours";
import { fetchQuizAudit } from "@/lib/integrations/tiquiz";
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

  return (
    <BonusLabClient
      quizTitle={quiz?.title ?? null}
      profiles={(quiz?.resultProfiles ?? []).map((p) => p.title).filter(Boolean)}
      viralityEnabled={quiz?.viralityEnabled === true}
    />
  );
}
