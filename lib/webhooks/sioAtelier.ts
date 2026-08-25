// lib/webhooks/sioAtelier.ts
//
// LE MOTEUR COMMUN DES WEBHOOKS SYSTEME.IO DE L'ATELIER.
//
// Béné lance une campagne payante avec deux bons de commande (7 € puis
// upsell 47 €) et veut "un webhook pour l'atelier simple, un webhook pour
// l'atelier augmenté". Deux URL, donc, mais UN SEUL chemin de code : ce
// qui distingue les deux tient dans trois options passées en paramètre.
//
// POURQUOI PAS DEUX FICHIERS QUI SE RESSEMBLENT. L'authentification, la
// tolérance aux formes de payload, l'idempotence et la classification des
// événements sont la partie fragile. Dupliquée, elle diverge : on corrige
// un bug d'un côté et pas de l'autre, et on ne le découvre qu'en voyant
// un client sans accès. Un seul moteur, trois interrupteurs.
//
// CE QUI NE CHANGE PAS. La route historique `/api/systeme-io/webhook`
// délègue ici avec exactement ses réglages d'avant (palier complet,
// révocation sur remboursement, opération des 20 places) : les tunnels
// déjà en production ne bougent pas d'un pouce.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSignatureMode, verifySioSignature } from "@/lib/sioWebhookSig";
import {
  downgradeToStandardByEmail,
  grantAccessByEmail,
  revokeAccessByEmail,
} from "@/lib/access/grantAccess";
import { detectPlusTrialFunnel, maybeGrantPlusTrial } from "@/lib/plusTrial/grant";
import { sendEmail } from "@/lib/email/resend";
import {
  bonusEmailMismatchEmail,
  bonusMismatchAdminEmail,
  bonusUnlockedEmail,
} from "@/lib/email/templates";
import { alerterAdmins } from "@/lib/email/alerteAdmin";
import { bonusOrderEmailKind, isOrphanBonusOrder } from "@/lib/access/bonusOrder";
import { logWebhookEvent } from "@/lib/webhooks/log";
import { refundCommissionByOrder } from "@/lib/affiliateTracking";
import { ADS_PLUS_TRIAL_DAYS, ADS_TRIAL_FUNNEL, type AtelierTier } from "@/lib/access/tiers";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;

// Événements qui terminent un accès payé. Termes EN et FR (Systeme.io
// envoie "Vente annulée").
const TERMINAL_EVENT_RE = /CANCEL|REFUND|EXPIR|CHARGEBACK|ANNUL|REMBOURS|RESILI|RÉSILI/i;
// Problème de paiement transitoire : on ne révoque PAS (le retry peut
// réussir, et SIO enverra un CANCEL définitif sinon).
const TRANSIENT_FAILURE_RE = /FAIL|DECLIN|DISPUT|ECHEC|ÉCHEC/i;

export interface SioAtelierOptions {
  /** Palier vendu par ce bon de commande. */
  tier: AtelierTier;
  /**
   * Que faire d'un remboursement / d'une annulation.
   *
   * "revoke" : tout couper (le produit d'entrée est remboursé).
   * "downgrade" : retomber au palier 7 € en gardant l'Atelier. C'est le
   * bon comportement quand SEUL l'upsell est remboursé : révoquer
   * retirerait à ce client un produit qu'il n'a pas fait rembourser.
   */
  onTerminal: "revoke" | "downgrade";
  /**
   * Essai Tiquiz Plus attaché à ce bon de commande.
   *
   * "legacy20" : l'opération historique des 20 places (2 mois, puis 15
   * jours quand le tunnel est plein). "ads15" : la campagne pub, 15 jours
   * fixes, SANS consommer de place. "none" : aucun essai (offre 7 €).
   */
  trial: "legacy20" | "ads15" | "none";
  /** Écrit dans `enrollments.source` et dans le journal des webhooks. */
  source: string;
  /**
   * Ce bon de commande s'adresse-t-il à quelqu'un qui a DÉJÀ un compte ?
   *
   * Vrai pour la page de deuxième chance (`tipote.fr/atelier-du-quiz-bonus`),
   * qui vend les bonus à des élèves déjà inscrits, arrivés par n'importe
   * quel tunnel. Une commande qui tombe sur une adresse SANS compte y est
   * donc presque toujours une faute de frappe ou une deuxième adresse,
   * pas un nouveau client.
   *
   * Faux (défaut) pour les tunnels d'acquisition, où un compte inexistant
   * est le cas NORMAL : les deux automatisations Systeme.io (7 € puis
   * 47 €) arrivent dans un ordre non garanti, et l'upsell crée
   * légitimement le compte quand il passe en premier.
   */
  expectsExistingAccount?: boolean;
}

