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

import { grantAccessByEmail } from "@/lib/access/grantAccess";
import { findOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerStripe, readOwnerStripeWebhookSecret } from "@/lib/checkout/ownerAccount";
import { retrieveOwnerSession, verifyStripeSignature } from "@/lib/checkout/stripeCheckout";
import { logWebhookEvent } from "@/lib/webhooks/log";

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

  let event: {
    id?: string;
    type?: string;
    data?: { object?: { id?: string; payment_status?: string } };
  };
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
  return NextResponse.json({ ok: true, granted: true });
}
