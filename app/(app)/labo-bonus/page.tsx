import { redirect } from "next/navigation";

import { getViewer } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
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

  // Ses profils de résultat, si son compte Tiquiz est relié : ça évite de
  // les retaper quand le bonus est décliné par profil. Échec silencieux,
  // la page marche sans.
  const profiles = await fetchQuizProfiles(viewer.userId).catch(() => []);

  return (
    <BonusLabClient
      niche={viewer.profile?.niche ?? null}
      knownResults={profiles.map((p) => p.title).filter(Boolean)}
    />
  );
}