function secretMatches(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function deepGet(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]),
    obj,
  );
}

/**
 * Premier chemin non vide parmi ceux proposés.
 *
 * Systeme.io ne garantit pas la forme de ses payloads d'une automatisation
 * à l'autre : on essaie plusieurs emplacements plutôt que de parier sur un
 * seul et de perdre une vente sur un "no_email".
 */
function extractStr(body: unknown, paths: string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

// Le journal + l'idempotence vivent dans `lib/webhooks/log.ts` : le
// paiement Stripe fait exactement la même chose, dans la même table, et
// deux copies d'une règle divergent.
const logWebhook = logWebhookEvent;

/**
 * Traite un appel Systeme.io pour un bon de commande donné.
 *
 * SIO réessaie agressivement sur tout non-2xx : on est donc idempotent (un
 * même event_id n'accorde l'accès qu'une fois) et on répond 200 même sur
 * soft-fail métier, pour ne pas déclencher de retry inutile.
 */
export async function handleSioAtelierWebhook(
  req: NextRequest,
  opts: SioAtelierOptions,
): Promise<NextResponse> {
  const rawBody = await req.text();

  // ── Authentification de l'appel ──
  const sigMode = getSignatureMode();
  if (sigMode.mode === "required") {
    const verdict = verifySioSignature(rawBody, req.headers.get("x-webhook-signature"));
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
    }
  } else {
    const provided = new URL(req.url).searchParams.get("secret");
    if (!secretMatches(provided, WEBHOOK_SECRET)) {
      return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const eventType = extractStr(body, ["type", "event", "event_type", "data.type"]);
  const eventId = extractStr(body, ["id", "event_id", "data.id", "webhook_event_id"]);
  // Classification explicite via l'URL (?event=cancel) : le payload
  // "Vente annulée" de Systeme.io ne porte pas toujours un type
  // reconnaissable, il suffit alors de pointer l'automatisation sur
  // ...&event=cancel pour garantir la révocation.
  const eventHint = (new URL(req.url).searchParams.get("event") ?? "").toLowerCase();
  const forcedTerminal = /cancel|refund|annul|rembours|resili/.test(eventHint);
  const email = extractStr(body, [
    "data.customer.email",
    "customer.email",
    "data.contact.email",
    "contact.email",
    "data.email",
    "email",
  ]);
  const contactId = extractStr(body, ["data.contact.id", "contact.id", "data.customer.id"]);

  // ── Idempotence ──
  // Le journal est cloisonné par `source` : les deux bons de commande ont
  // chacun leur espace d'event_id, donc un identifiant réutilisé par SIO
  // d'un produit à l'autre ne peut pas faire passer une vente pour un
  // doublon de l'autre.
  const { duplicate } = await logWebhook({
    source: opts.source,
    event_id: eventId,
    event_type: eventType,
    payload: body,
    status: "received",
  });
  if (duplicate) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (!email) {
    return NextResponse.json({ ok: false, reason: "no_email" });
  }

  // ── Remboursement / annulation ──
  const isTerminal =
    forcedTerminal ||
    (!!eventType && TERMINAL_EVENT_RE.test(eventType) && !TRANSIENT_FAILURE_RE.test(eventType));
  if (isTerminal) {
    if (opts.onTerminal === "downgrade") {
      // Seul l'upsell est remboursé : il garde l'Atelier, il perd les
      // bonus et le générateur. On ne touche pas à la commission
      // affiliée, qui porte sur la vente d'entrée.
      const res = await downgradeToStandardByEmail(email, `${opts.source}_refund`);
      return NextResponse.json({ ok: res.ok, action: "downgraded", reason: res.reason });
    }
    await revokeAccessByEmail(email);
    // La commission affiliée liée à cette commande ne doit plus compter.
    // Best-effort : ne bloque jamais la révocation.
    const refundOrderId = extractStr(body, [
      "data.order.id",
      "order.id",
      "data.order_id",
      "order_id",
      "data.id",
    ]);
    if (refundOrderId) {
      await refundCommissionByOrder(refundOrderId).catch(() => ({ refunded: 0 }));
    }
    return NextResponse.json({ ok: true, action: "revoked" });
  }

  if (eventType && TRANSIENT_FAILURE_RE.test(eventType)) {
    return NextResponse.json({ ok: true, action: "noop_transient" });
  }

  // ── Octroi d'accès (achat confirmé) ──
  //
  // Sur un bon de commande de deuxième chance, c'est NOUS qui envoyons
  // l'email, parce que le message dépend de ce qu'on découvre juste après :
  // l'adresse de commande correspond-elle à un compte existant ?
  const result = await grantAccessByEmail(email, opts.source, contactId, opts.tier, {
    suppressEmail: opts.expectsExistingAccount === true,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  // ── L'ADRESSE QUI NE CORRESPOND À AUCUN COMPTE ──
  //
  // Béné, 7 août 2026 : "il faut aussi anticiper ceux qui vont commander
  // la mise à jour avec un autre email que celui qu'ils ont utilisé pour
  // l'atelier, même si je les préviens sur le bon de commande."
  //
  // ON OUVRE L'ACCÈS QUAND MÊME, sur l'adresse de la commande. Il a payé :
  // le laisser sans rien pendant qu'on démêle serait le pire des deux
  // mondes, et la moitié de ces gens sont peut-être de vrais nouveaux
  // clients. On l'AVERTIT, et on prévient Béné pour qu'elle puisse
  // basculer le palier sur la bonne adresse.
  let mismatch = false;
  if (opts.expectsExistingAccount) {
    const etat = { created: result.created, previousTier: result.previousTier };
    mismatch = isOrphanBonusOrder(true, etat);
    const lien = result.actionUrl ?? null;
    if (lien) {
      const { subject, html } =
        bonusOrderEmailKind(true, etat) === "mismatch"
          ? bonusEmailMismatchEmail({ actionUrl: lien, email })
          : bonusUnlockedEmail({ actionUrl: lien, email });
      await sendEmail({ to: email, subject, html });
    }
    if (mismatch) {
      // Best-effort de bout en bout : une alerte qui n'part pas ne doit
      // jamais faire échouer une vente encaissée.
      const alerte = bonusMismatchAdminEmail({ email, source: opts.source });
      // UN SEUL ENVOI : le `map` en faisait un par adresse admin, et les
      // deux arrivent dans la meme boite (Bene, 25 aout 2026).
      await alerterAdmins({ subject: alerte.subject, html: alerte.html });
      console.warn(`[sioAtelier] deuxieme chance sur une adresse inconnue : ${email}`);
    }
  }

  // ── Essai Tiquiz Plus ──
  // Best-effort de bout en bout : un échec ici ne doit JAMAIS annuler
  // l'accès à l'Atelier, que la cliente vient de payer.
  const orderId = extractStr(body, [
    "data.order.id",
    "order.id",
    "data.order_id",
    "order_id",
    "data.id",
  ]);
  let trialStatus: string | null = null;
  if (opts.trial === "legacy20") {
    const t = await maybeGrantPlusTrial({
      sioEmail: email,
      funnel: detectPlusTrialFunnel(body),
      orderId,
      origin: opts.source,
    });
    trialStatus = t.status;
  } else if (opts.trial === "ads15") {
    // 15 jours, tunnel dédié, AUCUNE place consommée : les compteurs de
    // l'opération des 20 places restent justes.
    const t = await maybeGrantPlusTrial({
      sioEmail: email,
      funnel: ADS_TRIAL_FUNNEL,
      orderId,
      origin: opts.source,
      forcedDays: ADS_PLUS_TRIAL_DAYS,
    });
    trialStatus = t.status;
  }

  return NextResponse.json({
    ok: true,
    action: "granted",
    tier: opts.tier,
    created: result.created,
    plus_trial: trialStatus,
    // Visible dans le journal des webhooks : c'est la trace qui permet de
    // retrouver une commande arrivee sur une adresse inconnue.
    email_mismatch: mismatch,
  });
}
