// lib/generate/funnel.ts
// Chantier B : genere le funnel "done-for-you" (sequences email + kit de
// lancement) a partir du carnet + persona de l'eleve, via l'IA. Server-only.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCarnet } from "@/lib/carnet";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { resolvePersona, personaLabel, PERSONA_VOCAB } from "@/lib/personas";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
import {
  sanitizeIntentionMap,
  intentionGuidance,
  type IntentionMap,
} from "@/lib/funnelIntentions";
import type { QuizResultProfile } from "@/lib/quizDoctor";
import { labelOf, MATURITY_OPTIONS, MONETIZATION_OPTIONS } from "@/lib/businessProfile";
import type { FunnelAssets, FunnelEmail, FunnelResultEmail } from "@/lib/types";
import { RESULT_SEQUENCE, sequenceGuidance } from "@/lib/funnelSequence";

// LA VOIX, ÉCRITE UNE FOIS. Elle est partagée par les deux appels (le
// tronc commun et la séquence d'un profil) : dupliquée, elle divergerait
// au premier ajustement et les deux moitiés de la campagne ne se
// ressembleraient plus.
const VOICE = `Tu es le meilleur copywriter de funnels pour quiz lead-magnet, au service de L'Atelier du Quiz (Béné). Tu écris la séquence email et le kit de lancement qui transforment un quiz en machine à leads qualifiés qui ACHÈTENT.

Tu t'appuies sur des principes solides, appliqués (jamais théoriques) :
- Blair Warren : encourager le rêve, justifier l'échec passé, apaiser la peur, confirmer un soupçon, désigner l'ennemi commun (jamais le lecteur).
- La méthode Ask : récolter et renvoyer les mots exacts de la cible, parler à chaque profil (bucket) séparément.
- Cialdini : micro-engagement, cohérence, preuve sociale, rareté honnête.

Règles d'écriture STRICTES :
- Tutoiement, ton chaleureux et direct, comme Béné.
- Français impeccable, accents partout. JAMAIS de tiret long (ni cadratin ni demi-cadratin) : virgule, deux-points, parenthèses ou nouvelle phrase.
- Jamais de promesse chiffrée de résultat. On promet un système, pas un million.
- Emails courts, concrets, une seule idée et un seul appel à l'action par email.
- Tu utilises le contexte réel de l'élève (sa niche, ses profils de résultats, ses mots). Tu ne mets PAS de [crochets] à remplir sauf si une info manque vraiment.

Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.`;

/**
 * Appel 1 : le tronc commun (bienvenue, vente, kit de lancement).
 *
 * `needProfiles` : quand le quiz de l'élève n'est pas connecté, on n'a
 * aucun profil réel. On demande alors au même appel de DÉDUIRE les
 * profils, et la séquence de chacun est écrite ensuite, exactement comme
 * pour un quiz connecté. Un seul chemin de code pour les deux cas.
 */
function coreSystem(needProfiles: boolean): string {
  return `${VOICE}

Format exact :
{
  "welcome": [{"subject": "...", "body": "..."}],
  "sales": [{"subject": "...", "body": "..."}],
  "launch": {"posts": ["...", "..."], "dm": "...", "partnerEmail": "..."}${
    needProfiles ? ',\n  "profiles": [{"title": "nom du profil", "description": "une phrase"}]' : ""
  }
}
Quantités : welcome = 3 emails, sales = 3 emails, launch.posts = 4 posts, launch.dm = 1 script, launch.partnerEmail = 1 email.${
    needProfiles
      ? `\nprofiles : déduis 3 ou 4 profils de résultat plausibles à partir de son carnet et de sa niche.`
      : ""
  }`;
}

/**
 * Appel 2 (un par profil) : LA SÉQUENCE COMPLÈTE d'UN seul profil.
 *
 * POURQUOI UN APPEL PAR PROFIL, et pas tout dans la réponse d'avant
 * (retour Béné, 3 août 2026 : "la campagne email sort en json .. l'enfer
 * !!"). Ce JSON à l'écran était une réponse TRONQUÉE. Depuis qu'un profil
 * reçoit ${RESULT_SEQUENCE.length} emails, un quiz à 4 profils en demande
 * ${4 * RESULT_SEQUENCE.length} d'un coup : monter la limite de tokens
 * repousse la troncature, elle ne l'enlève pas, et une réponse unique de
 * cette taille tient la requête ouverte plusieurs minutes.
 *
 * Découpé, chaque appel est court, ils partent en parallèle, et surtout
 * un profil qui échoue ne fait plus tomber toute la campagne.
 */
