// app/api/me/funnel/route.ts
// Campagne de l'eleve : DEUX choses, la sequence post-quiz et le kit de
// lancement.
//   GET : renvoie ce qui est stocke.
//   PUT : enregistre ce que le navigateur vient de generer, en FUSIONNANT
//         (regenerer le kit n'efface pas les sequences, et inversement).
//
// LE POST A DISPARU, ET C'EST LE CORRECTIF (erreur 524, 3 aout 2026).
// Il generait tout dans une seule requete. Cloudflare coupe a
// ~100 secondes, ecrire une campagne en demande plusieurs minutes :
// aucune valeur de timeout ne pouvait rendre ca fiable.
//
// La generation vit maintenant dans /profiles, /sequence et /launch, une
// demande au modele par requete. Le navigateur enchaine, montre
// l'avancement, puis appelle ce PUT.
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

  // Seules les cles PRESENTES sont ecrasees : le navigateur envoie
  // `byResult` apres une generation de sequences, `launch` apres une
  // generation de kit, jamais les deux pour rien.
  const { byResult, launch } = (body ?? {}) as { byResult?: unknown; launch?: unknown };
  const assets = await saveFunnelAssets(gate.userId, { byResult, launch });
  if (!assets) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, assets });
}
