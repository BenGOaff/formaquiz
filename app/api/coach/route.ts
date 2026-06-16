// app/api/coach/route.ts
// Coach IA : GET = historique, POST = envoyer un message.
// Auth + enrollment requis. Limite de messages par jour. Garde-fous
// anti-hallucination dans le prompt systeme (lib/coach/knowledge.ts).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getViewer } from "@/lib/parcours";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { buildCoachSystemPrompt, type CoachAnswer } from "@/lib/coach/knowledge";

const DAILY_LIMIT = 40; // messages eleve par jour
const HISTORY_LIMIT = 12; // messages passes envoyes en contexte

async function getOrCreateThread(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("coach_threads")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("coach_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer || !viewer.enrolled) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const supabase = await getSupabaseServerClient();
  const threadId = await getOrCreateThread(supabase, viewer.userId);
  if (!threadId) return NextResponse.json({ ok: true, messages: [] });

  const { data: messages } = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  dayNumber: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const viewer = await getViewer();
  if (!viewer || !viewer.enrolled) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { message, dayNumber } = parsed.data;

  const supabase = await getSupabaseServerClient();

  // Limite par jour (anti-abus + maitrise du cout).
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("coach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.userId)
    .eq("role", "user")
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  // Base de connaissance : les jours publies.
  const { data: days } = await supabase
    .from("days")
    .select("id, day_number, title, subtitle, intro_html")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const currentDay = dayNumber != null ? (days ?? []).find((d) => d.day_number === dayNumber) ?? null : null;

  // Reponses de l'eleve sur le jour en cours (personnalisation).
  let currentAnswers: CoachAnswer[] = [];
  if (currentDay) {
    const { data: qs } = await supabase
      .from("questions")
      .select("id, prompt")
      .eq("day_id", currentDay.id);
    const { data: ans } = await supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", viewer.userId)
      .eq("day_id", currentDay.id);
    const promptById = new Map((qs ?? []).map((q) => [q.id as string, q.prompt as string]));
    currentAnswers = (ans ?? [])
      .map((a) => ({
        prompt: promptById.get(a.question_id as string) ?? "",
        value: (a.value_text || a.value_choice || "") as string,
      }))
      .filter((a) => a.prompt && a.value);
  }

  const system = buildCoachSystemPrompt({
    days: days ?? [],
    currentDay,
    niche: viewer.profile?.niche ?? null,
    level: viewer.profile?.level ?? null,
    currentAnswers,
  });

  const threadId = await getOrCreateThread(supabase, viewer.userId);
  if (!threadId) return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });

  // Historique recent pour le contexte de conversation.
  const { data: past } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const history = (past ?? [])
    .reverse()
    .map((m) => ({ role: m.role as string, content: m.content as string }));

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const body = buildClaudeMessageBody({
    model,
    max_tokens: 900,
    system,
    messages: [...history, { role: "user", content: message }],
  });

  let reply: string;
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
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
    }
    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text).join("")
      : "";
    reply = sanitizeAiText((text || "").trim());
    if (!reply) reply = "Désolée, je n'ai pas réussi à répondre. Reformule, ou pose la question dans la communauté.";
  } catch {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }

  // Persiste les deux messages (le carnet de conversation de l'eleve).
  const now = new Date();
  await supabase.from("coach_messages").insert([
    { thread_id: threadId, user_id: viewer.userId, role: "user", content: message, created_at: now.toISOString() },
    { thread_id: threadId, user_id: viewer.userId, role: "assistant", content: reply, created_at: new Date(now.getTime() + 1).toISOString() },
  ]);

  return NextResponse.json({ ok: true, reply });
}
