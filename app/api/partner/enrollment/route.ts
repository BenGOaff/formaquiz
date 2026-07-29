// app/api/partner/enrollment/route.ts
// App-a-app (Tiquiz -> Atelier) : dit si un email correspond a un eleve
// INSCRIT de l'Atelier du Quiz (enrollments.status = active). Sert a la
// carte de conversion de la sidebar Tiquiz : "Decouvre l'Atelier" pour
// les non-eleves, "Recommande l'Atelier (70% de commission)" pour les
// eleves (demande Bene 28 juillet 2026). Authentifie par le secret
// partage PARTNER_SHARED_SECRET (le meme que le pont metriques).
// Aucune donnee perso ne sort : juste un booleen.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => (u.email ?? "").toLowerCase() === lower);
    if (found) return found.id;
    if (users.length < perPage) return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ ok: false, reason: "no_email" }, { status: 400 });

  const userId = await findUserIdByEmail(email);
  if (!userId) return NextResponse.json({ ok: true, enrolled: false });

  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json({ ok: true, enrolled: Boolean(enrollment) });
}
