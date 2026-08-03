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
import type { FunnelAssets, FunnelResultEmail } from "@/lib/types";
import { RESULT_SEQUENCE, sequenceGuidance } from "@/lib/funnelSequence";

// LA CAMPAGNE, C'EST DEUX CHOSES. PAS SEPT.
//
// Bene, 3 aout 2026 : "je veux JUSTE 5 mails par resultat / profil,
// comme sur le screenshot, en reutilisant le ton de l'user, le theme du
// quiz, les mots de son persona. Pas ce truc j'en ai partout je ne sais
// meme pas quoi en faire."
//
// Elle avait raison. La page empilait une sequence de bienvenue, une
// sequence de vente douce, un dossier par profil et un kit de lancement,
// sans jamais dire quand envoyer quoi. Beaucoup de contenu, aucune
// decision possible.
//
// Il reste DEUX generations, et elles repondent chacune a une question
// que l'eleve se pose vraiment :
//
//   la sequence post-quiz  -> "il a eu son resultat, je lui ecris quoi ?"
//   le kit de lancement    -> "comment je fais connaitre mon quiz ?"
//
// La sequence de bienvenue et la sequence de vente ont ete SUPPRIMEES,
// pas mises de cote. Les remettre "au cas ou" refabriquerait l'ecran
// qu'elle a trouve illisible.

// LA VOIX, ÉCRITE UNE FOIS, partagée par les deux générations :
// dupliquée, elle divergerait au premier ajustement et les deux moitiés
// ne se ressembleraient plus.
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

/** Génération 2 : le kit pour faire connaître le quiz. */
function launchSystem(): string {
  return `${VOICE}

Tu écris le KIT DE LANCEMENT qui sert à faire connaître SON QUIZ. Rien d'autre : ni email de bienvenue, ni email de vente.

Format exact :
{"posts": ["...", "..."], "dm": "...", "partnerEmail": "..."}

- posts : 4 publications prêtes à coller, pour annoncer le quiz. Angles DIFFÉRENTS (une accroche par curiosité, une par le problème, une par le résultat qu'on obtient, une plus personnelle). Chacune finit par une invitation à faire le quiz.
- dm : 1 message privé court à envoyer à quelqu'un de sa liste ou de ses contacts, sans agressivité commerciale.
- partnerEmail : 1 email à un partenaire ou une consoeur, pour lui proposer de relayer le quiz auprès de son audience.

Tout parle du QUIZ (son thème, sa promesse, ce qu'on y découvre), avec les mots de l'élève et de sa cible.`;
}

/**
 * Les profils, quand le quiz n'est pas connecté à l'Atelier.
 *
 * Quand il l'est, cette question ne se pose pas : les profils réels sont
 * lus dans le quiz, sans le moindre appel au modèle.
 */
