// lib/video/uploadToken.ts
// Frappe des tokens d'upload pour le pipeline vidéo auto-hébergé du VPS
// (serveur tus + nginx), namespace applicatif "formaquiz". Porté de
// lib/popquiz/playback.ts de Tiquiz : le serveur tus valide ce JWT HS256
// avec le MÊME secret (POPQUIZ_TUS_JWT_SECRET).
//
// Server-only : importer ce module côté client fuiterait le secret HMAC.
import "server-only";
import crypto from "node:crypto";

export const FORMAQUIZ_APP = "formaquiz" as const;

const UPLOAD_TOKEN_TTL_SECONDS = 60 * 60; // 1 h, large pour un gros upload

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export interface UploadClaims {
  sub: string; // Supabase user id (l'admin)
  app: typeof FORMAQUIZ_APP;
  videoId: string;
  ext: string;
  kind: "source" | "thumbnail";
}

const SAFE_EXT = /^[a-z0-9]{1,8}$/;
const ALLOWED_SOURCE_EXT = new Set(["mp4", "webm", "mov", "m4v", "mkv"]);
const ALLOWED_THUMB_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export function normalizeExt(name: string, kind: UploadClaims["kind"]): string | null {
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return null;
  const ext = name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!SAFE_EXT.test(ext)) return null;
  const allow = kind === "source" ? ALLOWED_SOURCE_EXT : ALLOWED_THUMB_EXT;
  return allow.has(ext) ? ext : null;
}

export function signUploadToken(
  claims: UploadClaims,
  ttlSec = UPLOAD_TOKEN_TTL_SECONDS,
): { token: string; expiresAt: number } {
  const secret = requireEnv("POPQUIZ_TUS_JWT_SECRET");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSec;
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ ...claims, iat: now, exp }));
  const sig = b64url(crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return { token: `${header}.${payload}.${sig}`, expiresAt: exp };
}
