// app/api/admin/video/upload-token/route.ts
// Prépare un upload vidéo : crée une ligne formaquiz_videos (pending) et
// frappe un token tus. Le client (tus-js-client) uploade ensuite vers
// FORMAQUIZ_TUS_ENDPOINT avec ce token. Le worker du VPS transcode en
// HLS et passe la ligne à 'ready'.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signUploadToken, normalizeExt, FORMAQUIZ_APP } from "@/lib/video/uploadToken";

const schema = z.object({ filename: z.string().min(1).max(300) });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const endpoint = process.env.FORMAQUIZ_TUS_ENDPOINT;
  if (!endpoint || !process.env.FORMAQUIZ_JWT_SECRET) {
    // Pipeline pas encore branché : l'admin utilise le champ URL vidéo.
    return NextResponse.json({ ok: false, reason: "pipeline_not_configured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const ext = normalizeExt(parsed.data.filename, "source");
  if (!ext) {
    return NextResponse.json({ ok: false, reason: "bad_ext" }, { status: 400 });
  }

  // Crée la ligne vidéo (pending) pour obtenir un id stable.
  const storagePathBase = `${FORMAQUIZ_APP}/raw/${admin.userId}`;
  const { data: video, error } = await supabaseAdmin
    .from("formaquiz_videos")
    .insert({ user_id: admin.userId, source: "upload", status: "pending" })
    .select("id")
    .single();
  if (error || !video) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  }

  const storagePath = `${storagePathBase}/${video.id}/source.${ext}`;
  await supabaseAdmin.from("formaquiz_videos").update({ storage_path: storagePath }).eq("id", video.id);

  const { token, expiresAt } = signUploadToken({
    sub: admin.userId,
    app: FORMAQUIZ_APP,
    videoId: video.id,
    ext,
    kind: "source",
  });

  return NextResponse.json({
    ok: true,
    videoId: video.id,
    endpoint,
    token,
    expiresAt,
    storagePath,
  });
}
