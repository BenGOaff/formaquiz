// app/api/integrations/tiquiz/callback/route.ts
// Retour du consentement Tiquiz : verifie le state, echange le code
// contre un token durable, enregistre la connexion et fait une premiere
// synchro des metriques. Redirige vers le dashboard.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  exchangeCodeForToken,
  normalizeProvider,
  saveConnection,
  syncMetrics,
} from "@/lib/integrations/tiquiz";
import { resolveAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

// Base de redirection. L'origine de la requete seule ne suffit pas :
// derriere un proxy le protocole peut basculer. Mais la variable seule
// ne suffit pas non plus, et c'est ce que cet en-tete disait avant.
function appUrl(req: NextRequest, path: string): string {
  // `resolveAppUrl` VALIDE les deux variables puis retombe sur l'origine
  // de la requete, et enfin sur le domaine canonique. L'ancienne version
  // faisait `env || origin` : une variable PRESENTE et absurde
  // (localhost) gagnait donc sur l'origine reelle, ce qui renvoyait
  // l'eleve sur sa propre machine juste apres avoir autorise la
  // connexion. C'est le drame Veronique (2 aout), au retour d'un OAuth.
  return `${resolveAppUrl(new URL(req.url).origin)}${path}`;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl(req, "/login"));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("tiquiz_oauth_state")?.value;
  // Fournisseur pose par /start (tiquiz par defaut) : le code doit etre
  // echange aupres du MEME domaine que celui qui l'a emis.
  const provider = normalizeProvider(req.cookies.get("tiquiz_oauth_provider")?.value);

  const fail = () => {
    const r = NextResponse.redirect(appUrl(req, "/dashboard?tiquiz=error"));
    r.cookies.delete("tiquiz_oauth_state");
    r.cookies.delete("tiquiz_oauth_provider");
    return r;
  };

  if (!code || !state || !cookieState || state !== cookieState) return fail();

  const exchanged = await exchangeCodeForToken(code, provider);
  if (!exchanged) return fail();

  await saveConnection(user.id, exchanged.token, exchanged.tiquizUserId, exchanged.email, provider);
  await syncMetrics(user.id); // premiere synchro (best-effort)

  const res = NextResponse.redirect(appUrl(req, "/dashboard?tiquiz=connected"));
  res.cookies.delete("tiquiz_oauth_state");
  res.cookies.delete("tiquiz_oauth_provider");
  return res;
}
