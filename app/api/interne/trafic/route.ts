// app/api/interne/trafic/route.ts
//
// LA PORTE OÙ LE MIDDLEWARE DÉPOSE UNE VUE DE PAGE.
//
// Le middleware ne peut pas écrire dans la base : il POSTe ici, dans un
// `waitUntil`, hors du chemin de la réponse. Cette route tourne sur
// Node et fait l'écriture.
//
// ELLE NE DÉCIDE RIEN. Ce qui compte comme une vue, le chemin retenu et
// la source ont été décidés dans `lib/trafic/vueASignaler.ts`, en
// fonctions pures. Ici on borne ce qui arrive (une porte reste une
// porte) et on incrémente.
//
// Le secret est celui des crons, et c'est écrit dans `signalerVue.ts` :
// une variable neuve est une variable qui peut n'être jamais posée sur
// le serveur, et le compteur resterait alors à zéro en silence pendant
// des semaines (drame `PARTNER_SHARED_SECRET`, 19 août).

import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { compterVue } from "@/lib/trafic/compterVue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Comparaison à temps constant.
 *
 * Un `!==` s'arrête au premier caractère différent : son TEMPS raconte
 * combien de caractères sont justes. C'est le trou n°4 de l'audit du
 * 24 août, et il ne se rouvre pas ici.
 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Borne ce qui arrive de l'extérieur, sans rien décider. */
function borne(brut: unknown, max: number): string {
  return String(brut ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const attendu = (process.env.CRON_SECRET ?? "").trim();
  // Pas de secret configuré : on refuse, on n'ouvre pas la porte "en
  // attendant". Un compteur qu'on peut remplir depuis un navigateur ne
  // vaut rien, et l'écran sait dire que le comptage n'est pas branché.
  if (!attendu) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  const recu = (req.headers.get("x-cron-secret") ?? "").trim();
  if (!recu || !safeEqual(recu, attendu)) {
    return NextResponse.json({ ok: false, reason: "refused" }, { status: 401 });
  }

  let corps: unknown = null;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const c = (corps ?? {}) as Record<string, unknown>;

  const hote = borne(c.hote, 80);
  const chemin = borne(c.chemin, 120);
  const source = borne(c.source, 40);
  if (!hote || !chemin || !source) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  await compterVue({ hote, chemin, source });

  // TOUJOURS 200, même quand l'écriture a échoué : c'est une
  // statistique, personne ne réessaie, et le middleware ne lit même pas
  // cette réponse. L'échec, lui, crie dans le journal du serveur.
  return NextResponse.json({ ok: true });
}
