// lib/access/grantAccess.ts
// Logique d'octroi / revocation d'acces, partagee entre le webhook
// Systeme.io et l'admin (invitation manuelle). Server-only.
//
// Onboarding : si l'email n'a pas encore de compte, on genere un lien
// d'invitation (sans laisser Supabase envoyer son email par defaut) et on
// envoie NOTRE email d'accueil brande via Resend. Le lien retombe sur
// /bienvenue, qui etablit la session et fait choisir un mot de passe. Si
// le compte existe deja, on (re)active l'enrollment et on envoie un lien
// magique d'entree directe.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";
import { mergeTier, resolveTier, type AtelierTier } from "@/lib/access/tiers";

// URL de base des liens d'action (emails). Lue au RUNTIME via APP_URL :
// NEXT_PUBLIC_* est inliné au build par Next, ce qui avait gravé un
// localhost:3002 de dev dans les liens d'accès en prod (drame 18 juin 2026).
// APP_URL (non public) est lu à l'exécution, donc corrigible sans rebuild.
const APP_URL = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");

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
 * Donne acces au L'Atelier du Quiz a un email : cree le compte (invitation) si
 * besoin, puis pose un enrollment actif. Idempotent.
 */
export async function grantAccessByEmail(
  email: string,
  source: string,
  contactId?: string | null,
  /**
   * Palier acheté. Absent = "plus" (l'Atelier complet), ce qui garde le
   * comportement historique de tous les appelants existants : l'admin,
   * l'invitation manuelle et le webhook d'origine.
   */
  tier: AtelierTier = "plus",
): Promise<GrantResult> {
  let user = await findUserByEmail(email);
  let created = false;
  // Lien d'action a mettre dans l'email d'accueil (invitation ou magique).
  let actionUrl: string | null = null;

  if (!user) {
    // type "invite" cree le compte ET renvoie le lien, sans envoyer
    // d'email Supabase : c'est nous qui envoyons l'email brande.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${APP_URL}/bienvenue` },
    });
    if (error || !data?.user) {
      return { ok: false, created: false, reason: "invite_failed" };
    }
    user = { id: data.user.id };
    created = true;
    actionUrl = data.properties?.action_link ?? null;
  } else {
    // Compte existant : lien magique qui retombe sur /bienvenue (page
    // PUBLIQUE qui consomme les jetons du hash et ÉTABLIT la session).
    // NB : viser /dashboard directement échoue -> le middleware bloque
    // (pas encore de cookie de session) et renvoie vers /login AVANT que
    // le hash #access_token soit consommé, d'où l'élève coincé sur un
    // formulaire de connexion sans mot de passe (drame 19 juil 2026).
    // /bienvenue les connecte directement puis propose de choisir un mot
    // de passe (ou "plus tard" -> dashboard).
    const { data } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/bienvenue` },
    });
    actionUrl = data?.properties?.action_link ?? null;
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, email, updated_at: now }, { onConflict: "id" });

  // LE PALIER NE REDESCEND JAMAIS TOUT SEUL. Systeme.io réessaie et
  // réordonne : si l'upsell à 47 € arrive AVANT l'achat à 7 € (deux
  // automatisations, deux files), un upsert naïf rétrograderait un client
  // qui vient de payer le prix fort. On lit l'existant et on garde le
  // plus élevé des deux (cf. lib/access/tiers.ts).
  // `select("tier")` echoue lui aussi si la colonne n'existe pas encore :
  // on lit la ligne entiere, qui marche dans les deux cas.
  const { data: existingRow } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  // Pas de ligne = premier achat : on pose le palier acheté tel quel.
  // Ligne existante = on la lit avec resolveTier, donc une colonne encore
  // absente en prod vaut "plus" et personne ne perd rien.
  const previousTier = existingRow
    ? resolveTier((existingRow as { tier?: string | null }).tier)
    : null;
  const effectiveTier = mergeTier(previousTier, tier);

  const baseRow = {
    user_id: user.id,
    status: "active",
    source,
    sio_contact_id: contactId ?? null,
    granted_at: now,
    revoked_at: null,
  };
  // REPLI SI LA MIGRATION N'EST PAS ENCORE PASSEE EN PROD.
  // PostgREST rejette l'ecriture entiere quand une colonne est inconnue :
  // sans ce repli, deployer ce code avant d'appliquer
  // 20260803_enrollment_tiers.sql couperait l'octroi d'acces de TOUS les
  // acheteurs, y compris ceux des tunnels actuels. Meme garde-fou que
  // l'INSERT de /track (cf. AGENTS.md, drame quiz_events.meta) : on tente
  // la version complete, on retombe sur la version historique.
  const { error: upsertErr } = await supabaseAdmin.from("enrollments").upsert(
    { ...baseRow, tier: effectiveTier, tier_source: source, tier_updated_at: now },
    { onConflict: "user_id" },
  );
  if (upsertErr) {
    console.warn("[grantAccess] upsert avec palier refuse, repli sans palier:", upsertErr.message);
    await supabaseAdmin.from("enrollments").upsert(baseRow, { onConflict: "user_id" });
  }

  // Email d'accueil best-effort : un echec d'envoi ne doit pas annuler
  // l'octroi d'acces (l'eleve peut toujours passer par /login).
  if (actionUrl) {
    const { subject, html } = welcomeEmail({ actionUrl, isNewAccount: created });
    await sendEmail({ to: email, subject, html });
  }

  return { ok: true, created };
}

/**
 * Renvoie le lien d'accès à un élève existant (il n'a pas reçu / a perdu
 * l'email). Génère un lien magique frais vers /bienvenue (connexion directe
 * + choix du mot de passe) et renvoie NOTRE email brandé. NE MODIFIE PAS
 * l'enrollment (un simple renvoi ne (re)donne pas l'accès tout seul).
 */
export async function resendAccessLinkByEmail(email: string): Promise<GrantResult> {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, created: false, reason: "no_account" };

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/bienvenue` },
  });
  const actionUrl = data?.properties?.action_link ?? null;
  if (error || !actionUrl) return { ok: false, created: false, reason: "link_failed" };

  const { subject, html } = welcomeEmail({ actionUrl, isNewAccount: false });
  const sent = await sendEmail({ to: email, subject, html });
  if (!sent.ok) return { ok: false, created: false, reason: sent.reason ?? "email_failed" };
  return { ok: true, created: false };
}

/**
 * Rétrograde au palier 7 € sans retirer l'accès à l'Atelier.
 *
 * Sert au remboursement du SEUL upsell à 47 € : le client garde ce qu'il
 * a payé (l'Atelier, le coach, le Quiz Doctor) et perd ce qu'on lui a
 * remboursé (les bonus, les templates, le générateur d'email). Tout
 * révoquer lui retirerait un produit qu'il n'a pas fait rembourser.
 *
 * Idempotent : rétrograder deux fois donne le même état.
 */
export async function downgradeToStandardByEmail(
  email: string,
  source = "sio_refund_upsell",
): Promise<{ ok: boolean; reason?: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, reason: "no_account" };
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("enrollments")
    .update({ tier: "standard", tier_source: source, tier_updated_at: now })
    .eq("user_id", user.id);
  if (error) {
    // Migration pas encore appliquee : on le DIT au lieu de repondre ok.
    // Un remboursement d'upsell silencieusement ignore laisserait un
    // client rembourse avec le produit entre les mains.
    console.error("[grantAccess] retrogradation impossible:", error.message);
    return { ok: false, reason: "tier_column_missing" };
  }
  return { ok: true };
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
