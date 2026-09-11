// app/api/partner/pilotage/route.ts
//
// L'ATELIER DIT CE QU'IL SAIT DE SES ÉLÈVES ET DE SES VENTES.
//
//   GET  (header x-partner-secret)  ->  { ok: true, people, sales }
//
// Béné, 21 août : "tu peux pas centraliser ?" Puis : "sur mon dashboard
// je dois retrouver mes clients actuels et ceux qui sont passés et
// passeront encore par systeme io sinon c'est tout sauf fiable et
// exhaustif."
//
// Tiquiz et l'Atelier sont deux apps, deux bases. Un écran unique
// suppose donc que l'une lise l'autre, et c'est le rôle de cette route :
// **en LECTURE SEULE, et rien d'autre.** Aucune action, aucun
// remboursement, aucune modification. Ce qui se fait sur l'Atelier
// continue de se faire sur l'Atelier.
//
// -- LE SECRET EXISTE DÉJÀ, ON N'EN CRÉE PAS UN DEUXIÈME ---------------
//
// `PARTNER_SHARED_SECRET` est posé sur les deux serveurs depuis le pont
// métriques et le coach. En ajouter un nouveau voudrait dire une
// variable de plus à poser des deux côtés, donc une occasion de plus de
// l'oublier sur un seul : c'est exactement le drame du 19 août, où
// `SALES_PREVIEW_TOKEN` était sur un serveur et pas sur l'autre.
//
// -- POURQUOI ON ENVOIE DES PERSONNES, PAS SEULEMENT DES VENTES --------
//
// Parce que "qui teste en gratos" est la première ligne de sa liste. Un
// élève de l'Atelier qui n'a jamais rien payé chez Tiquiz doit exister
// dans le tableau, sinon l'écran ne montre que ceux qui ont payé et
// perd toute la moitié qui compte pour la rétention.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // L'ABSENCE FERME. Sans secret posé, cette route ne répond rien : une
  // variable oubliée ne doit pas ouvrir la liste des élèves.
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  try {
    // Les comptes. On pagine : `listUsers` plafonne a perPage par page,
    // et une liste tronquee en silence ferait un tableau de bord faux
    // sans que rien ne le dise.
    const comptes: { id: string; email: string; createdAt: string; lastSignIn: string | null }[] = [];
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const lot = (data?.users ?? []) as {
        id: string;
        email?: string | null;
        created_at: string;
        last_sign_in_at?: string | null;
      }[];
      for (const u of lot) {
        const email = String(u.email ?? "").trim().toLowerCase();
        if (email) {
          comptes.push({
            id: u.id,
            email,
            createdAt: u.created_at,
            lastSignIn: u.last_sign_in_at ?? null,
          });
        }
      }
      if (lot.length < 1000) break;
    }

    const [{ data: enrollments }, { data: profiles }, { data: progress }, { data: events }] =
      await Promise.all([
        supabaseAdmin.from("enrollments").select("user_id, status, tier, granted_at"),
        supabaseAdmin.from("profiles").select("id, full_name"),
        supabaseAdmin.from("progress").select("user_id, status"),
        supabaseAdmin
          .from("webhook_logs")
          .select("source, event_id, event_type, payload, created_at")
          .in("source", ["stripe", "paypal"])
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

    const parUser = new Map(
      (enrollments ?? []).map((e) => [String(e.user_id), e as Record<string, unknown>]),
    );
    const nomParUser = new Map(
      (profiles ?? []).map((p) => [String(p.id), (p.full_name as string | null) ?? null]),
    );
    const faitParUser = new Map<string, number>();
    for (const p of progress ?? []) {
      if (p.status === "completed") {
        const uid = String(p.user_id);
        faitParUser.set(uid, (faitParUser.get(uid) ?? 0) + 1);
      }
    }

    const people = comptes.map((c) => {
      const e = parUser.get(c.id);
      return {
        email: c.email,
        name: nomParUser.get(c.id) ?? null,
        /** `active` = élève inscrit. Absent = compte sans accès. */
        status: e ? String(e.status ?? "") : null,
        /** Le palier de l'Atelier (`plus`, `standard`...). */
        tier: e ? String(e.tier ?? "") || null : null,
        grantedAt: e ? ((e.granted_at as string | null) ?? null) : null,
        createdAt: c.createdAt,
        lastSignIn: c.lastSignIn,
        daysDone: faitParUser.get(c.id) ?? 0,
      };
    });

    return NextResponse.json({
      ok: true,
      people,
      // Les MEMES ventes que l'ecran Eleves, pliees par la meme fonction
      // testee. Deux lecteurs de la meme donnee finissent par diverger.
      sales: buildSales((events ?? []) as unknown as EventRow[]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[partner/pilotage] lecture impossible : ${message}`);
    // 502 et pas 200 : l'appelant DOIT savoir que ce qu'il affiche est
    // incomplet, au lieu de croire que l'Atelier n'a rien a dire.
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 502 });
  }
}
