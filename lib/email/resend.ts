// lib/email/resend.ts
// Envoi d'emails transactionnels via l'API Resend. Server-only.
//
// Config requise dans le .env :
//   RESEND_API_KEY        cle API Resend (re_...)
//   FORMAQUIZ_EMAIL_FROM  expediteur verifie, ex: "FormaQuiz <bonjour@tipote.com>"
//
// L'envoi est best-effort : si la config manque ou que Resend renvoie une
// erreur, on log et on renvoie { ok:false } SANS jamais throw. Les appelants
// (octroi d'acces, reset) ne doivent pas echouer juste parce qu'un email
// n'est pas parti.
import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.FORMAQUIZ_EMAIL_FROM;

export interface SendResult {
  ok: boolean;
  reason?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error(
      "[email] RESEND_API_KEY ou FORMAQUIZ_EMAIL_FROM manquant. Email non envoye :",
      subject,
    );
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] envoi echoue", res.status, detail);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exception lors de l'envoi", err);
    return { ok: false, reason: "exception" };
  }
}
