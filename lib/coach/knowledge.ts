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

export interface CoachDoc {
  title: string;
  content: string;
}

/** Budget de caracteres pour les documents de connaissance injectes. */
const DOCS_CHAR_BUDGET = 14000;

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

// Instruction par defaut (utilisee si l'admin n'en a pas defini une).
// Pas de tiret long : on nomme les caracteres au lieu de les ecrire.
const SYSTEM_PERSONA = `Tu es le coach IA de FormaQuiz, la formation de Béné : lancer un quiz lead-magnet avec Tiquiz en 14 jours. Tu aides l'élève à avancer sur SON projet et à se débloquer.

Style de réponse, très important :
- Va droit au but. Aucune formule d'introduction (pas de "bonne question", pas de "je comprends ton doute"), aucun méta-commentaire. Tu réponds, c'est tout.
- Court : 2 à 4 phrases en général. Si l'élève a besoin d'étapes, donne une vraie liste plutôt qu'un paragraphe.
- Une seule question à la fois, et seulement si elle fait avancer.
- Mise en forme : mets en gras les mots clés avec des doubles astérisques (par exemple **ton angle**), et utilise des listes à puces (chaque point sur une ligne qui commence par "- ") quand tu énumères. N'écris jamais d'astérisques décoratives ni de titres.

Garde-fous, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme et des documents fournis ci-dessous. Si l'info n'y est pas, dis-le franchement et renvoie vers Béné ou la communauté. Tu n'inventes jamais une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré : on promet un système, pas un million.
- Jamais de tiret long (ni cadratin ni demi-cadratin) : utilise la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.`;

/**
 * Construit le prompt systeme complet : persona + garde-fous + index de
 * tous les jours + jour courant en entier + contexte eleve.
 */
export function buildCoachSystemPrompt(input: {
  instruction?: string | null;
  docs?: CoachDoc[];
  days: CoachDay[];
  currentDay: CoachDay | null;
  firstName: string | null;
  niche: string | null;
  level: string | null;
  objective: string | null;
  currentAnswers: CoachAnswer[];
}): string {
  const { instruction, docs, days, currentDay, firstName, niche, level, objective, currentAnswers } = input;

  const persona = instruction && instruction.trim() ? instruction.trim() : SYSTEM_PERSONA;

  const index = days
    .map((d) => {
      const sub = d.subtitle ? ` (${d.subtitle})` : "";
      return `Jour ${d.day_number} : ${d.title}${sub}\n${clip(htmlToText(d.intro_html), 350)}`;
    })
    .join("\n\n");

  let prompt = `${persona}\n\n=== PROGRAMME (vue d'ensemble des jours) ===\n${index}`;

  // Documents de connaissance charges par l'admin (bornes en taille).
  if (docs && docs.length) {
    let budget = DOCS_CHAR_BUDGET;
    const parts: string[] = [];
    for (const doc of docs) {
      if (budget <= 0) break;
      const body = clip(doc.content.trim(), budget);
      budget -= body.length;
      parts.push(`# ${doc.title}\n${body}`);
    }
    if (parts.length) {
      prompt += `\n\n=== DOCUMENTS DE RÉFÉRENCE (fournis par Béné) ===\n${parts.join("\n\n")}`;
    }
  }

  if (currentDay) {
    prompt += `\n\n=== JOUR EN COURS : Jour ${currentDay.day_number}, ${currentDay.title} ===\n${htmlToText(currentDay.intro_html)}`;
  }

  const profileBits: string[] = [];
  if (firstName) profileBits.push(`prénom : ${firstName} (adresse-toi à lui par son prénom de temps en temps, naturellement)`);
  if (niche) profileBits.push(`niche : ${niche}`);
  if (level) profileBits.push(`niveau : ${level}`);
  if (objective) profileBits.push(`objectif principal : ${objective}`);
  if (profileBits.length) {
    prompt += `\n\n=== CONTEXTE DE L'ÉLÈVE ===\n${profileBits.join("\n")}`;
  }

  if (currentAnswers.length) {
    const carnet = currentAnswers
      .map((a) => `Q: ${a.prompt}\nR: ${clip(a.value, 300)}`)
      .join("\n");
    prompt += `\n\n=== RÉPONSES DE L'ÉLÈVE (jour en cours) ===\n${carnet}`;
  }

  return prompt;
}