function sequenceSystem(): string {
  return `${VOICE}

Tu écris la séquence email d'UN SEUL profil de résultat, celui qui t'est donné.

Format exact :
{"emails": [{"step": 1, "subject": "...", "body": "..."}]}

EXACTEMENT ${RESULT_SEQUENCE.length} emails, dans cet ordre, "step" allant de 1 à ${RESULT_SEQUENCE.length} :
${sequenceGuidance()}

Chaque email est COURT (120 à 180 mots), a son propre objet, une seule idée et un seul appel à l'action. Les emails se répondent : le 3 reprend le conseil du 2, le 4 s'appuie sur l'objection levée au 3. Tu écris pour CE profil précis, avec ses mots à lui : une séquence qui pourrait servir à n'importe quel autre profil est ratée.

Respecte l'intention indiquée. Si un CTA est fourni (texte + URL), c'est le SEUL appel à l'action de l'email de vente, reprends son texte et son URL tels quels : tu n'inventes jamais d'URL et tu n'en ajoutes pas d'autre.`;
}

interface ProfileRow {
  full_name: string | null;
  niche: string | null;
  activity_type: string | null;
  maturity: string | null;
  monetization: string | null;
}

/**
 * Le contexte de l'élève, identique pour les deux appels.
 *
 * Les deux moitiés de la campagne doivent parler de la même personne,
 * avec le même vocabulaire métier : ce bloc est donc construit une fois
 * et passé aux deux.
 */
function buildContextBlock(profile: ProfileRow, carnetText: string): string {
  const persona = resolvePersona(profile.activity_type);
  const vocab = PERSONA_VOCAB[persona];
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  return [
    `Contexte de l'élève :`,
    firstName ? `- Prénom : ${firstName}` : null,
    profile.niche ? `- Niche : ${profile.niche}` : null,
    `- Métier (persona) : ${personaLabel(persona)}`,
    profile.maturity ? `- Maturité : ${labelOf(MATURITY_OPTIONS, profile.maturity)}` : null,
    profile.monetization
      ? `- Monétisation : ${labelOf(MONETIZATION_OPTIONS, profile.monetization)}`
      : null,
    `- Vocabulaire à employer : offre = "${vocab.offre}", client = "${vocab.client}", audience = "${vocab.audience}", expertise = "${vocab.expertise}".`,
    ``,
    `Son carnet de bord (ses réponses au parcours, pour ses mots, son objectif, son contexte) :`,
    carnetText || "(carnet encore vide)",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Message utilisateur de l'appel 1 : le tronc commun. */
function buildCorePrompt(context: string, quizProfiles: QuizResultProfile[]): string {
  const known =
    quizProfiles.length > 0
      ? `Les profils de résultat de son quiz (pour que les emails communs y fassent écho) : ${quizProfiles
          .map((p) => p.title)
          .join(", ")}.`
      : `Ses profils de résultat ne sont pas connus : déduis-les et renvoie-les dans "profiles".`;

  return [
    context,
    ``,
    known,
    ``,
    `Écris-lui sa séquence de bienvenue, sa séquence de vente douce et son kit de lancement, au format JSON demandé.`,
  ].join("\n");
}

/** Message utilisateur d'un appel 2 : la séquence d'UN profil. */
function buildSequencePrompt(
  context: string,
  target: SequenceTarget,
  intentions: IntentionMap,
): string {
  const desc = target.description
    ? `\nCe que dit ce profil : ${target.description.replace(/\s+/g, " ").trim().slice(0, 400)}`
    : "";
  const chosen = intentions[target.title.trim()];
  const intention =
    chosen && chosen !== "auto"
      ? `Intention imposée par l'élève : ${intentionGuidance(chosen)}`
      : target.ctaUrl
        ? `Intention : orienter naturellement vers le CTA ci-dessous.`
        : `Intention : apporter de la valeur et inviter à répondre (pas de CTA défini).`;
  const cta =
    target.ctaText || target.ctaUrl
      ? `\nCTA à intégrer, tel quel, comme unique appel à l'action de l'email de vente : "${(target.ctaText || "Découvrir").trim()}"${target.ctaUrl ? ` -> ${target.ctaUrl.trim()}` : ""}`
      : "";
  const others =
    target.siblings.length > 0
      ? `\nLes autres profils de son quiz, pour que tu écrives VRAIMENT pour celui-ci et pas pour tout le monde : ${target.siblings.join(", ")}.`
      : "";

  return [
    context,
    ``,
    `Profil pour lequel tu écris : ${target.title}${desc}`,
    intention + cta + others,
    ``,
    `Écris ses ${RESULT_SEQUENCE.length} emails, au format JSON demandé.`,
  ].join("\n");
}

function carnetToText(
  carnet: Awaited<ReturnType<typeof getCarnet>>,
): string {
  return carnet
    .map((d) => {
      const lines = d.entries.map((e) => `  Q: ${e.prompt}\n  R: ${e.answer}`).join("\n");
      return `Jour ${d.dayNumber} - ${d.title}\n${lines}`;
    })
    .join("\n\n");
}

function extractJson(text: string): unknown | null {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    return JSON.parse(t);
  } catch {
    // Reponse coupee : on repare les delimiteurs restes ouverts pour
    // sauver les emails DEJA complets. Mieux vaut trois emails sur six
    // qu'un ecran de JSON brut.
    return tryRepairTruncatedJson(t);
  }
}

/**
 * Repare un JSON tronque en refermant ce qui reste ouvert.
 *
 * On remonte jusqu'a la derniere position "sure" (la fin du dernier
 * element complet), puis on referme les tableaux et objets encore
 * ouverts. Ce n'est pas un parseur : c'est un filet, et il ne sert que
 * quand le modele a ete coupe.
 */
function tryRepairTruncatedJson(text: string): unknown | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  let lastSafe = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") stack.pop();
    // Une virgule hors chaine termine un element complet : on peut
    // couper juste avant sans casser ce qui precede.
    else if (c === ",") lastSafe = i;
  }

  if (lastSafe < 0) return null;
  let candidate = text.slice(0, lastSafe);
  // On recalcule la pile sur le tronçon conservé.
  const closers: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < candidate.length; i++) {
    const c = candidate[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") closers.push("}");
    else if (c === "[") closers.push("]");
    else if (c === "}" || c === "]") closers.pop();
  }
  candidate += closers.reverse().join("");
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function clean(s: unknown): string {
  return sanitizeAiText(typeof s === "string" ? s : "").trim();
}

