// app/api/commande/paypal/webhook/route.ts
//
// PAYPAL NOUS DIT QUE L'ARGENT EST RENTRÉ (OU REPARTI).
//
// Jumeau du webhook Stripe, avec les mêmes quatre garanties, et elles
// ont toutes un drame derrière elles :
//
// 1. **L'authenticité, avant tout traitement.** PayPal ne signe pas avec
//    un secret partagé : on lui RENVOIE l'en-tête et le corps, et c'est
//    lui qui dit si c'est authentique. Sans ça, cette adresse distribue
//    l'Atelier à qui la connaît.
// 2. **L'idempotence, avant toute ouverture.** PayPal réessaie tant
//    qu'il n'a pas un 2xx. C'est la base qui tranche, via l'index unique
//    `(source, event_id)` de `webhook_logs`.
// 3. **On relit la commande chez PayPal** au lieu de croire le corps
//    reçu. L'authenticité prouve l'expéditeur, pas la fraîcheur.
// 4. **Le produit vient du catalogue**, jamais d'une devinette.
//
// On répond 200 même quand on n'a rien fait : un 500 sur un cas compris
// et écarté déclencherait des réessais en boucle. Une erreur n'est
// renvoyée que sur une VRAIE panne, où le réessai est ce qu'on veut.

import { NextRequest, NextResponse } from "next/server";

import { grantAccessByEmail, revokeAccessByEmail } from "@/lib/access/grantAccess";
import { findOwnerProduct, tierForOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerPaypal, readOwnerPaypalWebhookId } from "@/lib/checkout/ownerAccount";
import {
  getOwnerPaypalOrder,
  readCustomId,
  verifyOwnerPaypalWebhook,
} from "@/lib/checkout/paypalOwner";
import { sendEmail } from "@/lib/email/resend";
import { refundGoodbyeEmail } from "@/lib/email/templates";
import { logWebhookEvent } from "@/lib/webhooks/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La source du journal, distincte de Stripe et de Systeme.io. */
const SOURCE = "paypal";

/** Ce qu'on lit d'un événement PayPal. */
interface PaypalEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string | null;
    status?: string;
    payer?: { email_address?: string | null; name?: { given_name?: string | null } | null } | null;
    supplementary_data?: { related_ids?: { order_id?: string | null } | null } | null;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const compte = readOwnerPaypal(process.env);
  const webhookId = readOwnerPaypalWebhookId(process.env);
  if (!compte || !webhookId) {
    console.error(
      "[commande/paypal/webhook] compte ou PAYPAL_WEBHOOK_ID_OWNER absent : impossible de verifier quoi que ce soit.",
    );
    // 503 et pas 200 : PayPal réessaiera, et une fois l'identifiant posé
    // les ventes de l'intervalle rentreront toutes seules.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const authentique = await verifyOwnerPaypalWebhook({
    compte,
    webhookId,
    headers: req.headers,
    rawBody: raw,
  });
  if (!authentique) {
    console.warn("[commande/paypal/webhook] appel refuse : PayPal ne le reconnait pas");
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const eventType = String(event.event_type ?? "").trim() || null;
  const { duplicate } = await logWebhookEvent({
    source: SOURCE,
    event_id: String(event.id ?? "").trim() || null,
    event_type: eventType,
    payload: event,
    status: "received",
  });
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });

  // L'argent repart : on ferme, et on envoie l'email d'au revoir.
  if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    return await surRemboursement(event);
  }

  if (eventType !== "PAYMENT.CAPTURE.COMPLETED") {
    // On ne devine JAMAIS qu'un événement inconnu vaut un paiement.
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  // L'identifiant de commande vit dans les données annexes de la capture.
  // On le relit chez PayPal plutôt que de croire ce corps : c'est la
  // commande qui porte l'adresse de l'acheteur, pas la capture.
  const orderId = String(event.resource?.supplementary_data?.related_ids?.order_id ?? "").trim();
  const commande = orderId ? await getOwnerPaypalOrder({ compte, orderId }) : null;

  // Repli : si la commande est illisible, la capture porte quand même le
  // `custom_id`. Mieux vaut ouvrir l'accès avec ce qu'on a que de le
  // refuser à quelqu'un qui a payé (règle Béné du 7 août).
  const depuisCapture = readCustomId(event.resource?.custom_id);
  const email = commande?.email ?? event.resource?.payer?.email_address ?? null;
  const productId = commande?.productId ?? depuisCapture.productId;

  if (!email) {
    console.error(
      `[commande/paypal/webhook] encaissement sans adresse (commande ${orderId || "inconnue"}) : acces impossible.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  const product = findOwnerProduct(productId);
  const tier = tierForOwnerProduct(productId);
  if (!product || !tier) {
    console.error(
      `[commande/paypal/webhook] vente PAYEE pour un produit inconnu (${productId}) : ` +
        `acces NON ouvert, intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "unknown_product" });
  }

  const octroi = await grantAccessByEmail(email, "paypal", null, tier);
  if (!octroi.ok) {
    console.error(
      `[commande/paypal/webhook] acces NON ouvert pour ${email} (${octroi.reason ?? "raison inconnue"})`,
    );
    // 502 : on VEUT que PayPal réessaie, parce qu'un client a payé.
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  console.log(
    `[commande/paypal/webhook] acces ouvert pour ${email} : ${product.id}, ` +
      `compte ${octroi.created ? "cree" : "existant"}`,
  );
  return NextResponse.json({ ok: true, granted: true });
}

/**
 * UN REMBOURSEMENT PAYPAL FERME L'ACCÈS, COMME CÔTÉ STRIPE.
 *
 * PayPal ne dit pas dans cet événement si le remboursement est total ou
 * partiel de façon aussi nette que Stripe. On relit donc la commande :
 * elle seule porte l'adresse qui a reçu les accès, et sans elle on ne
 * ferme rien plutôt que de fermer au hasard.
 */
async function surRemboursement(event: PaypalEvent): Promise<NextResponse> {
  const compte = readOwnerPaypal(process.env);
  const orderId = String(event.resource?.supplementary_data?.related_ids?.order_id ?? "").trim();
  const commande = compte && orderId ? await getOwnerPaypalOrder({ compte, orderId }) : null;
  const email = commande?.email ?? null;

  if (!email) {
    console.error(
      `[commande/paypal/webhook] remboursement sans adresse retrouvee (commande ${orderId || "inconnue"}) : ` +
        `acces NON coupe. Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  await revokeAccessByEmail(email);

  const { subject, html } = refundGoodbyeEmail({ prenom: commande?.name ?? null });
  const envoi = await sendEmail({ to: email, subject, html }).catch(() => ({ ok: false }));

  console.log(
    `[commande/paypal/webhook] acces revoque pour ${email} apres remboursement, ` +
      `email d'au revoir ${envoi && "ok" in envoi && envoi.ok ? "envoye" : "NON envoye"}`,
  );
  return NextResponse.json({ ok: true, revoked: true });
}
