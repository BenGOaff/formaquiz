// app/api/integrations/tiquiz/start/route.ts
// Demarre la connexion 1-clic : pose un state anti-CSRF en cookie et
// redirige vers la page de consentement Tiquiz.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { authorizeUrlFor, normalizeProvider } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ?provider=tipote : l'eleve construit son quiz sur Tipote et pas sur
  // Tiquiz (retour Maurice, 28 juillet 2026). Meme flux, autre domaine.
  const provider = normalizeProvider(req.nextUrl.searchParams.get("provider"));

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(`${authorizeUrlFor(provider)}?state=${encodeURIComponent(state)}`);
  const cookieOpts = {
    httpOnly: true,
    // En dev (http://localhost) un cookie Secure est ignore par le
    // navigateur : on ne le force qu'en production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("tiquiz_oauth_state", state, cookieOpts);
  res.cookies.set("tiquiz_oauth_provider", provider, cookieOpts);
  return res;
}
