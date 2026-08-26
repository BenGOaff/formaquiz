// app/api/commande/webhook/route.ts
//
// STRIPE NOUS DIT QUE L'ARGENT EST RENTRÉ. ON OUVRE L'ACCÈS.
//
// C'est ICI que l'accès s'ouvre, et nulle part ailleurs. Pas sur la page
// de retour, qui est une URL comme une autre et que beaucoup d'acheteuses
// ne voient jamais (paiement sur mobile, onglet fermé, réseau qui coupe).
//
// Le 7 août, Ivan a payé son abonnement et est resté en gratuit pendant
// une journée. La règle que Béné a imposée ce jour là tient en une
// phrase : "il a payé le client, il doit recevoir ses accès, point barre."
//
// -- TROIS GARDE-FOUS, ET LES TROIS COMPTENT ---------------------------
//
// 1. **La signature.** Sans elle, cette adresse est un distributeur
//    d'accès gratuits pour qui la connaît. Pas de secret posé, pas
//    d'en-tête, signature fausse ou vieille de plus de 5 minutes : on
//    refuse. L'absence ferme, comme partout.
//
// 2. **L'idempotence.** Stripe réessaie tant qu'il n'a pas un 2xx, et il
//    a raison. Un même événement ne doit ouvrir l'accès qu'une fois :
//    c'est la base de données qui tranche, via l'index unique
//    `(source, event_id)` de `webhook_logs`.
//
// 3. **On répond 200 même quand on n'a rien fait.** Un 500 sur un cas
//    qu'on a compris et écarté déclencherait des réessais en boucle. On
//    renvoie donc 200 avec une raison, sauf sur une VRAIE panne, où le
//    réessai de Stripe est exactement ce qu'on veut.
//
// -- CE QUI RESTE À FAIRE ICI ------------------------------------------
//
// La facture et le tag Systeme.io ne sont pas encore branchés. Ils
// arrivent au chantier suivant, et leur absence ne prive personne de son
// accès : c'est le point important.

import { NextRequest, NextResponse } from "next/server";

import { readRefundOutcome } from "@/lib/checkout/refund";
import { retrieveOwnerSessionByPaymentIntent } from "@/lib/checkout/stripeCheckout";
import { sendEmail } from "@/lib/email/resend";
import { refundGoodbyeEmail } from "@/lib/email/templates";

