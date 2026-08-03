// app/api/me/funnel/route.ts
// Campagne done-for-you de l'eleve.
//   GET : renvoie la campagne stockee.
//   PUT : persiste la campagne assemblee par le navigateur.
//
// LE POST A DISPARU, ET C'EST LE CORRECTIF (erreur 524, 3 aout 2026).
// Il generait toute la campagne dans une seule requete. Cloudflare coupe
// a ~100 secondes, ecrire une campagne en demande plusieurs minutes :
// aucune valeur de timeout ne pouvait rendre ca fiable.
//
// La generation vit maintenant dans /core et /sequence, une demande au
// modele par requete. Le navigateur enchaine les etapes, montre
// l'avancement, puis appelle ce PUT une fois avec le resultat complet.
import { NextRequest, NextResponse } from "next/server";
import { getFunnelAssets, saveFunnelAssets } from "@/lib/generate/funnel";
import { requireFunnelAccess } from "@/lib/generate/funnelGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  const { assets, generatedAt } = await getFunnelAssets(gate.userId);
  return NextResponse.json({ ok: true, assets, generatedAt });
}

export async function PUT(req: NextRequest) {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const assets = await saveFunnelAssets(gate.userId, (body as { assets?: unknown })?.assets);
  if (!assets) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, assets });
}
