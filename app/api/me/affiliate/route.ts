// app/api/me/affiliate/route.ts
// L'élève enregistre / met à jour son identifiant affilié Systeme.io.
// RLS : il ne touche que sa propre ligne profiles. On valide le format sa...
// et on horodate la 1re activation (affiliate_opted_in_at).
//
// DEPUIS LE 26 AOÛT, CE CHAMP EST FACULTATIF et il ne sert plus qu'à UNE
// chose : rattacher à l'élève les ventes arrivées par les anciens
// tunnels Systeme.io. Son LIEN, lui, porte le code public du registre
// central et ne dépend plus de ce champ : le supprimer ne lui coûte plus
// son lien, ce qui n'était pas vrai avant.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  normalizeAffiliateId,
  isValidAffiliateId,
  ATELIER_SALES_URL,
} from "@/lib/affiliate";
import { lienAffilieDeLEleve } from "@/lib/affiliate/lienEleve";

const schema = z.object({
  // On accepte l'ID brut OU un lien collé : normalizeAffiliateId extrait le sa.
  affiliateId: z.string().max(200),
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

  const sa = normalizeAffiliateId(parsed.data.affiliateId);
  if (sa && !isValidAffiliateId(sa)) {
    return NextResponse.json({ ok: false, reason: "bad_format" }, { status: 400 });
  }

  // 1re activation : on pose affiliate_opted_in_at si pas déjà fait.
  const { data: existing } = await supabase
    .from("profiles")
    .select("affiliate_opted_in_at")
    .eq("id", user.id)
    .maybeSingle();
  const alreadyOptedIn = Boolean(
    (existing as { affiliate_opted_in_at: string | null } | null)?.affiliate_opted_in_at,
  );

  const update: Record<string, unknown> = {
    sio_affiliate_id: sa || null,
    updated_at: new Date().toISOString(),
  };
  if (sa && !alreadyOptedIn) {
    update.affiliate_opted_in_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  // On rafraichit le qr_url du certificat existant de l'eleve SANS
  // regeneration manuelle. Le QR porte son lien TRACKE (code public),
  // et retombe sur l'adresse nue quand aucun code n'est disponible : un
  // certificat s'imprime, donc son QR doit mener quelque part. RLS
  // bloque l'update de certificates cote user, donc service_role.
  // Best-effort : un echec ici ne doit pas faire echouer l'enregistrement
  // de l'ID (deja persiste ci-dessus).
  const { lien } = await lienAffilieDeLEleve({
    email: user.email ?? null,
    sa: sa || null,
  });
  const { error: certErr } = await supabaseAdmin
    .from("certificates")
    .update({ qr_url: lien || ATELIER_SALES_URL })
    .eq("user_id", user.id);
  if (certErr) {
    console.error("[me/affiliate] qr_url refresh failed:", certErr.message);
  }

  return NextResponse.json({ ok: true, affiliateId: sa });
}
