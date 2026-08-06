// app/api/me/bonus/route.ts
//
// Le générateur de bonus post-quiz. Prompt de Béné, corrigé ensemble le
// 5 août 2026 (cf. lib/prompts/bonus.ts pour le détail des décisions).
//
// -- OUVERT AUX ÉLÈVES (5 août 2026) ----------------------------------
//
// La route a vécu deux jours réservée aux admins, le temps que Béné
// vérifie la sortie sur de vrais cas. Un générateur qui consomme des
// tokens et rend un livrable que personne n'a lu n'a rien à faire devant
// des élèves : la campagne email du 3 août est sortie en JSON brut à
// l'écran, et personne ne l'avait vue avant eux.
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
import { MAX_ATTEMPTS, retryDelayMs } from "@/lib/generate/retry";
import { fetchQuizAudit } from "@/lib/integrations/tiquiz";
import { BONUS_PLANS, analyzeOfferCoverage } from "@/lib/bonus/offers";
import {
  BONUS_RULES_PREFIX,
  OFFER_KINDS,
  PRODUCTION_BLOCKS,
  buildOnePisteSystemPrompt,
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
const offerSchema = z.object({
  promise: z.string().min(10).max(600),
  kind: z.enum(OFFER_KINDS),
  price: z.string().max(120).default(""),
  // Les profils que CETTE offre sert. Ignore hors du plan a offres
  // multiples, ou une seule offre s'adresse a tout le monde.
  profileIndexes: z.array(z.number().int().min(0).max(11)).max(12).default([]),
});

const briefSchema = z.object({
  // PLUSIEURS OFFRES (Monique, 5 aout 2026) : un quiz peut servir a
  // orienter vers l'offre adaptee, donc il y en a une par profil. Douze
  // au maximum, comme les profils.
  offers: z.array(offerSchema).min(1).max(12),
  trigger: z.enum(["completion", "share"]),
  plan: z.enum(BONUS_PLANS),
});

const schema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("pistes"), brief: briefSchema }),
  // UNE PISTE DE PLUS, sur clic seulement (Bene, 6 aout 2026). Elle
  // envoie ce qu'elle a deja sous les yeux pour qu'on ne lui repropose
  // pas la meme chose : une generation payee pour un doublon serait la
  // pire depense possible.
  z.object({
    step: z.literal("more"),
    brief: briefSchema,
    known: z
      .array(z.object({ format: z.string().max(200), title: z.string().max(300) }))
      .max(12),
  }),
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

  // CHAQUE PROFIL DOIT AVOIR SON OFFRE, et c'est le serveur qui tranche.
  // L'ecran previent deja, mais un bonus ecrit pour un profil qui ne mene
  // nulle part fait travailler la creatrice pour rien : mieux vaut un
  // refus qui dit quoi corriger.
  const coverage = analyzeOfferCoverage(brief.plan, brief.offers, brief.profiles.length);
  if (!coverage.ok) {
    return NextResponse.json({ ok: false, reason: "offer_coverage" }, { status: 409 });
  }

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
    // `retryAfter` : l'en-tete du fournisseur, lui seul sait quand sa
    // fenetre se rouvre.
    | { ok: false; failure: AiFailure; retryAfter?: string | null };

  /**
   * LE PROMPT SYSTEME EN DEUX BLOCS, POUR LE CACHE ANTHROPIC.
   *
   * Bene, 6 aout 2026 : "il faut bien penser a mettre en cache ou
   * optimiser tous les trucs qui sont reutilises pour toujours limiter
   * la conso, conformement aux reco d'Anthropic."
   *
   * 1. le SOCLE, identique a l'octet pres pour tout le monde et sur les
   *    quatre appels d'un bonus (les pistes puis les trois documents),
   *    marque `cache_control` : facture ~10% du prix normal des la
   *    deuxieme lecture ;
   * 2. la partie VARIABLE (le brief de la creatrice), jamais cachee.
   *
   * L'ordre n'est pas un detail : le cache d'Anthropic est un PREFIXE
   * EXACT. Le stable doit venir AVANT le variable, sinon rien ne
   * s'accroche. Meme mecanique que le coach (app/api/coach/route.ts).
   */
  function systemBlocks(variable: string): Array<Record<string, unknown>> {
    const blocks: Array<Record<string, unknown>> = [
      { type: "text", text: BONUS_RULES_PREFIX, cache_control: { type: "ephemeral" } },
    ];
    if (variable.trim()) blocks.push({ type: "text", text: variable });
    return blocks;
  }

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
            system: systemBlocks(system),
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
      return {
        ok: false,
        failure: classifyUpstream(res.status),
        retryAfter: res.headers.get("retry-after"),
      };
    }

    const data = (await res.json().catch(() => null)) as {
      content?: Array<{ text?: string }>;
      stop_reason?: string;
      usage?: {
        input_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
    } | null;

    // LE CACHE SE VÉRIFIE, IL NE SE SUPPOSE PAS.
    //
    // Anthropic ne renvoie AUCUNE erreur quand un préfixe est trop court
    // pour être caché ou quand quelque chose l'a invalidé : il facture
    // plein tarif, en silence. La seule preuve est ici.
    //
    // Ce qu'on doit voir : `write` non nul au premier appel d'un bonus,
    // puis `read` non nul sur les suivants. Si `read` reste à 0 sur des
    // appels rapprochés, c'est que le préfixe a bougé (une valeur du
    // brief s'est glissée dans le socle) ou qu'il est passé sous le
    // minimum du modèle. Dans les deux cas on paie l'écriture, 1,25 fois
    // le prix, sans jamais la relire : pire que pas de cache du tout.
    const u = data?.usage;
    if (u) {
      console.log(
        `[bonus] tokens entree=${u.input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0}`,
      );
    }
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
   * Le meme appel, avec des reprises quand c'est sature en face.
   *
   * C'EST LE CAS QU'ON A VRAIMENT VU (5 aout 2026, journal du serveur) :
   *
   *   [bonus] Anthropic 529 {"type":"overloaded_error"}
   *
   * Rien de casse chez nous, Anthropic etait sature a cette seconde la.
   * Faire relancer la creatrice a la main pour ca, c'est lui faire porter
   * une panne qui n'est pas la sienne, et lui laisser croire que son
   * texte etait en cause.
   *
   * Une surcharge se refuse en une fraction de seconde : les reprises
   * coutent du temps d'attente, pas du temps de generation. On peut donc
   * s'en offrir plusieurs. Combien, et apres quelle attente, c'est
   * `lib/generate/retry.ts` qui le dit (ecrit le 4 aout pour les emails
   * de Fabienne) : une deuxieme regle ici finirait par contredire la
   * premiere.
   *
   * On s'arrete des qu'il ne reste plus de quoi FINIR une generation :
   * relancer a 20 secondes de la fin du budget, c'est une page 524 de
   * Cloudflare avec zero ligne, ce qui est pire que d'admettre la
   * saturation tout de suite.
   */
  async function callClaude(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<ClaudeOutcome> {
    let out = await callOnce(system, user, maxTokens);
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
      if (out.ok || !isRetryable(out.failure)) return out;
      const wait = retryDelayMs(attempt, out.retryAfter);
      // 45 s : ce qu'il faut au bloc le plus long pour aboutir.
      if (budgetLeft() < wait + 45_000) return out;
      console.warn("[bonus] sature, reprise dans", wait, "ms");
      await new Promise((r) => setTimeout(r, wait));
      out = await callOnce(system, user, maxTokens);
    }
    return out;
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

  // ── ÉTAPE 1 bis : UNE piste de plus ──
  //
  // 800 tokens et pas 2000 : on rend une piste, pas trois. Le budget de
  // sortie est la moitie du levier demande ("limiter la conso"), l'autre
  // moitie etant le declenchement au clic.
  if (input.step === "more") {
    const out = await callClaude(
      buildOnePisteSystemPrompt(brief, input.known),
      renderBriefForPrompt(brief) + "\n\nPropose-moi UNE piste de plus, differente des precedentes.",
      800,
    );
    if (!out.ok) return failed(out.failure);
    const piste = parseOnePiste(out.text);
    if (!piste) {
      console.error("[bonus] piste supplementaire illisible :", out.text.slice(0, 800));
      return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, piste });
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
    // Le format de la piste decide de la FORME du bonus (un document, une
    // page codee par l'IA, un acces), donc de la facon dont le guide dit
    // de le fabriquer et de le livrer. Sans lui, le guide retombait sur
    // "monte un tableau dans Google Sheets" (retour Bene, 5 aout 2026).
    buildProductionSystemPrompt(brief, input.block, input.profileIndex, input.chosen.format),
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
/**
 * Une piste seule. Meme tolerance que `parsePistes` (bloc de code,
 * texte autour) : le modele rend parfois du markdown malgre la consigne,
 * et une piste jetee pour un backtick, c'est une generation payee pour
 * rien.
 */
function parseOnePiste(raw: string): Piste | null {
  let jsonStr = raw.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) jsonStr = fence[1].trim();
  if (!jsonStr.startsWith("{")) {
    const s = jsonStr.indexOf("{");
    const e = jsonStr.lastIndexOf("}");
    if (s >= 0 && e > s) jsonStr = jsonStr.slice(s, e + 1);
  }
  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? sanitizeAiText(v.trim()) : "");
    const piste: Piste = {
      format: str(o.format),
      title: str(o.title),
      punchline: str(o.punchline),
      why: str(o.why),
      needsHerTime: str(o.needsHerTime),
    };
    // Sans titre ni format, ce n'est pas une piste : mieux vaut le dire
    // que d'ajouter une carte vide a l'ecran.
    return piste.title && piste.format ? piste : null;
  } catch {
    return null;
  }
}

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