function deduceProfilesSystem(): string {
  return `${VOICE}

Format exact :
{"profiles": [{"title": "nom du profil", "description": "une phrase"}]}

Déduis 3 ou 4 profils de résultat plausibles pour le quiz de cet élève, à partir de son carnet et de sa niche. Rien d'autre.`;
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

/** Message utilisateur du kit de lancement. */
function buildLaunchPrompt(context: string, quizProfiles: QuizResultProfile[]): string {
  const quiz =
    quizProfiles.length > 0
      ? `Les profils de résultat de son quiz, pour que tu saches de quoi il parle : ${quizProfiles
          .map((p) => p.title)
          .join(", ")}.`
      : `Son quiz n'est pas encore connecté : appuie-toi sur sa niche et son carnet pour parler de son sujet.`;

  return [
    context,
    ``,
    quiz,
    ``,
    `Écris-lui son kit de lancement, au format JSON demandé.`,
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

/** Le kit de lancement. */
function normalizeLaunch(raw: unknown): FunnelAssets["launch"] {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    posts: Array.isArray(o.posts) ? o.posts.map(clean).filter(Boolean) : [],
    dm: clean(o.dm),
    partnerEmail: clean(o.partnerEmail),
  };
}

function launchIsEmpty(l: FunnelAssets["launch"]): boolean {
  return l.posts.length === 0 && !l.dm && !l.partnerEmail;
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
      // ABANDONNER AVANT CLOUDFLARE, PAS APRÈS. Sa limite est à ~100 s
      // et elle rend une page d'erreur 524 que nous ne contrôlons pas :
      // l'élève voit une panne d'infrastructure au lieu de notre message.
      // À 80 s, c'est NOUS qui répondons, avec une raison exploitable et
      // un bouton pour relancer l'étape.
      signal: AbortSignal.timeout(80_000),
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

// ── LA GÉNÉRATION EST DÉCOUPÉE EN ÉTAPES ────────────────────────────
//
// POURQUOI (erreur 524, 3 août 2026). Cloudflare coupe toute requête qui
// dépasse ~100 secondes, et rien ne peut l'en empêcher côté serveur : ni
// un timeout plus long, ni une réponse plus légère. Écrire une campagne
// entière demande plusieurs minutes de modèle. Tant que ce travail vivait
// dans UNE requête, il n'y avait aucune valeur de limite qui marche.
//
// La découpe rend la contrainte satisfaisable : chaque appel HTTP porte
// UNE demande au modèle, donc reste largement sous la minute. Le
// navigateur enchaîne, et affiche l'avancement au lieu d'un sablier.
//
// Effet de bord précieux : un profil qui échoue se relance seul, sans
// réécrire les quinze autres emails déjà payés.

/** Contexte + profils : la base commune à toutes les étapes. */
async function loadGenerationContext(userId: string) {
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
  return {
    context: buildContextBlock((profile ?? {}) as ProfileRow, carnetToText(carnet)),
    quizProfiles,
    intentions,
  };
}

/**
 * LES PROFILS À TRAITER : la liste, et rien d'autre.
 *
 * Quand le quiz est connecté, elle est LUE dans le quiz : aucun appel au
 * modèle, donc la réponse est immédiate et les noms sont exactement ceux
 * que ses visiteurs voient. C'est seulement quand le quiz n'est pas
 * connecté qu'on demande au modèle de les déduire.
 */
export async function listFunnelProfiles(userId: string): Promise<string[] | null> {
  const { context, quizProfiles } = await loadGenerationContext(userId);
  if (quizProfiles.length > 0) {
    return quizProfiles.map((p) => p.title).filter(Boolean);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const parsed = (await askClaude(
    apiKey,
    deduceProfilesSystem(),
    `${context}\n\nDéduis ses profils de résultat, au format JSON demandé.`,
    2000,
  )) as { profiles?: Record<string, unknown>[] } | null;

  const titles = Array.isArray(parsed?.profiles)
    ? parsed.profiles.map((x) => clean(x.title)).filter(Boolean)
    : [];
  return titles.length > 0 ? titles : null;
}

/**
 * LE KIT DE LANCEMENT : posts, DM, email partenaire.
 *
 * Génération indépendante de la séquence : l'élève lance l'une sans
 * l'autre, et régénère l'une sans perdre l'autre.
 */
export async function generateFunnelLaunch(userId: string): Promise<FunnelAssets["launch"] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { context, quizProfiles } = await loadGenerationContext(userId);
  const launch = normalizeLaunch(
    await askClaude(apiKey, launchSystem(), buildLaunchPrompt(context, quizProfiles), 4000),
  );
  return launchIsEmpty(launch) ? null : launch;
}

/**
 * LA SÉQUENCE POST-QUIZ D'UN PROFIL : ses 5 emails.
 *
 * Le CTA et l'intention sont relus ici, côté serveur, à partir du titre
 * reçu : le navigateur ne transporte que le nom du profil, jamais l'URL
 * vers laquelle l'email enverra le lecteur.
 */
export async function generateFunnelSequence(
  userId: string,
  profileTitle: string,
): Promise<FunnelResultEmail[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { context, quizProfiles, intentions } = await loadGenerationContext(userId);
  const known = quizProfiles.find((p) => p.title.trim() === profileTitle.trim());
  const target: SequenceTarget = {
    title: profileTitle,
    description: known?.description ?? "",
    ctaText: known?.ctaText ?? undefined,
    ctaUrl: known?.ctaUrl ?? undefined,
    siblings: quizProfiles.filter((p) => p.title.trim() !== profileTitle.trim()).map((p) => p.title),
  };

  const emails = normalizeSequence(
    await askClaude(apiKey, sequenceSystem(), buildSequencePrompt(context, target, intentions), 8000),
    profileTitle,
  );
  return emails.length > 0 ? emails : null;
}

/**
 * Persiste ce que le navigateur vient de générer, en FUSIONNANT.
 *
 * Les deux générations sont indépendantes : régénérer le kit de
 * lancement ne doit pas effacer les séquences écrites la veille, et
 * inversement. On n'écrase donc que la partie fournie ; l'autre est
 * relue en base et recopiée telle quelle.
 *
 * Le contenu est RENORMALISÉ ici : c'est le navigateur qui l'envoie,
 * donc on ne lui fait pas confiance sur la forme.
 */
export async function saveFunnelAssets(
  userId: string,
  part: { byResult?: unknown; launch?: unknown },
): Promise<FunnelAssets | null> {
  const { assets: current } = await getFunnelAssets(userId);

  const byResult: FunnelResultEmail[] = Array.isArray(part.byResult)
    ? (part.byResult as Record<string, unknown>[])
        .map((x) => ({
          result: clean(x.result),
          step:
            typeof x.step === "number" && x.step >= 1 && x.step <= RESULT_SEQUENCE.length
              ? Math.trunc(x.step)
              : null,
          subject: clean(x.subject),
          body: clean(x.body),
        }))
        .filter((e) => e.subject || e.body)
    : (current?.byResult ?? []);

  const launch =
    part.launch !== undefined ? normalizeLaunch(part.launch) : (current?.launch ?? normalizeLaunch(null));

  const assets: FunnelAssets = { byResult, launch };
  if (assets.byResult.length === 0 && launchIsEmpty(assets.launch)) {
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
  // REMISE EN FORME À LA LECTURE. Les campagnes générées avant le
  // 3 août portent encore `welcome` et `sales`, et pouvaient n'avoir
  // aucun `launch`. On rend toujours la forme actuelle : l'écran n'a
  // donc jamais à se demander de quelle époque vient la ligne, et les
  // deux champs disparus sont simplement ignorés.
  const stored = data.assets as Record<string, unknown>;
  return {
    assets: {
      byResult: Array.isArray(stored.byResult) ? (stored.byResult as FunnelResultEmail[]) : [],
      launch: normalizeLaunch(stored.launch),
    },
    generatedAt: data.generated_at as string,
  };
}
