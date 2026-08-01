// app/api/me/affiliate-posts/route.ts
//
// L'affilié enregistre / réinitialise SA version d'un post réseaux
// (espace Affiliation > Contenu > Réseaux sociaux). Stocké dans
// profiles.affiliate_post_overrides (JSON par identifiant de post).
//
// Même contrat que /api/me/affiliate-emails, volontairement : les deux
// rayons se personnalisent de la même façon, donc ils s'écrivent de la
// même façon. RLS : l'affilié ne touche que sa propre ligne.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ATELIER_POSTS } from "@/lib/affiliateContent/posts";

const schema = z.object({
  // Identifiant du post dans le kit (ex. "atelier-post-03").
  key: z.string().min(1).max(60),
  // null = réinitialise ce post (on retire l'override).
  body: z.string().max(20000).nullable(),
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
  const { key, body } = parsed.data;

  // On n'accepte QUE les identifiants du kit : sans ce filtre, la colonne
  // devient un espace de stockage libre alimenté par le client.
  if (!ATELIER_POSTS.some((p) => p.id === key)) {
    return NextResponse.json({ ok: false, reason: "unknown_post" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("affiliate_post_overrides")
    .eq("id", user.id)
    .maybeSingle();
  const overrides = {
    ...(((row as { affiliate_post_overrides?: Record<string, string> } | null)
      ?.affiliate_post_overrides) ?? {}),
  } as Record<string, string>;

  if (body === null) {
    delete overrides[key];
  } else {
    overrides[key] = body;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ affiliate_post_overrides: overrides })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, reason: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
