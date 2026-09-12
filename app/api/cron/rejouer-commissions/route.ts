// app/api/cron/rejouer-commissions/route.ts
//
// REJOUE LES APPELS VERS TIPOTE QUI ONT ECHOUE (`commissions_en_attente`).
//
// Le rejeu part deja tout seul apres chaque webhook de paiement (voir
// `after(...)` dans les deux webhooks). Ce cron couvre le cas ou il n'y
// a PAS de vente pendant que Tipote revient : une annulation en attente
// doit repasser AVANT que la commission ne murisse (30 jours), ventes
// ou pas.
//
//   curl -fsS -X POST -H "X-Cron-Secret: $(grep -m1 -h '^CRON_SECRET=' /home/tipote/formaquiz/.env.local /home/tipote/formaquiz/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"\r')" https://quizing.tipote.com/api/cron/rejouer-commissions
//
// C'est la forme de la crontab du serveur (11 septembre 2026) : elle
// tourne sous `sh`, qui ne sait pas faire `. .env`, et elle ne lit que
// la seule cle dont elle a besoin, `.env.local` devant `.env` comme Next.
//
// Il repond ce qu'il a fait, et distingue "je n'ai pas pu lire" de
// "il n'y avait rien" (regle du 23 aout).

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { rejouerCommissionsEnAttente } from "@/lib/affiliate/filetCommissionStore";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function autorise(req: NextRequest): boolean {
  const attendu = process.env.CRON_SECRET?.trim() || "";
  if (!attendu) return false;
  const recu = req.headers.get("x-cron-secret")?.trim() || "";
  if (!recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!autorise(req)) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const bilan = await rejouerCommissionsEnAttente({ max: 50 });
  if (!bilan.lisible) {
    return NextResponse.json({ ok: false, reason: "filet_illisible", detail: bilan.raison }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...bilan });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
