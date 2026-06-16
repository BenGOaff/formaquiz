// lib/coach/knowledge.ts
// Construit la base de connaissance et le prompt systeme du coach IA, a
// partir du contenu LIVE des jours (table days) + le contexte de l'eleve.
// Pas de RAG : on borne le contexte (index de tous les jours + le jour
// courant en entier) pour maitriser le cout et l'hallucination.
import "server-only";

export interface CoachDay {
  day_number: number;
  title: string;
  subtitle: string | null;
  intro_html: string | null;
}

export interface CoachAnswer {
  prompt: string;
  value: string;
}

/** Retire les balises HTML et normalise les espaces. */
export function htmlToText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|ul|ol)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\[\[figure:[a-z0-9-]+\]\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "..." : s;
}

const SYSTEM_PERSONA = `Tu es le coach IA de FormaQuiz, la formation de Béné qui apprend à lancer un quiz lead-magnet avec Tiquiz en 14 jours.

Ton rôle : aider l'élève à avancer sur SON projet, le débloquer quand il coince, à toute heure.

Règles strictes, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme fourni ci-dessous. Si l'info n'y est pas, dis-le franchement et invite l'élève à poser la question à Béné ou dans la communauté. Tu n'inventes JAMAIS une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement systématique, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré. On promet un système, pas un million.
- N'utilise JAMAIS de tiret long (— ou –). Utilise la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Réponses courtes, concrètes, actionnables. Tu aides l'élève à FAIRE, tu ne récites pas un cours.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.`;

/**
 * Construit le prompt systeme complet : persona + garde-fous + index de
 * tous les jours + jour courant en entier + contexte eleve.
 */
export function buildCoachSystemPrompt(input: {
  days: CoachDay[];
  currentDay: CoachDay | null;
  niche: string | null;
  level: string | null;
  currentAnswers: CoachAnswer[];
}): string {
  const { days, currentDay, niche, level, currentAnswers } = input;

  const index = days
    .map((d) => {
      const sub = d.subtitle ? ` (${d.subtitle})` : "";
      return `Jour ${d.day_number} : ${d.title}${sub}\n${clip(htmlToText(d.intro_html), 350)}`;
    })
    .join("\n\n");

  let prompt = `${SYSTEM_PERSONA}\n\n=== PROGRAMME (vue d'ensemble des jours) ===\n${index}`;

  if (currentDay) {
    prompt += `\n\n=== JOUR EN COURS : Jour ${currentDay.day_number}, ${currentDay.title} ===\n${htmlToText(currentDay.intro_html)}`;
  }

  const profileBits: string[] = [];
  if (niche) profileBits.push(`niche : ${niche}`);
  if (level) profileBits.push(`niveau : ${level}`);
  if (profileBits.length) {
    prompt += `\n\n=== CONTEXTE DE L'ÉLÈVE ===\n${profileBits.join(", ")}`;
  }

  if (currentAnswers.length) {
    const carnet = currentAnswers
      .map((a) => `Q: ${a.prompt}\nR: ${clip(a.value, 300)}`)
      .join("\n");
    prompt += `\n\n=== RÉPONSES DE L'ÉLÈVE (jour en cours) ===\n${carnet}`;
  }

  return prompt;
}
