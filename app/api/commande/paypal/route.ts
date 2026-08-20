// app/api/commande/paypal/route.ts
//
// DÉMARRE UN PAIEMENT PAYPAL POUR L'ATELIER.
//
//   POST { produit, k, ref? }  ->  { ok: true, approveUrl, mode }
//                              ->  { ok: false, reason }
//
// Jumelle de `/api/commande/session` (Stripe). Les deux gardes sont les
// mêmes, et elles ont la même raison d'être :
//
//   - la porte du chantier (`?k=`), tant que ce n'est pas annoncé ;
//   - **on n'encaisse pas de vrai argent tant que rien n'ouvre l'accès.**
//
// Cette route n'ouvre AUCUN accès. Elle crée une intention de paiement.
// L'accès s'ouvre dans le webhook, quand PayPal confirme l'encaissement.

import { NextRequest, NextResponse } from "next/server";

import { findOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerPaypal, readOwnerPaypalWebhookId } from "@/lib/checkout/ownerAccount";
import { createOwnerPaypalOrder } from "@/lib/checkout/paypalOwner";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { resolveAppUrl } from "@/lib/appUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { produit?: string; k?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!isSalesOpen(body.k, req.headers.get("host"), process.env)) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const product = findOwnerProduct(body.produit);
  if (!product) {
    return NextResponse.json({ ok: false, reason: "unknown_product" }, { status: 404 });
  }

  const compte = readOwnerPaypal(process.env);
  if (!compte) {
    console.error(
      "[commande/paypal] PAYPAL_CLIENT_ID_OWNER / PAYPAL_SECRET_OWNER absents ou invalides : aucun paiement PayPal possible.",
    );
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // ON N'ENCAISSE PAS DE VRAI ARGENT TANT QUE RIEN N'OUVRE L'ACCÈS.
  //
  // Sans identifiant de webhook, aucune confirmation de PayPal ne peut
  // être vérifiée, donc une vraie vente serait encaissée et l'acheteur
  // n'aurait rien. C'est le drame Ivan, sauf que cette fois l'argent
  // serait sur notre compte. En bac à sable on laisse passer : personne
  // n'est débité.
  if (compte.mode === "live" && !readOwnerPaypalWebhookId(process.env)) {
    console.error(
      "[commande/paypal] compte LIVE sans PAYPAL_WEBHOOK_ID_OWNER : paiement refuse, " +
        "sinon une vente serait encaissee sans ouvrir d'acces.",
    );
    return NextResponse.json({ ok: false, reason: "live_without_webhook" }, { status: 503 });
  }

  const base = resolveAppUrl(req.nextUrl.origin);
  const cle = encodeURIComponent(String(body.k ?? ""));
  const retour = `${base}/commande/${product.id}/retour?k=${cle}`;

  const result = await createOwnerPaypalOrder({
    compte,
    product,
    // PayPal ajoute lui-même `?token=<id de commande>` en revenant. On
    // le relit sous le nom `token` sur la page de retour.
    returnUrl: retour,
    // Annuler ramène au bon de commande, pas sur un cul-de-sac.
    cancelUrl: `${base}/commande/${product.id}?k=${cle}`,
    affiliateRef: typeof body.ref === "string" ? body.ref.trim().slice(0, 40) : null,
  });

  if (!result.ok || !result.approveUrl) {
    console.error(`[commande/paypal] PayPal a refuse : ${result.reason} / ${result.detail ?? ""}`);
    // 502 : ce n'est pas la requête de l'acheteur qui est en cause.
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    approveUrl: result.approveUrl,
    // L'écran DOIT pouvoir dire "bac à sable" : un paiement PayPal de
    // test ressemble trait pour trait à une vraie vente.
    mode: compte.mode,
  });
}
