// app/api/auth/magic-link/route.ts
// Lien de connexion "magique" par email, SANS mot de passe. Généré côté
// serveur (service role) en flux IMPLICITE (jetons dans le hash), pas en
// PKCE : c'est ce qui le rend fiable CROSS-DEVICE (demande sur ordi, ouverture
// sur téléphone). Le PKCE de signInWithOtp échouait dans ce cas car le
// code_verifier reste dans le navigateur d'origine (drame Gwenn 20 juil 2026).
//
// On envoie NOTRE email brandé via Resend. Le lien retombe sur /bienvenue qui
// consomme les jetons du hash et ouvre la session. Anti-énumération : on
// répond toujours { ok: true }.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/appUrl";

// LE `??` EST UN FAUX GARDE-FOU, et ce fichier en portait un (31 août
// 2026). Il ne protège que de la variable ABSENTE ; une variable
// PRÉSENTE et absurde (`http://localhost:3002` dans un `.env` de prod)
// le traverse intacte. C'est le drame Véronique du 2 août : "je demande
// un nouveau mot de passe, je clique, et j'arrive sur localhost
// n'autorise pas la connexion".
//
// `lib/appUrl.ts` existait déjà ici et VALIDE ce qu'il trouve. Il
// n'était simplement pas branché : un garde-fou écrit et non appelé ne
// protège personne.
const APP_URL = getAppUrl();

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/bienvenue` },
    });
    const actionUrl = data?.properties?.action_link ?? null;
    // error attendu si l'email n'a pas de compte : on ignore silencieusement
    // (anti-énumération, on ne crée pas de compte sur une simple connexion).
    if (!error && actionUrl) {
      const { subject, html } = welcomeEmail({ actionUrl, isNewAccount: false });
      await sendEmail({ to: email, subject, html });
    }
  } catch {
    // On n'expose rien.
  }

  return NextResponse.json({ ok: true });
}
