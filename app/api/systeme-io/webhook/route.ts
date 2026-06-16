// app/api/systeme-io/webhook/route.ts
// Webhook Systeme.io pour FormaQuiz : crée l'accès (enrollment) après
// achat, le révoque sur remboursement/annulation. Porté du pattern
// Tiquiz : secret partagé OU signature HMAC, idempotence stricte.
//
// SIO réessaie agressivement sur tout non-2xx : on est donc idempotent
// (un même event_id n'accorde l'accès qu'une fois) et on répond 200
// même sur soft-fail métier pour ne pas déclencher de retry inutile.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSignatureMode, verifySioSignature } from "@/lib/sioWebhookSig";
import { grantAccessByEmail, revokeAccessByEmail } from "@/lib/access/grantAccess";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;

// Événements qui terminent un accès payé : on révoque l'enrollment.
const TERMINAL_EVENT_RE = /CANCEL|REFUND|EXPIR|CHARGEBACK/i;
// Problème de paiement transitoire : on ne révoque PAS (le retry peut
// réussir, SIO enverra un CANCEL définitif sinon).
const TRANSIENT_FAILURE_RE = /FAIL|DECLIN|DISPUT/i;

function secretMatches(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function deepGet(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

function extractStr(body: unknown, paths: string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

async function logWebhook(row: {
  event_id: string | null;
  event_type: string | null;
  payload: unknown;
  status: string;
  error?: string | null;
}): Promise<{ duplicate: boolean }> {
  const { error } = await supabaseAdmin.from("webhook_logs").insert({
    source: "systeme_io",
    event_id: row.event_id,
    event_type: row.event_type,
    payload: row.payload,
    status: row.status,
    error: row.error ?? null,
  });
  // Conflit sur l'index unique (source, event_id) = event déjà traité.
  if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
    return { duplicate: true };
  }
  return { duplicate: false };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── Authentification de l'appel ──
  const sigMode = getSignatureMode();
  if (sigMode.mode === "required") {
    const verdict = verifySioSignature(rawBody, req.headers.get("x-webhook-signature"));
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
    }
  } else {
    // Fallback : secret partagé dans l'URL (?secret=...).
    const provided = new URL(req.url).searchParams.get("secret");
    if (!secretMatches(provided, WEBHOOK_SECRET)) {
      return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const eventType = extractStr(body, ["type", "event", "event_type", "data.type"]);
  const eventId = extractStr(body, ["id", "event_id", "data.id", "webhook_event_id"]);
  const email = extractStr(body, [
    "data.customer.email",
    "customer.email",
    "data.contact.email",
    "contact.email",
    "data.email",
    "email",
  ]);
  const contactId = extractStr(body, ["data.contact.id", "contact.id", "data.customer.id"]);

  // ── Idempotence ──
  const { duplicate } = await logWebhook({
    event_id: eventId,
    event_type: eventType,
    payload: body,
    status: "received",
  });
  if (duplicate) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (!email) {
    // Pas d'email exploitable : soft-fail (200) pour éviter les retries.
    return NextResponse.json({ ok: false, reason: "no_email" });
  }

  // ── Révocation (remboursement / annulation) ──
  if (eventType && TERMINAL_EVENT_RE.test(eventType) && !TRANSIENT_FAILURE_RE.test(eventType)) {
    await revokeAccessByEmail(email);
    return NextResponse.json({ ok: true, action: "revoked" });
  }

  if (eventType && TRANSIENT_FAILURE_RE.test(eventType)) {
    return NextResponse.json({ ok: true, action: "noop_transient" });
  }

  // ── Octroi d'accès (achat confirmé) ──
  const result = await grantAccessByEmail(email, "systeme_io", contactId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  return NextResponse.json({ ok: true, action: "granted", created: result.created });
}
