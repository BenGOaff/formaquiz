// app/api/me/diagnostic/route.ts
// Enregistre le diagnostic d'entree de l'eleve : niveau, niche, objectif.
// Ecrit sur son propre profil (RLS : un eleve ne touche que le sien) et
// marque la completion pour ne plus represente le diagnostic.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  niche: z.string().min(1).max(300),
  objective: z.enum(["capter", "qualifier", "segmenter", "vendre"]),
});

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: parsed.data.firstName.trim(),
      level: parsed.data.level,
      niche: parsed.data.niche.trim(),
      objective: parsed.data.objective,
      diagnostic_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
