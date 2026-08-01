// app/api/me/affiliate-carousel/route.ts
//
// Télécharge toutes les slides d'un carrousel en un seul .zip. Sans ça,
// l'affilié devrait enregistrer les images une par une (jusqu'à 7 clics
// droits pour un seul post).
//
// Sécurité : on ne sert QUE les fichiers déclarés dans le kit affilié
// (ATELIER_POSTS), jamais un chemin arbitraire venu de la query.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { zipStore } from "@/lib/zipStore";
import { ATELIER_POSTS } from "@/lib/affiliateContent/posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("post") ?? "";
  const post = ATELIER_POSTS.find((p) => p.id === id);
  if (!post || post.visual.kind !== "carousel") {
    return NextResponse.json({ ok: false, reason: "unknown_carousel" }, { status: 404 });
  }

  try {
    const entries = await Promise.all(
      post.visual.slides.map(async (slide, i) => ({
        name: `${post.id}-slide-${String(i + 1).padStart(2, "0")}.png`,
        data: new Uint8Array(await readFile(path.join(process.cwd(), "public", slide))),
      })),
    );
    const zip = zipStore(entries);
    return new NextResponse(zip as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${post.id}-images.zip"`,
        "Content-Length": String(zip.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[affiliate-carousel] lecture impossible", err);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }
}
