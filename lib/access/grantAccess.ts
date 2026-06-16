// lib/access/grantAccess.ts
// Logique d'octroi / revocation d'acces, partagee entre le webhook
// Systeme.io et l'admin (invitation manuelle). Server-only.
//
// Onboarding : si l'email n'a pas encore de compte, on l'invite
// (email envoye par Supabase via le SMTP Resend configure) avec un
// retour sur /bienvenue, qui etablit la session et propose de choisir
// un mot de passe. Si le compte existe deja, on (re)active juste son
// enrollment.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://formaquiz.tipote.com").trim();

export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === lower);
    if (found) return { id: found.id };
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

export interface GrantResult {
  ok: boolean;
  created: boolean;
  reason?: string;
}

/**
 * Donne acces au FormaQuiz a un email : cree le compte (invitation) si
 * besoin, puis pose un enrollment actif. Idempotent.
 */
export async function grantAccessByEmail(
  email: string,
  source: string,
  contactId?: string | null,
): Promise<GrantResult> {
  let user = await findUserByEmail(email);
  let created = false;

  if (!user) {
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/bienvenue`,
    });
    if (error || !invited?.user) {
      return { ok: false, created: false, reason: "invite_failed" };
    }
    user = { id: invited.user.id };
    created = true;
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, email, updated_at: now }, { onConflict: "id" });
  await supabaseAdmin.from("enrollments").upsert(
    {
      user_id: user.id,
      status: "active",
      source,
      sio_contact_id: contactId ?? null,
      granted_at: now,
      revoked_at: null,
    },
    { onConflict: "user_id" },
  );

  return { ok: true, created };
}

/**
 * Revoque l'acces (remboursement / annulation). Ne supprime pas le
 * compte, juste l'enrollment.
 */
export async function revokeAccessByEmail(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return;
  await supabaseAdmin
    .from("enrollments")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("user_id", user.id);
}
