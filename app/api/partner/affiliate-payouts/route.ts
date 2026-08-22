// app/api/partner/affiliate-payouts/route.ts
//
// LES COMMISSIONS AFFILIÉES DE L'ATELIER, POUR LE TABLEAU DE BORD.
//
// Jumeau de la route du même nom côté Tipote. Béné pilote son business
// depuis UN écran, hébergé dans Tiquiz, mais les commissions vivent dans
// deux bases : celles de Tiquiz chez Tipote, celles de l'Atelier ici.
// Sans cette route, l'écran afficherait la moitié de ce qu'elle doit,
// et cette moitié aurait l'air d'être le total.
//
// -- LECTURE SEULE, ET RIEN DE PLUS QUE NÉCESSAIRE ---------------------
//
// Aucune coordonnée de paiement ne sort d'ici. L'écran affiche des
// montants dus, il ne verse rien. Une route qui donne plus que
// nécessaire finit par servir à autre chose.
//
// -- LE REGISTRE N'EST PAS LE MÊME QU'À CÔTÉ ---------------------------
//
// Ici l'affiliée est une élève de l'Atelier qui a activé l'affiliation :
// son `sa` vit dans `profiles.sio_affiliate_id`, pas dans une table
// `affiliates` séparée. C'est cette différence qui oblige à deux routes
// au lieu d'une, et c'est pour ça qu'elles rendent la MÊME forme : le
// lecteur, lui, n'a qu'un seul cas à traiter.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

/** Au delà, l'écran ne sert plus à rien et la requête devient lourde. */
const MAX_LIGNES = 5000;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

interface RawCommission {
  sa?: string | null;
  product_name?: string | null;
  sale_amount_cents?: number | null;
  commission_cents?: number | null;
  status?: string | null;
  sale_at?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  cancelled_at?: string | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  try {
    // `select("*")` et pas une liste de colonnes : les deux bases n'ont
    // pas exactement les memes. Nommer une colonne absente fait echouer
    // TOUTE la requete, donc l'ecran entier.
    const commissions = await supabaseAdmin
      .from("affiliate_commissions")
      .select("*")
      .order("sale_at", { ascending: false })
      .limit(MAX_LIGNES);
    if (commissions.error) throw commissions.error;

    const brut = (commissions.data ?? []) as RawCommission[];
    const sas = [...new Set(brut.map((r) => (r.sa ?? "").trim()).filter(Boolean))];

    // Le nom de l'affiliee vit sur son profil d'eleve. On l'attache ici
    // plutot que de laisser Tiquiz faire un deuxieme aller-retour : il
    // n'a pas acces a cette base.
    const noms = new Map<string, { email: string | null; name: string | null }>();
    if (sas.length > 0) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("sio_affiliate_id, email, full_name")
        .in("sio_affiliate_id", sas);
      for (const p of (data ?? []) as Array<{
        sio_affiliate_id: string | null;
        email: string | null;
        full_name: string | null;
      }>) {
        const cle = (p.sio_affiliate_id ?? "").trim();
        if (cle) noms.set(cle, { email: p.email ?? null, name: p.full_name ?? null });
      }
    }

    const rows = brut
      .filter((r) => (r.sa ?? "").trim())
      .map((r) => {
        const sa = String(r.sa).trim();
        const info = noms.get(sa);
        return {
          source: "atelier" as const,
          sa,
          name: info?.name ?? null,
          email: info?.email ?? null,
          productName: r.product_name ?? null,
          saleCents: Number(r.sale_amount_cents ?? 0) || 0,
          commissionCents: Number(r.commission_cents ?? 0) || 0,
          status: String(r.status ?? "pending"),
          saleAt: r.sale_at ?? null,
          paidAt: r.paid_at ?? null,
          refundedAt: r.refunded_at ?? r.cancelled_at ?? null,
        };
      });

    return NextResponse.json({ ok: true, rows, truncated: rows.length >= MAX_LIGNES });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[partner/affiliate-payouts] lecture impossible : ${message}`);
    // 502 : ce n'est pas la requete de Tiquiz qui est en cause. Il
    // affichera un bandeau au lieu d'un total faux.
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 502 });
  }
}
