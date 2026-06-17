// app/api/me/profile/route.ts
// Mise a jour du profil par l'eleve lui-meme (RLS : il ne touche que le
// sien). Champs editables : prenom, niche, niveau, objectif. Ne touche
// pas a diagnostic_completed_at (le diagnostic reste considere fait).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  niche: z.string().min(1).max(300),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  objective: z.enum(["capter", "qualifier", "segmenter", "vendre"]),
});

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.firstName.trim(),
      niche: parsed.data.niche.trim(),
      level: parsed.data.level,
      objective: parsed.data.objective,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
