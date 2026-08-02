// app/api/partner/coach/route.ts
//
// LE COACH COMMUN (demande Béné, 2 août 2026).
//
// "Si tu as l'Atelier tu peux communiquer avec ton coach aussi bien dans
// Tiquiz que dans l'Atelier (un coach commun qui peut lire partout et la
// conversation suit d'une app à l'autre). Et si t'as pas l'Atelier t'as
// le coach qui te guide quand même, avec toutes ses connaissances."
//
// UN SEUL CERVEAU, ici. Tiquiz et Tipote n'ont qu'un widget qui parle à
// cet endpoint par le secret partagé. Dupliquer le coach dans chaque app
// donnerait trois coachs à corriger et trois qui se contredisent : on a
// déjà donné avec les modules jumeaux.
//
// Élève -> son fil habituel (coach_threads / coach_messages), donc la
//          conversation suit vraiment d'une app à l'autre, et le coach se
//          souvient. Pas de quota supplémentaire ici : c'est son coach.
// Non-élève -> fil invité indexé par email, 2 questions par jour, puis
//          orientation vers un plan Tiquiz (blocage technique) ou vers
//          l'Atelier (blocage de méthode), lien affilié inclus.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { buildCoachSystemPrompt } from "@/lib/coach/knowledge";
import { embedQuery } from "@/lib/coach/embedder";
import {
  classifyCoachNeed,
  buildCoachUpsell,
  guestQuota,
  GUEST_DAILY_QUESTIONS,
} from "@/lib/coach/needRouting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();
const HISTORY_LIMIT = 12;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => (u.email ?? "").toLowerCase() === lower);
    if (found) return found.id;
    if (users.length < perPage) return null;
  }
  return null;
}

/** Élève inscrit et actif ? Décide du fil ET du quota. */
async function resolveStudent(email: string): Promise<string | null> {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("enrollments")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { status?: string } | null)?.status === "active" ? userId : null;
}

async function studentThreadId(userId: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from("coach_threads")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data: created } = await supabaseAdmin
    .from("coach_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  return (created as { id: string } | null)?.id ?? null;
}

type Msg = { role: "user" | "assistant"; content: string };

async function loadHistory(userId: string | null, email: string, threadId: string | null): Promise<Msg[]> {
  if (userId && threadId) {
    const { data } = await supabaseAdmin
      .from("coach_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    return ((data ?? []) as Msg[]).reverse();
  }
  const { data } = await supabaseAdmin
    .from("coach_guest_messages")
    .select("role, content")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  return ((data ?? []) as Msg[]).reverse();
}

/** Questions DÉJÀ posées aujourd'hui par un non-élève. */
async function guestAskedToday(email: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("coach_guest_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("role", "user")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

async function callAnthropic(apiKey: string, body: unknown): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = (json.content ?? [])
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join("")
          .trim();
        return text || null;
      }
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      /* réseau : on retente une fois */
    }
  }
  return null;
}

