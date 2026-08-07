// app/api/me/funnel/sequence/route.ts
//
// ETAPE 2 de la generation, appelee UNE FOIS PAR PROFIL : les 5 emails
// de ce profil, et rien d'autre.
//
// Le navigateur n'envoie que le NOM du profil. Le CTA, son URL et
// l'intention choisie sont relus ici, cote serveur : une URL qui finira
// dans un email envoye a des inconnus ne se prend jamais dans le corps
// d'une requete.
import { NextRequest, NextResponse } from "next/server";
import { generateFunnelSequence } from "@/lib/generate/funnel";
import { requireFunnelAccess } from "@/lib/generate/funnelGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireFunnelAccess();
  if (gate.denied) return gate.denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }
  const profile = String((body as { profile?: unknown })?.profile ?? "").trim();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "no_profile" }, { status: 400 });
  }

  const result = await generateFunnelSequence(gate.userId, profile);
  if (!result) {
    // 502 et pas 500 : ce n'est pas notre code qui casse, c'est la
    // reponse du modele qui n'est pas exploitable. Le navigateur peut
    // relancer CETTE etape seule, sans reecrire le reste.
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  // `complete` dit si les 5 temps sont la. Une sequence partielle est
  // renvoyee quand meme (mieux qu'un email perdu), mais l'ecran le DIT :
  // sans ca, un profil a un seul email passe pour un profil reussi, et
  // c'est ce qui a laisse Fabienne sans information le 7 aout.
  return NextResponse.json({ ok: true, emails: result.emails, complete: result.complete });
}
