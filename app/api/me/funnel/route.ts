// app/api/me/funnel/route.ts
// Chantier B : generation du funnel done-for-you de l'eleve.
//   GET  : renvoie la campagne stockee.
//   POST : (re)genere a partir du carnet + persona.
import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { canAccessSection } from "@/lib/access/tiers";
import { generateFunnel, getFunnelAssets } from "@/lib/generate/funnel";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  // SERRURE REELLE du palier 47 EUR. Le flou de la page est une vitrine :
  // il se retire dans l'inspecteur. C'est ICI qu'on refuse, sinon un
  // acheteur a 7 EUR genererait sa campagne en contournant l'affichage.
  if (!canAccessSection(viewer.tier, "/funnel")) {
    return NextResponse.json({ ok: false, reason: "upsell_required" }, { status: 403 });
  }
  const { assets, generatedAt } = await getFunnelAssets(viewer.userId);
  return NextResponse.json({ ok: true, assets, generatedAt });
}

export async function POST(_req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  // SERRURE REELLE du palier 47 EUR. Le flou de la page est une vitrine :
  // il se retire dans l'inspecteur. C'est ICI qu'on refuse, sinon un
  // acheteur a 7 EUR genererait sa campagne en contournant l'affichage.
  if (!canAccessSection(viewer.tier, "/funnel")) {
    return NextResponse.json({ ok: false, reason: "upsell_required" }, { status: 403 });
  }

  const assets = await generateFunnel(viewer.userId);
  if (!assets) {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, assets });
}
