// app/api/admin/ventes/rembourser/route.ts
//
// REMBOURSER DEPUIS NOTRE ADMIN, SANS OUVRIR STRIPE NI PAYPAL.
//
//   POST { ref, provider }  ->  { ok: true }
//                           ->  { ok: false, reason }
//
// -- CE QUE CETTE ROUTE NE FAIT PAS, ET C'EST VOULU --------------------
//
// **Elle ne révoque aucun accès et n'envoie aucun email.** Elle demande
// le remboursement au fournisseur, et c'est tout.
//
// La fermeture de l'accès et l'email d'au revoir sont accrochés au
// webhook (`charge.refunded` chez Stripe, `PAYMENT.CAPTURE.REFUNDED`
// chez PayPal), qui part de toute façon, que le remboursement ait été
// déclenché ici ou depuis le tableau de bord du fournisseur.
//
// Le faire AUSSI ici donnerait deux chemins pour une même décision, et
// c'est le défaut que ce dépôt paie le plus cher : deux endroits qui
// décident la même chose finissent par se contredire. Ici la
// contradiction serait un accès coupé sans email, ou un email envoyé
// deux fois.
//
// Conséquence assumée : entre le clic et la fermeture de l'accès, il
// s'écoule le temps d'un aller-retour de webhook. Quelques secondes.
//
// -- REMBOURSEMENT TOTAL UNIQUEMENT ------------------------------------
//
// Un remboursement partiel ne coupe pas l'accès (cf.
// `lib/checkout/refund.ts`). Proposer ici un geste dont la conséquence
// change selon le montant serait un piège pour celle qui clique. Le
// partiel se fait chez le fournisseur, en connaissance de cause.

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminGuard";
import { readOwnerPaypal, readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { refundOwnerPaypalCapture } from "@/lib/checkout/paypalOwner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = "https://api.stripe.com";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  let body: { ref?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const ref = String(body.ref ?? "").trim();
  const provider = String(body.provider ?? "").trim();
  if (!ref || (provider !== "stripe" && provider !== "paypal")) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (provider === "paypal") {
    const compte = readOwnerPaypal(process.env);
    if (!compte) {
      return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
    }
    const out = await refundOwnerPaypalCapture({ compte, captureId: ref });
    if (!out.ok) {
      console.error(`[admin/rembourser] PayPal a refuse ${ref} : ${out.detail ?? ""}`);
      return NextResponse.json({ ok: false, reason: "provider_refused" }, { status: 502 });
    }
    console.log(`[admin/rembourser] ${admin.email} a rembourse la capture PayPal ${ref}`);
    return NextResponse.json({ ok: true });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  try {
    const res = await fetch(`${STRIPE_API}/v1/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${compte.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `payment_intent=${encodeURIComponent(ref)}`,
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!res.ok) {
      const detail = json.error?.message ?? `HTTP ${res.status}`;
      console.error(`[admin/rembourser] Stripe a refuse ${ref} : ${detail}`);
      // LA CAUSE LA PLUS PROBABLE EST UNE PERMISSION MANQUANTE.
      //
      // La clé restreinte doit avoir "Remboursements" en ÉCRITURE. Sans
      // ça Stripe répond 403, et un message générique enverrait Béné
      // chercher un bug dans le code alors que tout se règle en deux
      // clics dans son tableau de bord. Le serveur renvoie la RAISON,
      // l'écran sait comment le dire.
      const manquePermission = res.status === 403 || /permission|not have access/i.test(detail);
      return NextResponse.json(
        { ok: false, reason: manquePermission ? "missing_permission" : "provider_refused" },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error(`[admin/rembourser] reseau : ${(e as Error).message}`);
    return NextResponse.json({ ok: false, reason: "network" }, { status: 502 });
  }

  console.log(`[admin/rembourser] ${admin.email} a rembourse le paiement Stripe ${ref}`);
  return NextResponse.json({ ok: true });
}