function normalizeEmails(raw: unknown): FunnelEmail[] {
  return Array.isArray(raw)
    ? (raw as Record<string, unknown>[]).map((x) => ({
        subject: clean(x.subject),
        body: clean(x.body),
      }))
    : [];
}

/** Le tronc commun : bienvenue, vente, kit de lancement. */
function normalizeCore(parsed: unknown): {
  welcome: FunnelEmail[];
  sales: FunnelEmail[];
  launch: FunnelAssets["launch"];
  deduced: { title: string; description: string }[];
} {
  const o = (parsed ?? {}) as Record<string, unknown>;
  const launchRaw = (o.launch ?? {}) as Record<string, unknown>;
  return {
    welcome: normalizeEmails(o.welcome),
    sales: normalizeEmails(o.sales),
    launch: {
      posts: Array.isArray(launchRaw.posts) ? launchRaw.posts.map(clean).filter(Boolean) : [],
      dm: clean(launchRaw.dm),
      partnerEmail: clean(launchRaw.partnerEmail),
    },
    deduced: Array.isArray(o.profiles)
      ? (o.profiles as Record<string, unknown>[])
          .map((x) => ({ title: clean(x.title), description: clean(x.description) }))
          .filter((p) => p.title)
      : [],
  };
}

/** La séquence d'UN profil, renumérotée sur sa position réelle. */
function normalizeSequence(parsed: unknown, result: string): FunnelResultEmail[] {
  const o = (parsed ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.emails)) return [];
  return (o.emails as Record<string, unknown>[])
    .map((x, i) => ({
      result,
      // Rang dans la séquence. Le modèle peut l'oublier ou le rendre en
      // texte : on ne fait confiance qu'à un entier dans la plage, et à
      // défaut on retombe sur la position d'arrivée (il les rend dans
      // l'ordre). Jamais null : sans rang, l'écran ne saurait plus quel
      // temps de la séquence il affiche.
      step:
        typeof x.step === "number" && x.step >= 1 && x.step <= RESULT_SEQUENCE.length
          ? Math.trunc(x.step)
          : i + 1,
      subject: clean(x.subject),
      body: clean(x.body),
    }))
    .filter((e) => e.subject || e.body);
}

