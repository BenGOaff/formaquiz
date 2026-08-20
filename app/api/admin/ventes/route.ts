// app/api/admin/ventes/route.ts
//
// LA LISTE DES VENTES, STRIPE ET PAYPAL DANS LE MÊME TABLEAU.
//
// Lue dans `webhook_logs`, pliée par `buildSales`. La route ne décide
// rien : elle lit la table, appelle la fonction pure, et complète ce que
// PayPal ne met pas dans ses événements.
//
// -- CE QUE PAYPAL NE DIT PAS ------------------------------------------
//
// L'événement `PAYMENT.CAPTURE.COMPLETED` ne porte pas l'adresse de
// l'acheteur : elle vit sur la COMMANDE, pas sur la capture. On relit
// donc la commande, mais seulement pour les lignes PayPal affichées, et
// jamais plus de `MAX_ENRICHISSEMENTS` d'un coup : un aller-retour
// réseau par ligne ferait une page qui met dix secondes à s'afficher le
// jour où il y aura cent ventes.
//
// Une adresse manquante n'empêche RIEN : le remboursement se fait sur
// l'identifiant de capture, pas sur l'email.

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminGuard";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { readOwnerPaypal } from "@/lib/checkout/ownerAccount";
import { getOwnerPaypalOrder } from "@/lib/checkout/paypalOwner";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Combien de commandes PayPal on accepte de relire par affichage. */
const MAX_ENRICHISSEMENTS = 25;

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("webhook_logs")
    .select("source, event_type, payload, created_at")
    .in("source", ["stripe", "paypal"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin/ventes] lecture impossible:", error.message);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }

  const ventes = buildSales((data ?? []) as EventRow[]);

  // On complète les ventes PayPal, et seulement celles là.
  const compte = readOwnerPaypal(process.env);
  if (compte) {
    const aCompleter = ventes
      .filter((v) => v.provider === "paypal" && !v.email)
      .slice(0, MAX_ENRICHISSEMENTS);
    await Promise.all(
      aCompleter.map(async (v) => {
        // La capture ne connaît pas sa commande dans notre pliage : on
        // interroge PayPal avec l'identifiant qu'on a. S'il ne rend
        // rien, la ligne reste affichable sans adresse.
        const commande = await getOwnerPaypalOrder({ compte, orderId: v.ref });
        if (commande?.email) {
          v.email = commande.email;
          v.name = commande.name;
        }
      }),
    );
  }

  return NextResponse.json({ ok: true, ventes });
}
