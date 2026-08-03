// lib/generate/funnelGuard.ts
//
// LA SERRURE DE LA CAMPAGNE, ÉCRITE UNE FOIS.
//
// Le flou de la page /funnel est une vitrine : il se retire dans
// l'inspecteur. La vraie protection est ce contrôle, et il doit être
// posé sur CHAQUE route de génération.
//
// Depuis que la génération est découpée en étapes (erreur 524), ces
// routes se sont multipliées. Recopier le contrôle sur chacune, c'est
// accepter d'en oublier une, et une seule suffit : un acheteur à 7 EUR
// génère alors sa campagne complète en appelant l'étape oubliée.
import "server-only";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { canAccessSection } from "@/lib/access/tiers";

/**
 * Renvoie l'identifiant de l'élève, ou la réponse de refus à retourner
 * telle quelle. Jamais les deux.
 */
export async function requireFunnelAccess(): Promise<
  { userId: string; denied?: undefined } | { userId?: undefined; denied: NextResponse }
> {
  const viewer = await getViewer();
  if (!viewer) {
    return { denied: NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 }) };
  }
  if (!viewer.enrolled) {
    return { denied: NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 }) };
  }
  if (!canAccessSection(viewer.tier, "/funnel")) {
    return { denied: NextResponse.json({ ok: false, reason: "upsell_required" }, { status: 403 }) };
  }
  return { userId: viewer.userId };
}
