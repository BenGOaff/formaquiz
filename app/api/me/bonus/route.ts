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
import {
  classifyThrown,
  classifyUpstream,
  isRetryable,
  statusFor,
  type AiFailure,
} from "@/lib/aiFailure";
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

  // UN BUDGET POUR TOUTE LA REQUETE, PAS PAR APPEL.
  //
  // Cloudflare coupe a ~100 s et rend une page 524 qu'on ne controle pas.
  // Le budget est partage avec la reprise automatique ci-dessous : deux
  // minuteurs de 85 s bout a bout, ca fait 170 s, donc une page 524.
  const deadline = Date.now() + 85_000;
  const budgetLeft = () => deadline - Date.now();

  type ClaudeOutcome =
    | { ok: true; text: string; truncated: boolean }
    | { ok: false; failure: AiFailure };

  async function callOnce(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<ClaudeOutcome> {
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
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
        signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())),
      });
    } catch (err) {
      // SANS CE catch, une coupure de notre propre minuteur remontait en
      // exception non geree : la creatrice recevait un 500 opaque la ou
      // la seule chose a faire etait de relancer.
      const failure = classifyThrown(err);
      console.error("[bonus] appel interrompu :", failure, err);
      return { ok: false, failure };
    }

    if (!res.ok) {
      console.error("[bonus] Anthropic", res.status, await res.text().catch(() => ""));
      return { ok: false, failure: classifyUpstream(res.status) };
    }

    const data = (await res.json().catch(() => null)) as {
      content?: Array<{ text?: string }>;
      stop_reason?: string;
    } | null;
    const raw = (data?.content ?? []).map((c) => c.text ?? "").join("").trim();
    if (!raw) {
      console.error("[bonus] reponse vide", data?.stop_reason ?? "");
      return { ok: false, failure: "empty" };
    }
    // Un texte coupe a la limite de tokens reste utilisable : on le rend,
    // mais on le DIT. Le laisser passer en silence, c'est une creatrice
    // qui publie un bonus dont la derniere section s'arrete au milieu
    // d'une phrase sans jamais comprendre pourquoi.
    return { ok: true, text: raw, truncated: data?.stop_reason === "max_tokens" };
  }

  /**
   * Le meme appel, avec UNE reprise quand c'est sature en face.
   *
   * Une saturation Anthropic dure quelques secondes : faire relancer la
   * creatrice a la main pour ca, c'est lui faire porter une panne qui
   * n'est pas la sienne. Une seule reprise, et seulement s'il reste du
   * budget : au dela on rend la main plutot que de finir en 524.
   */
  async function callClaude(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<ClaudeOutcome> {
    const first = await callOnce(system, user, maxTokens);
    if (first.ok || !isRetryable(first.failure) || budgetLeft() < 25_000) return first;
    console.warn("[bonus] sature, une reprise");
    await new Promise((r) => setTimeout(r, 1_500));
    return callOnce(system, user, maxTokens);
  }

  function failed(failure: AiFailure) {
    return NextResponse.json({ ok: false, reason: failure }, { status: statusFor(failure) });
  }

  // ── ÉTAPE 1 : les trois pistes ──
  if (input.step === "pistes") {
    const out = await callClaude(
      buildPistesSystemPrompt(brief),
      renderBriefForPrompt(brief) + "\n\nPropose-moi les trois pistes maintenant.",
      2000,
    );
    if (!out.ok) return failed(out.failure);
    const pistes = parsePistes(out.text);
    if (!pistes) {
      // ON N'AFFICHE JAMAIS DE JSON A UNE CREATRICE (regle du 3 aout).
      // Le texte brut part dans les logs, l'ecran dit que ca n'a pas
      // abouti et propose de relancer.
      console.error("[bonus] pistes illisibles :", out.text.slice(0, 1500));
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
  //
  // 4500 et pas 6000 : au dela, la generation depasse regulierement les
  // 85 secondes du budget et se fait couper, ce qui rend ZERO ligne. Un
  // bonus de 4500 tokens fait deja plus de 3000 mots, et le generateur
  // d'articles affilies, qui tourne en prod depuis juillet, plafonne a
  // 4000 sans que personne n'ait trouve ses textes courts.
  const maxTokens = input.block === "content" ? 4500 : 2500;
  const out = await callClaude(
    buildProductionSystemPrompt(brief, input.block, input.profileIndex),
    user,
    maxTokens,
  );
  if (!out.ok) return failed(out.failure);
  return NextResponse.json({
    ok: true,
    block: input.block,
    markdown: sanitizeAiText(out.text),
    truncated: out.truncated,
  });
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