/** Une cible de séquence : un profil, réel ou déduit. */
interface SequenceTarget {
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Les autres profils du quiz : sert à ne pas écrire deux fois pareil. */
  siblings: string[];
}

/** Un appel Claude qui rend du JSON, ou null. */
async function askClaude(
  apiKey: string,
  system: string,
  userPrompt: string,
  maxTokens: number,
): Promise<unknown | null> {
  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const body = buildClaudeMessageBody({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
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
      console.error("[funnel] appel refusé :", res.status);
      return null;
    }
    const data = await res.json();
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text)
          .join("")
      : "";
    const parsed = extractJson(text);
    if (!parsed) {
      // Le texte brut reste dans les logs SERVEUR, jamais à l'écran :
      // montrer du JSON à une créatrice, c'est lui montrer notre panne et
      // lui demander de la démêler.
      console.error("[funnel] analyse impossible, extrait :", text.slice(0, 400));
    }
    return parsed;
  } catch (e) {
    console.error("[funnel] appel impossible :", e);
    return null;
  }
}

/** Genere la campagne et la persiste. Renvoie les assets, ou null si echec IA. */
export async function generateFunnel(userId: string): Promise<FunnelAssets | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, niche, activity_type, maturity, monetization")
    .eq("id", userId)
    .maybeSingle();

  const [carnet, quizProfiles, intentions] = await Promise.all([
    getCarnet(userId),
    // Profils REELS du quiz de l'eleve (best-effort : [] si non connecte).
    fetchQuizProfiles(userId),
    getFunnelIntentions(userId),
  ]);
  const context = buildContextBlock((profile ?? {}) as ProfileRow, carnetToText(carnet));

  // ── Appel 1 : le tronc commun ─────────────────────────────────────
  const needProfiles = quizProfiles.length === 0;
  const core = normalizeCore(
    await askClaude(
      apiKey,
      coreSystem(needProfiles),
      buildCorePrompt(context, quizProfiles),
      8000,
    ),
  );

  // ── Appel 2, un par profil, EN PARALLÈLE ──────────────────────────
  // Le profil vient du quiz réel quand il est connecté, sinon de ce que
  // l'appel 1 a déduit. Un seul chemin ensuite.
  const targets: SequenceTarget[] = needProfiles
    ? core.deduced.map((p, _i, all) => ({
        title: p.title,
        description: p.description,
        siblings: all.filter((o) => o.title !== p.title).map((o) => o.title),
      }))
    : quizProfiles.map((p) => ({
        title: p.title,
        description: p.description ?? "",
        ctaText: p.ctaText ?? undefined,
        ctaUrl: p.ctaUrl ?? undefined,
        siblings: quizProfiles.filter((o) => o.title !== p.title).map((o) => o.title),
      }));

  const sequences = await Promise.all(
    targets.map(async (t) =>
      normalizeSequence(
        await askClaude(
          apiKey,
          sequenceSystem(),
          buildSequencePrompt(context, t, intentions),
          8000,
        ),
        t.title,
      ),
    ),
  );
  // Un profil qui echoue ne fait pas tomber la campagne : les autres
  // s'affichent, et le bouton Regenerer est a un clic.
  const byResult: FunnelResultEmail[] = sequences.flat();

  const assets: FunnelAssets = {
    welcome: core.welcome,
    byResult,
    sales: core.sales,
    launch: core.launch,
  };
  if (assets.welcome.length === 0 && byResult.length === 0 && assets.sales.length === 0) {
    return null;
  }

  await supabaseAdmin.from("funnel_assets").upsert(
    { user_id: userId, assets, generated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  return assets;
}

/** Lit la map d'intentions par profil de l'eleve (server-internal, admin). */
export async function getFunnelIntentions(userId: string): Promise<IntentionMap> {
  const { data } = await supabaseAdmin
    .from("funnel_intentions")
    .select("intentions")
    .eq("user_id", userId)
    .maybeSingle();
  return sanitizeIntentionMap(data?.intentions);
}

export async function getFunnelAssets(userId: string): Promise<{
  assets: FunnelAssets | null;
  generatedAt: string | null;
}> {
  const { data } = await supabaseAdmin
    .from("funnel_assets")
    .select("assets, generated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.assets || Object.keys(data.assets).length === 0) {
    return { assets: null, generatedAt: null };
  }
  return { assets: data.assets as FunnelAssets, generatedAt: data.generated_at as string };
}
