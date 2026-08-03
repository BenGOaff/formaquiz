// app/api/me/affiliate-generate/route.ts
//
// Rédacteur promo des affiliés de l'Atelier. Volontairement bridé :
// l'affilié ne pilote pas un prompt libre, il décrit SON audience et
// choisit un format. Les faits produits, les règles d'écriture et le refus
// hors sujet sont côté serveur (lib/affiliateGeneratorBrief).
//
// Jumeau de /affiliate/api/generate côté Tipote, sans le paramètre
// `product` : ici, il n'y a que l'Atelier à promouvoir.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import {
  GENERATOR_FORMATS,
  FORMAT_REMINDER,
  buildSystemPrompt,
  looksLikeFormat,
  type GeneratorFormat,
} from "@/lib/affiliateGeneratorBrief";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Générations autorisées par affilié et par jour : assez pour un vrai
 *  atelier d'écriture, pas assez pour transformer l'endpoint en API. */
const DAILY_LIMIT = 30;

const schema = z.object({
  format: z.enum(GENERATOR_FORMATS),
  audience: z.string().min(3).max(600),
  angle: z.string().max(600).optional(),
  tone: z.string().max(600).optional(),
});

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[affiliate-generate] clé Anthropic absente côté serveur");
    return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { format, audience, angle, tone } = parsed.data;

  // Quota journalier, compté sur la même table que le coach : une seule
  // façon de compter la consommation IA de l'élève dans toute l'app.
  const supabase = await getSupabaseServerClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("affiliate_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.userId)
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    // Retour à minuit : on donne le délai réel plutôt qu'un vague "plus tard".
    const midnight = new Date(since);
    midnight.setDate(midnight.getDate() + 1);
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        retryAfterSec: Math.max(60, Math.round((midnight.getTime() - Date.now()) / 1000)),
      },
      { status: 429 },
    );
  }

  const userPrompt = [
    // Le format est rappelé EN PREMIER dans le message : c'est la
    // consigne qui se perdait le plus souvent (un article demandé
    // revenait en post).
    FORMAT_REMINDER[format as GeneratorFormat],
    `MON AUDIENCE : ${audience.trim()}`,
    angle?.trim()
      ? `ANGLE DEMANDÉ : ${angle.trim()}`
      : "ANGLE : à toi de choisir celui qui parlera le plus à cette audience.",
    tone?.trim() ? `TON : ${tone.trim()}` : "",
    "Écris le contenu maintenant, en t'adressant à cette audience précise et en parlant de ses situations à elle.",
  ]
    .filter(Boolean)
    .join("\n");

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const system = buildSystemPrompt(format as GeneratorFormat);
  const maxTokens = format === "article" || format === "script_long" ? 4000 : 1600;

  // ON REND LA MAIN AVANT CLOUDFLARE, JAMAIS APRÈS.
  //
  // Cloudflare coupe toute requête qui dépasse ~100 secondes et rend une
  // page 524 que nous ne contrôlons pas : l'affilié voit une panne
  // d'infrastructure au lieu de notre message. Un article long, c'est
  // 4000 tokens, et la reprise de format en demande 4000 de plus : les
  // deux bout à bout pouvaient largement dépasser la limite.
  //
  // On se donne donc un budget de 85 secondes pour TOUTE la requête, pas
  // par appel. La reprise n'est tentée que s'il reste de quoi la finir.
  const deadline = Date.now() + 85_000;
  const budgetLeft = () => deadline - Date.now();

  async function callClaude(messages: { role: "user" | "assistant"; content: string }[]) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey as string,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildClaudeMessageBody({ model, max_tokens: maxTokens, temperature: 0.8, system, messages }),
      ),
      signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())),
    });
    if (!res.ok) {
      console.error("[affiliate-generate] Anthropic", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const raw: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text ?? "")
          .join("")
      : "";
    // Filet de sécurité : même briefé, un modèle peut glisser un tiret
    // cadratin. La règle anti-IA de Béné est absolue sur le contenu visible.
    return sanitizeAiText(raw).replace(/[—–]/g, "-").trim();
  }

  try {
    const messages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: userPrompt },
    ];
    let text = await callClaude(messages);
    if (text === null) {
      return NextResponse.json({ ok: false, reason: "generation_failed" }, { status: 502 });
    }

    // GARDE-FOU DE FORMAT : un article sans titre ni sous-titres est un
    // post déguisé. On ne le sert pas tel quel, on le fait refaire UNE
    // fois en montrant au modèle ce qu'il vient de produire. Une seule
    // reprise : au-delà, on rend ce qu'on a plutôt que de faire attendre
    // l'affilié indéfiniment.
    //
    // La reprise est SAUTÉE quand le budget de temps ne suffit plus : un
    // texte hors format vaut mieux qu'une page d'erreur 524 et zéro
    // texte, et l'affilié a un bouton pour relancer.
    if (text && !looksLikeFormat(format as GeneratorFormat, text) && budgetLeft() > 20_000) {
      console.warn("[affiliate-generate] format hors cible, reprise", format);
      const retry = await callClaude([
        ...messages,
        { role: "assistant", content: text },
        {
          role: "user",
          content:
            "Ce n'est pas le format demandé : il manque le titre en '# ' et les sous-titres en '## ', et c'est trop court pour un article. Réécris-le en ARTICLE DE BLOG complet, en respectant la structure obligatoire à la lettre. Renvoie uniquement l'article.",
        },
      ]);
      if (retry && looksLikeFormat(format as GeneratorFormat, retry)) text = retry;
    }

    if (!text) {
      return NextResponse.json({ ok: false, reason: "generation_failed" }, { status: 502 });
    }

    // Trace la consommation (best effort : une écriture ratée ne doit pas
    // priver l'affilié du texte qu'il vient d'obtenir).
    const { error: logErr } = await supabase
      .from("affiliate_generations")
      .insert({ user_id: viewer.userId, format });
    if (logErr) console.error("[affiliate-generate] quota non tracé", logErr.message);

    return NextResponse.json({ ok: true, text });
  } catch (err) {
    console.error("[affiliate-generate] échec de génération", err);
    return NextResponse.json({ ok: false, reason: "generation_failed" }, { status: 502 });
  }
}
