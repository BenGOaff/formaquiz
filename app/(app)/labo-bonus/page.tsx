import { redirect } from "next/navigation";

import { getViewer } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";
import { fetchQuizAudit } from "@/lib/integrations/tiquiz";
import { BonusLabClient } from "./BonusLabClient";

export const dynamic = "force-dynamic";

/**
 * Le générateur de bonus post-quiz, en test.
 *
 * PAGE NON LISTÉE ET RÉSERVÉE AUX ADMINS, le temps que Béné vérifie la
 * sortie sur de vrais cas. Aucun lien n'y mène : elle s'ouvre à l'adresse
 * directe. Un élève qui la trouverait par hasard tombe sur la redirection
 * ci-dessous, et l'API refuse de son côté (défense en profondeur : le
 * gate d'une page ne protège jamais une route).
 *
 * L'ouvrir à tout le monde = retirer les deux `isAdminEmail` (ici et dans
 * app/api/me/bonus/route.ts) et ajouter l'entrée dans la navigation.
 */
export default async function LaboBonusPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!isAdminEmail(viewer.email)) redirect("/");

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
