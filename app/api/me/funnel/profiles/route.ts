// app/api/me/funnel/profiles/route.ts
//
// La LISTE des profils de resultat a traiter. C'est la premiere etape de
// "generer la sequence post-quiz" : elle dit au navigateur combien
// d'appels il doit enchainer ensuite.
//
// Quand le quiz est connecte, elle est LUE dans le quiz : reponse
// immediate, et les noms sont exactement ceux que ses visiteurs voient.
import { NextResponse } from "next/server";
import { listFunnelProfiles } from "@/lib/generate/funnel";
import { requireFunnelAccess } from "@/lib/generate/funnelGuard";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  const profiles = await listFunnelProfiles(gate.userId);
  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_profiles" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, profiles });
}
