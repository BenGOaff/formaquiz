// app/api/integrations/tiquiz/go/route.ts
// Redirection intelligente vers l'outil quiz de l'eleve (retour Maurice,
// 29 juillet 2026 : "Creer mon premier quiz" l'envoyait sur le login
// Tiquiz alors que son compte et son quiz vivent sur Tipote, et ses
// identifiants Tipote ne peuvent pas marcher sur Tiquiz).
//
// Flux :
//   1. Auto-connexion par email si pas encore fait (essaie Tiquiz PUIS
//      Tipote, memorise le provider ; meme appel que le dashboard).
//   2. Connexion connue -> on route selon SON app :
//        provider tipote -> app.tipote.com (son quiz y vit)
//        provider tiquiz -> quiz.tipote.com
//   3. Aucun compte trouve nulle part -> Tiquiz (l'app par defaut de
//      l'Atelier : son compte offert y a ete cree a l'achat).
//
// ?to=create ouvre directement la creation de quiz, sinon le dashboard.
import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { ensureAutoConnect, getTiquizConnection } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

const TIQUIZ_BASE = (process.env.TIQUIZ_BASE_URL ?? "https://quiz.tipote.com").trim().replace(/\/$/, "");
const TIPOTE_BASE = (process.env.TIPOTE_BASE_URL ?? "https://app.tipote.com").trim().replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", req.url));

  const wantCreate = req.nextUrl.searchParams.get("to") === "create";

  // Best-effort : ne bloque jamais la redirection.
  try {
    await ensureAutoConnect(
      viewer.userId,
      viewer.email,
      viewer.profile?.tiquiz_autolink_optout ?? false,
    );
  } catch {
    /* noop */
  }

  let provider: string = "tiquiz";
  try {
    const conn = await getTiquizConnection(viewer.userId);
    if (conn?.provider) provider = conn.provider;
  } catch {
    /* noop */
  }

  const dest =
    provider === "tipote"
      ? (wantCreate ? `${TIPOTE_BASE}/quiz/new` : `${TIPOTE_BASE}/app`)
      : (wantCreate ? `${TIQUIZ_BASE}/quiz/new` : `${TIQUIZ_BASE}/dashboard`);

  return NextResponse.redirect(dest);
}
