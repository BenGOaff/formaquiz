// app/api/partner/acces-offert/route.ts
//
// TIQUIZ OFFRE L'ATELIER À QUELQU'UN QUI VIENT DE PASSER AU PAYANT.
//
// Béné, 18 septembre 2026 : "s'il upgrade sur la version payante
// (n'importe laquelle) il reçoit en plus l'Atelier du Quiz gratos...
// on lui ouvre les accès à l'Atelier (accès ouverts + envoi d'un email
// avec lien etc.)".
//
//   POST { email, motif }  header x-partner-secret
//
// -- POURQUOI CETTE PORTE EXISTE ---------------------------------------
//
// Les deux app ont deux bases. Tiquiz sait qu'un compte vient de passer
// au payant ; seul l'Atelier peut ouvrir un accès à l'Atelier. Sans
// cette porte, il faudrait que Tiquiz écrive dans la base d'à côté, ce
// qui est la façon la plus sûre de se retrouver avec deux codes qui
// créent des comptes différemment.
//
// `/api/partner/enrollment` existait déjà et ne fait que LIRE (il dit si
// une adresse est élève). Celle ci ÉCRIT, et elle est donc plus
// prudente : elle refuse en 401 sans dire pourquoi, et elle compare le
// secret en TEMPS CONSTANT.
//
// -- ELLE NE DÉCIDE PAS SI LE CADEAU EST DÛ ----------------------------
//
// La fenêtre (7 jours après l'inscription gratuite, puis 2 jours aux
// relances) est une règle de TIQUIZ, décidée dans
// `lib/cadeau/atelierOffert.ts`, pur et testé, là où vivent la date
// d'inscription et le plan précédent. Refaire ce calcul ici avec des
// données qu'on n'a pas donnerait deux réponses à la même question.
//
// Ici on ouvre, et on le dit.
//
// -- IDEMPOTENTE ------------------------------------------------------
//
// `grantAccessByEmail` rend `previousTier` : quand il est déjà `plus`,
// l'accès existait, et on répond `deja_eleve` sans renvoyer un deuxième
// email de bienvenue à quelqu'un qui suit déjà la formation.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { grantAccessByEmail } from "@/lib/access/grantAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  // La longueur d'abord : `timingSafeEqual` LÈVE sur deux tampons de
  // tailles différentes, elle ne rend pas `false`.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  let body: { email?: unknown; motif?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  // LA SOURCE EST ÉCRITE EN CLAIR DANS L'ENROLLMENT. Le jour où on se
  // demandera pourquoi cette personne a l'Atelier sans l'avoir acheté,
  // c'est cette ligne qui répondra.
  const motif = typeof body.motif === "string" ? body.motif.trim().slice(0, 80) : "";
  const source = `tiquiz_upgrade${motif ? `:${motif}` : ""}`;

  try {
    // `plus` : l'Atelier COMPLET. C'est ce qu'elle offre ("il a l'atelier
    // à vie, gratos"), et c'est aussi le défaut historique de cette
    // fonction. L'écrire quand même : un défaut qui change un jour
    // changerait ce cadeau sans que personne ne le voie.
    const r = await grantAccessByEmail(email, source, null, "plus");

    if (!r.ok) {
      console.error(`[partner/acces-offert] ${email} NON ouvert : ${r.reason ?? "inconnu"}`);
      // 502 : Tiquiz doit pouvoir le redire. Quelqu'un a payé et attend
      // un cadeau annoncé.
      return NextResponse.json({ ok: false, reason: r.reason ?? "grant_failed" }, { status: 502 });
    }

    if (r.previousTier === "plus") {
      console.log(`[partner/acces-offert] ${email} etait deja eleve : rien renvoye.`);
      return NextResponse.json({ ok: true, dejaEleve: true, created: false });
    }

    console.log(
      `[partner/acces-offert] Atelier ouvert pour ${email} (${source}), ` +
        `compte ${r.created ? "cree" : "existant"}`,
    );
    return NextResponse.json({ ok: true, dejaEleve: false, created: r.created });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[partner/acces-offert] ${email} : ${message}`);
    return NextResponse.json({ ok: false, reason: "erreur" }, { status: 502 });
  }
}
