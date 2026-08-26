// app/api/commande/paypal/route.ts
//
// DÉMARRE UN PAIEMENT PAYPAL POUR L'ATELIER.
//
//   POST { produit, k, ref?, code? }  ->  { ok: true, approveUrl, mode }
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
import { lireAcheteur } from "@/lib/facture/identite";
import { ecrireFacturation } from "@/lib/facture/store";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { checkoutReturnBase } from "@/lib/sales/salesHosts";
import { resolveAppUrl } from "@/lib/appUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    produit?: string;
    k?: string;
    ref?: string;
    /** Le CODE PUBLIC de nos liens (`?ref=`), distinct du `sa`. */
    code?: string;
    email?: string;
    facturation?: unknown;
  };
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

  // ON RAMENE L'ACHETEUR LA OU IL A ACHETE.
  //
  // Sur atelierduquiz.fr il n'a aucune cle dans son URL : le renvoyer
  // sur le domaine canonique lui donnerait une page 404 juste apres
  // avoir paye. `checkoutReturnBase` n'accepte que NOS domaines de
  // vente, donc un Host falsifie ne peut pas detourner le retour.
  const base = checkoutReturnBase(req.nextUrl.origin, resolveAppUrl(req.nextUrl.origin));
  const cle = encodeURIComponent(String(body.k ?? ""));
  const retour = `${base}/commande/${product.id}/retour?k=${cle}`;

  // L'ADRESSE ET LA FACTURATION, DEMANDÉES AVANT PAYPAL.
  //
  // Stripe les collecte dans son formulaire. PayPal ne demande rien et
  // ne rend rien d'exploitable : sans ce bloc, une vente PayPal de
  // l'Atelier n'a AUCUNE adresse, donc aucune facture opposable. Et
  // l'écrire APRÈS le retour serait trop tard : celui qui ferme son
  // onglet a payé quand même.
  //
  // **On n'échoue jamais ici.** Une écriture refusée ne doit pas
  // empêcher d'encaisser : la facture sortira marquée "à compléter",
  // ce qui se rattrape, alors qu'une vente perdue ne se rattrape pas.
  const email = String(body.email ?? "").trim().toLowerCase();
  if (email && body.facturation) {
    const ecrit = await ecrireFacturation({
      email,
      acheteur: { ...lireAcheteur(body.facturation), email },
      source: "checkout",
    });
    if (!ecrit.ok) {
      console.error(
        `[commande/paypal] facturation NON enregistree pour ${email} (${ecrit.reason}) : ` +
          `la facture sortira incomplete.`,
      );
    }
  }

  const result = await createOwnerPaypalOrder({
    compte,
    product,
    // PayPal ajoute lui-même `?token=<id de commande>` en revenant. On
    // le relit sous le nom `token` sur la page de retour.
    returnUrl: retour,
    // Annuler ramène au bon de commande, pas sur un cul-de-sac.
    cancelUrl: `${base}/commande/${product.id}?k=${cle}`,
    affiliateRef: typeof body.ref === "string" ? body.ref.trim().slice(0, 40) : null,
    // Le code public de nos liens. Il voyage dans un champ SÉPARÉ du
    // `sa` : les deux ne se devinent jamais l'un l'autre.
    affiliateCode: typeof body.code === "string" ? body.code.trim().slice(0, 40) : null,
    // Elle GAGNE sur l'adresse du compte PayPal : voir `buildCustomId`.
    email: email || null,
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
