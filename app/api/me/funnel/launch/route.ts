// app/api/me/funnel/launch/route.ts
//
// LE KIT DE LANCEMENT : 4 posts, 1 message prive, 1 email partenaire,
// pour faire connaitre le quiz.
//
// Route separee de la sequence, et c'est voulu : ce sont les deux SEULES
// generations de la page, elles se lancent et se relancent l'une sans
// l'autre. Une seule demande au modele ici, donc une requete courte (cf.
// l'erreur 524 documentee dans lib/generate/funnel.ts).
import { NextResponse } from "next/server";
import { generateFunnelLaunch } from "@/lib/generate/funnel";
import { requireFunnelAccess } from "@/lib/generate/funnelGuard";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  const launch = await generateFunnelLaunch(gate.userId);
  if (!launch) {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, launch });
}
