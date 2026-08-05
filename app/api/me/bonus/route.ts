// app/api/me/bonus/route.ts
//
// Le générateur de bonus post-quiz. Prompt de Béné, corrigé ensemble le
// 5 août 2026 (cf. lib/prompts/bonus.ts pour le détail des décisions).
//
// -- ACCÈS RESTREINT, ET C'EST VOULU ----------------------------------
//
// Réservé aux adresses admin tant que Béné n'a pas testé la sortie sur
// de vrais cas. Un générateur qui consomme des tokens et rend un
// livrable qu'on n'a jamais lu n'a rien à faire devant des élèves : la
// campagne email du 3 août est sortie en JSON brut à l'écran, et
// personne ne l'avait vue avant eux.
//
// Ouvrir aux élèves = retirer le `isAdminEmail` ci-dessous et ajouter
// l'entrée dans la navigation. Deux lignes, quand elle le décidera.
//
// -- POURQUOI DEUX ÉTAPES, ET TROIS APPELS À L'ÉTAPE 2 ----------------
//
// `step: "pistes"` rend trois pistes en JSON court. `step: "produce"`
// rend UN bloc de production à la fois.
//
// Générer les trois blocs d'un coup, c'est exactement ce qui a produit
// le JSON brut du 3 août : la réponse était coupée en plein milieu,
// `JSON.parse` échouait, et l'écran affichait notre panne au lieu du
// livrable. Trois appels courts ne peuvent pas se couper l'un l'autre,
// et un bloc qui échoue laisse les deux autres intacts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { fetchQuizAudit } from "@/lib/integrations/tiquiz";
import {
  OFFER_KINDS,
  PRODUCTION_BLOCKS,
  buildPistesSystemPrompt,
  buildProductionSystemPrompt,
  renderBriefForPrompt,
  type BonusBrief,
} from "@/lib/prompts/bonus";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// LA CREATRICE NE SAISIT QUE CE QUE LE QUIZ NE SAIT PAS.
//
// "On ne reutilise pas assez les donnees du quiz : pourquoi ne pas
// prendre le quiz suivi par l'Atelier et recuperer toutes ces infos
// automatiquement ?" (Bene, 5 aout 2026). Le theme, le ton, les profils
// et le tag de partage viennent du pont Tiquiz, cote serveur : ils ne
// transitent pas par le client, donc personne ne peut les contredire.
const briefSchema = z.object({
  offerPromise: z.string().min(10).max(600),
  offerKind: z.enum(OFFER_KINDS),
  offerPrice: z.string().max(120).default(""),
  trigger: z.enum(["completion", "share"]),
  variant: z.enum(["single", "per_result"]),
});

const schema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("pistes"), brief: briefSchema }),
  z.object({
    step: z.literal("produce"),
    brief: briefSchema,
    block: z.enum(PRODUCTION_BLOCKS),
    /** Le profil pour lequel on ecrit, quand le bonus est decline. */
    profileIndex: z.number().int().min(0).max(11).optional(),
    /** La piste choisie, telle qu'elle a été montrée à l'écran. */
    chosen: z.object({
      format: z.string().max(120),
      title: z.string().max(300),
      punchline: z.string().max(600),
    }),
  }),
]);