import { grantAccessByEmail, revokeAccessByEmail } from "@/lib/access/grantAccess";
import { findOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerStripe, readOwnerStripeWebhookSecret } from "@/lib/checkout/ownerAccount";
import { retrieveOwnerSession, verifyStripeSignature } from "@/lib/checkout/stripeCheckout";
import { logWebhookEvent } from "@/lib/webhooks/log";
import { annulerCommissionChezTipote, commissionnerVente } from "@/lib/affiliate/ownerSale";
import { refundCommissionByOrder } from "@/lib/affiliateTracking";
import { completerFacturation } from "@/lib/facture/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La source écrite dans `webhook_logs`, distincte de celle de Systeme.io. */
const SOURCE = "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le corps BRUT d'abord : la signature porte sur les octets reçus, pas
  // sur un objet reconstruit. Le parser avant de vérifier invaliderait la
  // vérification.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const secret = readOwnerStripeWebhookSecret(process.env);
  if (!secret) {
    console.error(
      "[commande/webhook] STRIPE_WEBHOOK_SECRET_OWNER absent : impossible de verifier quoi que ce soit, on refuse.",
    );
    // 503 et pas 200 : Stripe réessaiera, et une fois le secret posé les
    // ventes de l'intervalle rentreront toutes seules.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    console.warn("[commande/webhook] signature refusee");
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let event: RawEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const eventId = String(event.id ?? "").trim() || null;
  const eventType = String(event.type ?? "").trim() || null;

  // Idempotence AVANT toute écriture : un réessai ne doit pas rejouer une
  // vente. L'insertion et le contrôle sont la même opération, donc pas de
  // fenêtre entre les deux.
  const { duplicate } = await logWebhookEvent({
    source: SOURCE,
    event_id: eventId,
    event_type: eventType,
    payload: event,
    status: "received",
  });
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── L'ARGENT REPART : ON FERME, ET ON LE DIT BIEN ──
  //
  // Béné, 20 août : "si je rembourse les 47 €, l'accès est coupé ou pas ?
  // L'user reçoit quelle info ?" Avant ce bloc : non, et rien de nous.
  // Sur un produit à garantie 30 jours, ça voulait dire acheter, se faire
  // rembourser, et garder l'Atelier à vie.
  if (eventType === "charge.refunded") {
    return await surRemboursement(event, "remboursement");
  }

  // ── LA BANQUE REPREND L'ARGENT ──
  //
  // `charge.dispute.*` n'etait ecoute nulle part (audit du 26 aout) : un
  // impaye laissait l'acces ouvert ET la commission en route. On agit sur
  // `funds_withdrawn` (l'argent est VRAIMENT parti), pas sur `created` :
  // une contestation se conteste, et couper l'acces de quelqu'un qui va
  // gagner son litige nous ferait perdre un client pour rien.
  if (eventType === "charge.dispute.funds_withdrawn") {
    return await surRemboursement(event, "impaye");
  }
  if (eventType === "charge.dispute.created") {
    const objet = event.data?.object as { charge?: unknown; amount?: unknown } | undefined;
    console.error(
      `[commande/webhook] CONTESTATION ouverte sur ${String(objet?.charge ?? "?")} ` +
        `(${String(objet?.amount ?? "?")} c) : acces conserve. A repondre dans Stripe ` +
        `avant la date limite.`,
    );
    return NextResponse.json({ ok: true, dispute: "opened" });
  }

  // Les deux événements qui veulent dire "l'argent est là". Le second
  // couvre les paiements différés, confirmés APRÈS la session : sans lui,
  // ces ventes n'ouvriraient jamais rien.
  const encaisse =
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded";
  if (!encaisse) {
    // Tout le reste est journalisé et ignoré. On ne devine JAMAIS qu'un
    // événement inconnu vaut un paiement : c'est le garde-fou qui empêche
    // un appel mal configuré d'ouvrir un accès.
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const sessionId = String(event.data?.object?.id ?? "").trim();
  if (!sessionId) {
    console.error("[commande/webhook] evenement de paiement sans identifiant de session");
    return NextResponse.json({ ok: true, reason: "no_session" });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error("[commande/webhook] STRIPE_SECRET_KEY_OWNER absente : impossible de relire la vente.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // On RELIT la vente chez Stripe au lieu de croire le corps de l'appel.
  // La signature prouve que l'appel vient de Stripe, elle ne prouve pas
  // que l'objet qu'il porte est à jour : sur un paiement différé, le
  // `payment_status` du corps peut encore dire "unpaid".
  const vente = await retrieveOwnerSession(compte.key, sessionId);
  if (!vente) {
    console.error(`[commande/webhook] session ${sessionId} illisible chez Stripe`);
    // Vraie panne : on veut le réessai.
    return NextResponse.json({ ok: false, reason: "unreadable_session" }, { status: 502 });
  }

  if (!vente.paid) {
    return NextResponse.json({ ok: true, reason: "not_paid_yet" });
  }
  if (!vente.email) {
    // Sans adresse, on ne peut ouvrir aucun compte. Ça ne devrait pas
    // arriver (Stripe collecte toujours l'email), mais le silence ici
    // coûterait un client : on le crie dans le journal.
    console.error(`[commande/webhook] vente ${sessionId} PAYEE mais sans email : acces impossible`);
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  const product = findOwnerProduct(vente.productId);
  if (!product) {
    // Une vente encaissée dont on ne sait pas nommer le produit. On
    // n'invente pas de palier, mais on ne se tait pas non plus : c'est
    // exactement la situation d'Ivan, et elle appelle une action humaine.
    console.error(
      `[commande/webhook] vente ${sessionId} PAYEE pour un produit inconnu (${vente.productId}) : ` +
        `acces NON ouvert, intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "unknown_product" });
  }

  // CE QUE STRIPE A COLLECTÉ, GARDÉ CHEZ NOUS.
  //
  // Le formulaire carte exige déjà l'adresse et propose la case
  // entreprise : les redemander serait présenter un formulaire vide à
  // quelqu'un qui vient de le remplir.
  //
  // `completerFacturation` et pas `ecrireFacturation` : cette source ne
  // connaît ni la société ni un email de facturation distinct, et elle
  // ne doit rien effacer de ce que la personne a saisi elle même.
  if (vente.facturation) {
    const ecrit = await completerFacturation({
      email: vente.email,
      acheteur: vente.facturation,
      source: "stripe",
    });
    if (!ecrit.ok) {
      console.warn(
        `[commande/webhook] facturation non enregistree pour ${vente.email} (${ecrit.reason})`,
      );
    }
  }

  const octroi = await grantAccessByEmail(vente.email, product.source, null, product.tier);
  if (!octroi.ok) {
    console.error(
      `[commande/webhook] acces NON ouvert pour ${vente.email} (${octroi.reason ?? "raison inconnue"})`,
    );
    // 502 : on veut que Stripe réessaie, parce qu'une cliente a payé.
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  console.log(
    `[commande/webhook] acces ouvert pour ${vente.email} : ${product.id} (${product.tier}), ` +
      `compte ${octroi.created ? "cree" : "existant"}`,
  );

  // ── LA COMMISSION DE L'AFFILIÉE ──
  //
  // APRÈS l'accès, et jamais avant : une commission qui échoue ne doit
  // pas priver une acheteuse de ce qu'elle a payé. On ne renvoie donc
  // jamais d'erreur ici, on le dit dans le journal.
  //
  // Sans ce bloc, une vente faite sur NOTRE bon de commande ne payait
  // personne. Le tunnel Systeme.io, lui, attribuait bien (via
  // `/api/affiliate/sio-sale`) : on avait donc déplacé la vente sans
  // déplacer la commission, et le symptôme était l'absence de symptôme.
  await commissionnerVente({
    moyen: "stripe",
    email: vente.email,
    reference: vente.paymentRef,
    affiliateRef: vente.affiliateRef,
    affiliateCode: vente.affiliateCode,
    amountTotalCents: vente.amountTotalCents,
    amountTaxCents: vente.amountTaxCents,
    product,
  });

  return NextResponse.json({ ok: true, granted: true });
}

/** La forme d'un evenement Stripe, reduite a ce qu'on lit. */
interface RawEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      amount?: number | null;
      amount_refunded?: number | null;
      refunded?: boolean | null;
      payment_intent?: string | null;
      billing_details?: { email?: string | null; name?: string | null } | null;
    };
  };
}

/**
 * UN REMBOURSEMENT TOTAL FERME L'ACCÈS. UN REMBOURSEMENT PARTIEL, NON.
 *
 * La distinction n'est pas theorique : un geste commercial de 10 € sur
 * une vente à 47 € mettrait dehors quelqu'un qui a payé 37 € pour
 * rester dedans. La decision vit dans `readRefundOutcome`, testee, et
 * personne ne la reecrit ici.
 *
 * On repond 200 dans tous les cas de figure compris, y compris quand on
 * ne fait rien : un 500 sur un cas compris et ecarte declencherait des
 * reessais en boucle. Seule une VRAIE panne merite un 5xx.
 */
async function surRemboursement(
  event: RawEvent,
  motif: "remboursement" | "impaye",
): Promise<NextResponse> {
  const charge = event.data?.object ?? null;

  // UN IMPAYE N'EST JAMAIS PARTIEL, et l'objet recu n'est pas le meme :
  // sur un litige, `data.object` n'a ni `amount_refunded` ni `refunded`,
  // donc `readRefundOutcome` y repondrait "aucun remboursement" et on ne
  // ferait rien. La mecanique est un PARAMETRE, pas une lecture de la
  // forme recue.
  if (motif === "remboursement") {
    const issue = readRefundOutcome(charge);
    if (issue !== "full") {
      console.log(`[commande/webhook] remboursement ${issue} : acces conserve`);
      return NextResponse.json({ ok: true, refund: issue });
    }
  }

  const compte = readOwnerStripe(process.env);
  const paymentIntent = String(charge?.payment_intent ?? "").trim();

  // L'adresse de la SESSION d'abord : c'est celle qui a recu les acces.
  // `billing_details.email` est l'adresse de facturation de la carte, qui
  // peut etre celle du conjoint, de l'entreprise, ou vide. On ne coupe
  // pas un acces sur cette base la, on s'en sert seulement en dernier
  // recours pour ne pas rester muet.
  const vente =
    compte && paymentIntent
      ? await retrieveOwnerSessionByPaymentIntent(compte.key, paymentIntent)
      : null;
  const email = vente?.email ?? charge?.billing_details?.email ?? null;
  const prenom = vente?.name ?? charge?.billing_details?.name ?? null;

  if (!email) {
    console.error(
      "[commande/webhook] remboursement TOTAL sans adresse retrouvee : acces NON coupe, " +
        `paiement ${paymentIntent || "inconnu"}. Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  await revokeAccessByEmail(email);

  // ── LA COMMISSION TOMBE AVEC LA VENTE ──
  //
  // `refundCommissionByOrder` existe depuis des mois, et n'etait branchee
  // QUE sur le remboursement Systeme.io (`lib/webhooks/sioAtelier.ts`).
  // Le jour ou l'Atelier a eu son propre bon de commande, personne ne
  // l'a rebranchee : une vente remboursee ICI continuait de payer son
  // affilie. Une logique ecrite pour un cas, pas portee sur l'autre.
  //
  // La cle est celle de la CREATION (`<moyen>:<reference>`), sinon on
  // n'annule rien, en silence.
  if (paymentIntent) {
    const r = await refundCommissionByOrder(`stripe:${paymentIntent}`);
    // ET dans le registre CENTRAL (Tipote), ou la commission vit depuis
    // le 26 aout. N'annuler que localement laisserait la ligne centrale
    // murir puis partir en virement sur une vente remboursee.
    await annulerCommissionChezTipote(`stripe:${paymentIntent}`);
    if (r.refunded > 0) {
      console.log(`[commande/webhook] ${r.refunded} commission(s) annulee(s) apres remboursement`);
    }
  }

  // ON SE QUITTE BIEN, ET C'EST NOUS QUI LE DISONS.
  //
  // Stripe envoie deja son propre email de remboursement, froid et dans
  // son gabarit. Best-effort : un echec d'envoi ne doit pas annuler la
  // revocation, qui est la partie qui compte.
  const { subject, html } = refundGoodbyeEmail({ prenom });
  const envoi = await sendEmail({ to: email, subject, html }).catch(() => ({ ok: false }));

  console.log(
    `[commande/webhook] acces revoque pour ${email} apres remboursement total, ` +
      `email d'au revoir ${envoi && "ok" in envoi && envoi.ok ? "envoye" : "NON envoye"}`,
  );
  return NextResponse.json({ ok: true, revoked: true });
}
