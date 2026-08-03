// app/api/me/funnel/core/route.ts
//
// ETAPE 1 de la generation : la sequence de bienvenue, la sequence de
// vente, le kit de lancement, et la LISTE des profils a ecrire ensuite.
//
// Une seule demande au modele, donc une requete courte : c'est toute la
// raison d'etre de ce fichier (cf. l'erreur 524 documentee dans
// lib/generate/funnel.ts). La reponse dit au navigateur combien d'etapes
// il lui reste a enchainer.
import { NextResponse } from "next/server";
import { generateFunnelCore } from "@/lib/generate/funnel";
import { requireFunnelAccess } from "@/lib/generate/funnelGuard";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  const core = await generateFunnelCore(gate.userId);
  if (!core) {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, core });
}