function getApiKey(): string {
  return (process.env.ANTHROPIC_API_KEY ?? "").trim();
}

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  }
  // Voir l'en-tête : restriction volontaire, le temps du test.
  if (!isAdminEmail(viewer.email)) {
    return NextResponse.json({ ok: false, reason: "not_open_yet" }, { status: 403 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "no_api_key" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
  }
  const input = parsed.data;

  // LE QUIZ SUIVI EST LA SOURCE DE VERITE POUR TOUT LE RESTE.
  // Rien de tout ca ne vient du client : on le relit a chaque appel.
  const quizzes = await fetchQuizAudit(viewer.userId).catch(() => null);
  const quiz = (quizzes ?? []).find((q) => q.status === "active") ?? (quizzes ?? [])[0] ?? null;
  if (!quiz) {
    // UN REFUS N'EST PAS UNE PANNE, et il doit dire quoi faire.
    return NextResponse.json({ ok: false, reason: "no_quiz" }, { status: 409 });
  }

  const brief: BonusBrief = {
    ...input.brief,
    quizTitle: quiz.title || "",
    quizIntro: String(quiz.introduction ?? ""),
    addressForm: String(quiz.addressForm ?? "tu") === "vous" ? "vous" : "tu",
    profiles: (quiz.resultProfiles ?? []).map((p) => ({
      title: p.title,
      description: p.description ?? "",
    })),
    shareTagName: String(quiz.shareTagName ?? ""),
  };

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");

  async function callClaude(system: string, user: string, maxTokens: number) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildClaudeMessageBody({
          model,
          max_tokens: maxTokens,
          temperature: 0.7,
          system,
          messages: [{ role: "user", content: user }],
        }),
      ),
      // On rend la main avant Cloudflare, qui coupe a ~100 s et rend une
      // page 524 qu'on ne controle pas.
      signal: AbortSignal.timeout(85_000),
    });
    if (!res.ok) {
      console.error("[bonus] Anthropic", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = (data.content ?? []).map((c) => c.text ?? "").join("").trim();
    return raw || null;
  }

  // ── ÉTAPE 1 : les trois pistes ──
  if (input.step === "pistes") {
    const raw = await callClaude(
      buildPistesSystemPrompt(brief),
      renderBriefForPrompt(brief) + "\n\nPropose-moi les trois pistes maintenant.",
      2000,
    );
    if (!raw) {
      return NextResponse.json({ ok: false, reason: "generation_failed" }, { status: 502 });
    }
    const pistes = parsePistes(raw);
    if (!pistes) {
      // ON N'AFFICHE JAMAIS DE JSON A UNE CREATRICE (regle du 3 aout).
      // Le texte brut part dans les logs, l'ecran dit que ca n'a pas
      // abouti et propose de relancer.
      console.error("[bonus] pistes illisibles :", raw.slice(0, 1500));
      return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...pistes });
  }

  // ── ÉTAPE 2 : un bloc de production ──
  const user = [
    renderBriefForPrompt(brief, input.profileIndex),
    "",
    "LA PISTE CHOISIE :",
    `- Format : ${input.chosen.format}`,
    `- Titre : ${input.chosen.title}`,
    `- Punchline : ${input.chosen.punchline}`,
    "",
    "Produis le bloc demande, et rien d'autre.",
  ].join("\n");

  // Le contenu complet est le plus long des trois : il a son propre
  // budget. Les deux autres tiennent largement en dessous.
  const maxTokens = input.block === "content" ? 6000 : 2500;
  const raw = await callClaude(
    buildProductionSystemPrompt(brief, input.block, input.profileIndex),
    user,
    maxTokens,
  );
  if (!raw) {
    return NextResponse.json({ ok: false, reason: "generation_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, block: input.block, markdown: sanitizeAiText(raw) });
}

type Piste = {
  format: string;
  title: string;
  punchline: string;
  why: string;
  needsHerTime: string;
};

/**
 * Lit les trois pistes. `null` si on ne peut pas les lire : l'appelant
 * dit alors franchement que ca n'a pas abouti, il n'affiche jamais le
 * texte brut (regle du 3 aout : montrer un livrable illisible et laisser
 * la creatrice le demeler coute plus cher que d'admettre l'echec).
 */
function parsePistes(
  raw: string,
): { pistes: Piste[]; recommended: number; recommendedWhy: string } | null {
  let jsonStr = raw.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) jsonStr = fence[1].trim();
  if (!jsonStr.startsWith("{")) {
    const s = jsonStr.indexOf("{");
    const e = jsonStr.lastIndexOf("}");
    if (s >= 0 && e > s) jsonStr = jsonStr.slice(s, e + 1);
  }
  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    const arr = Array.isArray(obj.pistes) ? obj.pistes : [];
    const str = (v: unknown) => (typeof v === "string" ? sanitizeAiText(v.trim()) : "");
    const pistes: Piste[] = arr
      .map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return {
          format: str(o.format),
          title: str(o.title),
          punchline: str(o.punchline),
          why: str(o.why),
          needsHerTime: str(o.needsHerTime),
        };
      })
      .filter((p) => p.title && p.format)
      // Trois, jamais plus : un modele qui deborde ne doit pas pouvoir
      // re-assommer la creatrice (cf. lib/prompts/priority.ts).
      .slice(0, 3);
    if (pistes.length === 0) return null;
    const rec = Number(obj.recommended);
    return {
      pistes,
      recommended: Number.isInteger(rec) && rec >= 0 && rec < pistes.length ? rec : 0,
      recommendedWhy: str(obj.recommendedWhy),
    };
  } catch {
    return null;
  }
}
