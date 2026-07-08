// lib/video/playback.ts
// Mint d'URL de lecture vidéo signée (secure_link), pour les vidéos
// auto-hébergées sur le VPS et servies par Caddy (vhost videos.*).
// Server-only : ne jamais importer côté client (fuite du secret).
//
// L'algorithme DOIT correspondre exactement au validateur du serveur tus
// (/opt/popquiz-tus, handleValidateSecureLink) :
//   md5_base64url( `${expires}${pathname} ${secret}` )
// avec pathname = le chemin décodé (commence par /quizing/...), un
// espace avant le secret. Le validateur lit le 1er segment du chemin
// (/quizing/) pour choisir QUIZING_VIDEO_SECRET.
import "server-only";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Day } from "@/lib/types";

const PLAYBACK_TTL_SECONDS = 60 * 60 * 6; // 6 h, large pour une session de cours

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Construit une URL de lecture signée pour un fichier du stockage
 * (storage_path relatif, ex. "quizing/raw/<uid>/<vid>/source.mp4").
 * Renvoie null si l'hébergement vidéo n'est pas configuré.
 */
export function signVideoUrl(storagePath: string, ttlSec = PLAYBACK_TTL_SECONDS): string | null {
  // QUIZING_* avec fallback FORMAQUIZ_* (ancien nom d'avant le renommage,
  // encore présent dans le .env prod, cf. lib/video/uploadToken.ts).
  const base = process.env.QUIZING_VIDEO_PLAYBACK_BASE ?? process.env.FORMAQUIZ_VIDEO_PLAYBACK_BASE;
  const secret = process.env.QUIZING_VIDEO_SECRET ?? process.env.FORMAQUIZ_VIDEO_SECRET;
  if (!base || !secret || !storagePath) return null;

  const pathname = "/" + storagePath.replace(/^\/+/, "");
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const md5 = crypto.createHash("md5").update(`${expires}${pathname} ${secret}`).digest();
  const sig = b64url(md5);
  return `${base.replace(/\/+$/, "")}${pathname}?md5=${sig}&expires=${expires}`;
}

/**
 * Résout la source vidéo jouable d'un jour :
 *  - si le jour pointe une vidéo uploadée (video_id) prête, renvoie une
 *    URL signée vers le fichier source,
 *  - sinon retombe sur video_url (YouTube, lien direct...).
 * `status` indique si une vidéo uploadée est encore en attente.
 */
export async function resolveDayVideoSrc(
  day: Pick<Day, "video_url" | "video_id">,
): Promise<{ src: string | null; pending: boolean }> {
  if (day.video_id) {
    const { data: video } = await supabaseAdmin
      .from("quizing_videos")
      .select("storage_path, status")
      .eq("id", day.video_id)
      .maybeSingle();
    if (video?.status === "ready" && video.storage_path) {
      return { src: signVideoUrl(video.storage_path as string), pending: false };
    }
    // Vidéo liée mais pas encore prête (upload en cours / échoué).
    if (video) return { src: null, pending: video.status !== "failed" };
  }
  return { src: day.video_url ?? null, pending: false };
}
