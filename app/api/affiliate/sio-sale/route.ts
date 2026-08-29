// app/api/affiliate/sio-sale/route.ts
// Webhook de VENTE Systeme.io -> crée la commission affiliée (source de
// vérité du suivi des gains). Calqué sur l'attribution affiliate Tipote.
//
// USAGE (Béné, côté Systeme.io) :
//   Automation "Vente d'un produit" (Atelier du Quiz OU abonnement Tiquiz)
//   -> Webhook POST vers https://quizing.tipote.com/api/affiliate/sio-sale
//
// On extrait email + order id + montant + produit + sa, on détecte le produit
// (Quizing 70% / Tiquiz 40%) et on attribue à l'affilié. Idempotent
// (unique source_app + sio_order_id). Toujours 200 pour éviter les retries SIO
// sur les cas non applicables (vente sans affilié, produit hors périmètre).
import { NextRequest, NextResponse } from "next/server";
import {
  attributeQuizingSale,
  detectProduct,
  extractAmountCents,
  extractAmountHtCents,
  extractEmail,
  extractFunnelUrl,
  extractOfferId,
  extractOrderId,
  extractPaymentRef,
  extractProductName,
  extractSaFromPayload,
} from "@/lib/affiliateTracking";
import { resumerPayload } from "@/lib/affiliate/inspecterPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    try {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text).entries());
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  if (!body) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: CORS });
  }

  const email = extractEmail(body);
  const orderId = extractOrderId(body);
  // Réf. de paiement (facture) : clé d'idempotence par échéance -> chaque mois
  // d'un abonnement Tiquiz récurrent compte, au lieu d'être dédupliqué.
  const paymentRef = extractPaymentRef(body);
  const productName = extractProductName(body);
  const offerId = extractOfferId(body);
  const funnelUrl = extractFunnelUrl(body);
  const saHint = extractSaFromPayload(body);
  // Base de commission = HT (règle Béné : 70% Atelier / 40% Tiquiz sur le HT).
  const amountCents = extractAmountHtCents(body);
  const totalCents = extractAmountCents(body);
  const product = detectProduct(funnelUrl, offerId, productName);

  console.log(
    `[affiliate/sio-sale] email=${email ?? "(none)"} order=${orderId ?? "(none)"} ht=${amountCents} ttc=${totalCents} url=${funnelUrl ?? "(none)"} offer=${offerId ?? "(none)"} product=${product?.source_app ?? "(none)"}`,
  );

  // LE WEBHOOK DE VENTE EST LE PLUS PROMETTEUR : c'est l'événement qui
  // porte la commission chez Systeme.io, donc celui qui a le plus de
  // raisons de nommer l'affilié. On journalise sa CARTE quand on ne
  // trouve rien : les chemins et leur type, jamais les valeurs.
  // À retirer une fois le bon chemin ajouté à la liste.
  if (!saHint) {
    console.log(
      `[affiliate/sio-sale] SA INTROUVABLE, forme du payload :\n${resumerPayload(body)}`,
    );
  }

  if (!email || !orderId) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 200, headers: CORS });
  }
  if (!product) {
    // Produit hors périmètre (ni Atelier du Quiz ni Tiquiz).
    return NextResponse.json({ ok: false, reason: "not_our_product" }, { status: 200, headers: CORS });
  }

  // DEUX PORTES POUR UNE MEME VENTE TIQUIZ, ET ELLES ECRIVENT DANS DEUX
  // BASES DIFFERENTES.
  //
  // Cette route accepte les produits `tiquiz` et les enregistre dans la
  // base de l'ATELIER, pendant que le webhook Systeme.io de Tiquiz
  // remonte les memes ventes chez TIPOTE. Les deux tables portent chacune
  // leur contrainte d'unicite, donc rien ne les empeche de compter la
  // meme vente deux fois, et le tableau de bord ADDITIONNE les deux
  // sources (`lib/admin/affiliateSources.ts`).
  //
  // On ne change pas le routage a l'aveugle : il depend des automatisations
  // Systeme.io, qu'on ne voit pas d'ici. On le rend VISIBLE, et la
  // verification est notee dans le cahier des charges (audit du 26 aout).
  if (product.source_app === "tiquiz") {
    console.warn(
      `[affiliate/sio-sale] vente TIQUIZ enregistree dans la base de l'Atelier ` +
        `(order ${orderId}) : verifier qu'elle n'est pas AUSSI remontee par le webhook ` +
        `Systeme.io de Tiquiz, sinon elle est comptee deux fois.`,
    );
  }

  const result = await attributeQuizingSale({
    email,
    sio_order_id: orderId,
    sio_payment_ref: paymentRef,
    sale_amount_cents: amountCents,
    product,
    product_name: productName,
    sa_hint: saHint,
    raw_payload: body,
  });

  // 200 dans tous les cas non-erreur pour ne pas faire retry SIO inutilement.
  const httpStatus = result.status === "error" ? 500 : 200;
  return NextResponse.json({ ok: result.status === "attributed", ...result }, { status: httpStatus, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
