// app/api/integrations/tiquiz/callback/route.ts
// Retour du consentement Tiquiz : verifie le state, echange le code
// contre un token durable, enregistre la connexion et fait une premiere
// synchro des metriques. Redirige vers le dashboard.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  exchangeCodeForToken,
  saveConnection,
  syncMetrics,
} from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("tiquiz_oauth_state")?.value;

  const fail = () => {
    const r = NextResponse.redirect(new URL("/dashboard?tiquiz=error", req.url));
    r.cookies.delete("tiquiz_oauth_state");
    return r;
  };

  if (!code || !state || !cookieState || state !== cookieState) return fail();

  const exchanged = await exchangeCodeForToken(code);
  if (!exchanged) return fail();

  await saveConnection(user.id, exchanged.token, exchanged.tiquizUserId);
  await syncMetrics(user.id); // premiere synchro (best-effort)

  const res = NextResponse.redirect(new URL("/dashboard?tiquiz=connected", req.url));
  res.cookies.delete("tiquiz_oauth_state");
  return res;
}
