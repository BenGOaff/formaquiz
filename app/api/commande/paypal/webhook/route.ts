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
import { annulerCommissionChezTipote, commissionnerVente } from "@/lib/affiliate/ownerSale";
import { refundCommissionByOrder } from "@/lib/affiliateTracking";
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
import { construireFacture } from "@/lib/facture/construire";
import { lireAcheteur } from "@/lib/facture/identite";
import {
  encaissementDepuisCapture,
  remboursementDepuisRefund,
  type EncaissementPaypal,
  type RemboursementPaypal,
} from "@/lib/facture/paypalVente";
import { emettreFacture, factureDeLaVente, lireFacturation } from "@/lib/facture/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La source du journal, distincte de Stripe et de Systeme.io. */
const SOURCE = "paypal";

/** Ce qu'on lit d'un événement PayPal. */
interface PaypalEvent {
  id?: string;
  event_type?: string;
  /** L'heure de l'événement chez PayPal. Repli pour dater une facture. */
  create_time?: string;
  resource?: {
    id?: string;
    custom_id?: string | null;
    status?: string;
    /** La v2 écrit `value` et `currency_code`, jamais `total`. */
    amount?: { value?: string | null; currency_code?: string | null } | null;
    /** Le seul fil d'un remboursement vers sa capture d'origine. */
    links?: { href?: string | null; rel?: string | null }[] | null;
    create_time?: string;
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

  // ── LA FACTURE, APRÈS L'ACCÈS ──
  //
  // Après, et jamais avant : l'accès est ce que le client a payé, la
  // facture est ce qu'il lui faut ensuite. Aucune des deux ne doit
  // empêcher l'autre.
  const encaissement = encaissementDepuisCapture(event.resource, event.create_time);
  if (encaissement) {
    await facturerVente({
      email,
      encaissement,
      productId: product.id,
      libelle: product.label,
    });
  } else {
    console.error(
      `[commande/paypal/webhook] capture sans montant lisible pour ${email} : ` +
        `facture NON emise, a faire a la main.`,
    );
  }

  // ── LA COMMISSION DE L'AFFILIÉE, APRÈS L'ACCÈS ──
  //
  // Même fonction que le paiement par carte : deux moyens de paiement
  // qui calculeraient chacun leur commission finiraient par payer deux
  // montants différents pour la même vente.
  //
  // La référence d'idempotence est la CAPTURE : c'est elle qui identifie
  // l'encaissement, et c'est elle qu'on rembourse.
  await commissionnerVente({
    moyen: "paypal",
    email,
    reference: commande?.captureId ?? (String(event.resource?.id ?? "").trim() || null),
    affiliateRef: commande?.affiliateRef ?? depuisCapture.affiliateRef,
    affiliateCode: commande?.affiliateCode ?? depuisCapture.affiliateCode,
    amountTotalCents: commande?.amountTotalCents ?? 0,
    // PayPal ne ventile pas la TVA : voir `VenteACommissionner`.
    amountTaxCents: 0,
    product,
  });

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
/**
 * LA FACTURE DE LA VENTE.
 *
 * L'Atelier vend un ACHAT UNIQUE : une vente, une facture, émise sur la
 * CAPTURE. Pas d'échéance, donc rien à répéter.
 *
 * PayPal n'émet pas de facture. Ce qu'il envoie à l'acheteur est un avis
 * de paiement : ni numérotation, ni identité complète du vendeur, ni
 * adresse de l'acheteur, ni ventilation de TVA. Un client professionnel
 * ne peut rien en faire, et nous non plus.
 *
 * **ON N'ÉCHOUE JAMAIS ICI.** Le client a payé, son accès est ouvert :
 * un problème de facturation ne doit pas transformer la réponse en 502,
 * qui ferait rejouer l'ouverture d'accès.
 */
async function facturerVente(args: {
  email: string;
  encaissement: EncaissementPaypal;
  productId: string | null;
  libelle: string;
}): Promise<void> {
  try {
    const acheteur = await lireFacturation({ email: args.email });
    const facture = construireFacture(
      "facture",
      {
        provider: "paypal",
        saleRef: args.encaissement.saleRef,
        productId: args.productId,
        libelle: args.libelle,
        currency: args.encaissement.currency,
        totalCents: args.encaissement.totalCents,
        paidAt: args.encaissement.paidAt,
        emailCle: args.email,
      },
      acheteur,
    );
    const ligne = await emettreFacture(facture);
    if (!ligne) return;
    console.log(
      `[commande/paypal/webhook] facture ${ligne.numero} emise pour ${args.email}` +
        (facture.aCompleter.length ? ` (a completer : ${facture.aCompleter.join(", ")})` : ""),
    );
  } catch (e) {
    console.error(`[commande/paypal/webhook] facture NON emise : ${(e as Error).message}`);
  }
}

/**
 * L'AVOIR. Un remboursement n'efface pas une facture : il en émet une
 * autre, en négatif, qui la référence. C'est la loi, et c'est aussi la
 * seule façon de garder une numérotation continue.
 */
async function avoirDuRemboursement(args: {
  email: string;
  remboursement: RemboursementPaypal;
  libelle: string;
}): Promise<void> {
  try {
    const origine = args.remboursement.saleRef
      ? await factureDeLaVente("paypal", args.remboursement.saleRef)
      : null;
    // L'identité vient de la FACTURE D'ORIGINE quand elle existe : un
    // avoir doit porter la même adresse que ce qu'il annule, même si le
    // client a déménagé depuis.
    const acheteur = origine
      ? lireAcheteur(origine.acheteur)
      : await lireFacturation({ email: args.email });
    const avoir = construireFacture(
      "avoir",
      {
        provider: "paypal",
        saleRef: args.remboursement.refundRef,
        productId: origine?.product_id ?? null,
        libelle: `Remboursement - ${origine?.libelle ?? args.libelle}`,
        currency: args.remboursement.currency,
        totalCents: args.remboursement.totalCents,
        paidAt: args.remboursement.paidAt,
        emailCle: args.email,
      },
      acheteur,
    );
    const ligne = await emettreFacture(avoir, origine?.id ?? null);
    if (ligne) {
      console.log(
        `[commande/paypal/webhook] avoir ${ligne.numero} emis pour ${args.email}` +
          (origine ? ` (annule ${origine.numero})` : " (facture d'origine introuvable)"),
      );
    }
  } catch (e) {
    console.error(`[commande/paypal/webhook] avoir NON emis : ${(e as Error).message}`);
  }
}

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

  // ── LA COMMISSION TOMBE AVEC LA VENTE ──
  //
  // La cle est celle de la CREATION : `paypal:<captureId>`. Sur un
  // remboursement, la capture d'origine se lit dans les `links` du
  // remboursement (`remboursementDepuisRefund` la sort deja), ou sur la
  // commande relue.
  const captureOrigine =
    commande?.captureId ?? remboursementDepuisRefund(event.resource, event.create_time)?.saleRef ?? null;
  if (captureOrigine) {
    const r = await refundCommissionByOrder(`paypal:${captureOrigine}`);
    // ET dans le registre CENTRAL (Tipote), ou la commission vit depuis
    // le 26 aout. N'annuler que localement laisserait la ligne centrale
    // murir puis partir en virement sur une vente remboursee.
    await annulerCommissionChezTipote(`paypal:${captureOrigine}`);
    if (r.refunded > 0) {
      console.log(`[commande/paypal/webhook] ${r.refunded} commission(s) annulee(s) apres remboursement`);
    }
  } else {
    console.error(
      `[commande/paypal/webhook] remboursement de ${email} : capture d'origine introuvable, ` +
        `commission NON annulee. A verifier a la main.`,
    );
  }

  // L'AVOIR. On rend l'argent, donc on rend la pièce qui l'annule.
  const remboursement = remboursementDepuisRefund(event.resource, event.create_time);
  if (remboursement) {
    await avoirDuRemboursement({
      email,
      remboursement,
      libelle: "L'Atelier du Quiz",
    });
  }

  const { subject, html } = refundGoodbyeEmail({ prenom: commande?.name ?? null });
  const envoi = await sendEmail({ to: email, subject, html }).catch(() => ({ ok: false }));

  console.log(
    `[commande/paypal/webhook] acces revoque pour ${email} apres remboursement, ` +
      `email d'au revoir ${envoi && "ok" in envoi && envoi.ok ? "envoye" : "NON envoye"}`,
  );
  return NextResponse.json({ ok: true, revoked: true });
}