const bodySchema = z.object({
  email: z.string().email(),
  message: z.string().min(1).max(2000),
  app: z.enum(["tiquiz", "tipote"]).default("tiquiz"),
  /** Où elle se trouve dans l'app ("éditeur de quiz", "stats"...). */
  context: z.string().max(400).optional(),
  /** Identifiant affilié du parrain, pour ne jamais léser personne. */
  affiliateSa: z.string().max(64).optional(),
  /** true = on veut seulement l'historique, pas de réponse. */
  historyOnly: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { message, app, context, affiliateSa, historyOnly } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const userId = await resolveStudent(email);
  const isStudent = userId !== null;
  const threadId = isStudent ? await studentThreadId(userId) : null;
  const history = await loadHistory(userId, email, threadId);

  if (historyOnly) {
    return NextResponse.json({ ok: true, isStudent, messages: history });
  }

  // ── Quota des non-élèves ────────────────────────────────────────
  // L'élève n'en a pas ici : le coach fait partie de ce qu'il a payé.
  let upsell: { need: string; url: string } | null = null;
  let isLastFreeQuestion = false;
  if (!isStudent) {
    const quota = guestQuota(await guestAskedToday(email));
    const need = classifyCoachNeed(message);
    if (!quota.allowed) {
      // On ne laisse jamais quelqu'un devant une porte fermée sans lui
      // dire où aller : le refus PORTE l'orientation.
      return NextResponse.json({
        ok: false,
        reason: "quota",
        isStudent: false,
        dailyLimit: GUEST_DAILY_QUESTIONS,
        upsell: buildCoachUpsell(need, affiliateSa),
      });
    }
    isLastFreeQuestion = quota.isLast;
    if (quota.isLast) upsell = buildCoachUpsell(need, affiliateSa);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // ── Même cerveau que le coach de l'Atelier ──────────────────────
  const [{ data: settings }, { data: knowledge }, { data: days }] = await Promise.all([
    supabaseAdmin.from("coach_settings").select("instruction").eq("id", "default").maybeSingle(),
    supabaseAdmin
      .from("coach_knowledge")
      .select("title, content")
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("days")
      .select("id, day_number, title, subtitle, intro_html")
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
  ]);

  const { cacheablePrefix, dynamic: dyn } = buildCoachSystemPrompt({
    instruction: settings?.instruction ?? null,
    docs: knowledge ?? [],
    days: days ?? [],
    currentDay: null,
    firstName: null,
    niche: null,
    activityType: null,
    maturity: null,
    monetization: null,
    adsBudget: null,
    currentAnswers: [],
  });

  let dynamicPart = dyn;
  dynamicPart += `\n\n=== D'OÙ VIENT CETTE QUESTION ===\nL'utilisateur écrit depuis ${
    app === "tiquiz" ? "Tiquiz (l'outil de quiz)" : "Tipote"
  }${context ? `, écran : ${context}` : ""}.`;
  if (!isStudent) {
    // Le coach doit savoir a qui il parle : quelqu'un qui n'a pas suivi
    // la formation n'a aucune reference commune. Il aide quand meme, et
    // il ne fait JAMAIS l'article : la proposition est ajoutee par le
    // code, apres la reponse, et une seule fois.
    dynamicPart +=
      "\n\nCette personne n'a PAS suivi L'Atelier du Quiz. Aide-la quand même," +
      " complètement et concrètement, sans jamais supposer qu'elle connaît" +
      " le vocabulaire ou les étapes du programme. Ne lui propose PAS" +
      " d'acheter quoi que ce soit : ce n'est pas ton rôle ici.";
  }

  // RAG : les passages de la formation les plus proches de la question.
  // Best-effort total, comme dans le coach interne.
  try {
    const qvec = await embedQuery(message);
    const { data: hits } = await supabaseAdmin.rpc("match_coach_chunks", {
      query_embedding: qvec,
      match_count: 6,
      min_similarity: 0.3,
    });
    const rows = (hits ?? []) as { content?: string }[];
    if (rows.length > 0) {
      dynamicPart +=
        "\n\n=== EXTRAITS DE LA FORMATION (à utiliser en priorité) ===\n" +
        rows.map((r) => `- ${r.content ?? ""}`).join("\n");
    }
  } catch {
    /* index absent ou modèle non chargé : le coach répond sans */
  }

  const body = buildClaudeMessageBody({
    model: resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet"),
    max_tokens: 1200,
    system: [
      { type: "text", text: cacheablePrefix, cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamicPart },
    ],
    messages: [...history, { role: "user" as const, content: message }],
  });

  const raw = await callAnthropic(apiKey, body);
  if (!raw) {
    return NextResponse.json({ ok: false, reason: "ai_failed" }, { status: 502 });
  }
  const reply = sanitizeAiText(raw);

  // ── On garde la conversation ────────────────────────────────────
  // Élève : dans SON fil, celui de l'Atelier. C'est ce qui fait qu'elle
  // suit d'une app à l'autre.
  try {
    if (isStudent && threadId && userId) {
      await supabaseAdmin.from("coach_messages").insert([
        { thread_id: threadId, user_id: userId, role: "user", content: message },
        { thread_id: threadId, user_id: userId, role: "assistant", content: reply },
      ]);
    } else {
      await supabaseAdmin.from("coach_guest_messages").insert([
        { email, app, role: "user", content: message },
        { email, app, role: "assistant", content: reply },
      ]);
    }
  } catch {
    // Un historique non enregistré ne doit pas priver l'utilisateur de
    // sa réponse : elle est déjà calculée, on la rend.
  }

  return NextResponse.json({
    ok: true,
    isStudent,
    reply,
    ...(isLastFreeQuestion ? { lastFreeQuestion: true } : {}),
    ...(upsell ? { upsell } : {}),
  });
}
