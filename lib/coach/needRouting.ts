// lib/coach/needRouting.ts
//
// Où envoyer quelqu'un qui n'a ni l'Atelier ni un plan payant, quand il a
// épuisé ses questions gratuites.
//
// Règle Béné (2 août 2026) : "il répond à 2 questions par jour puis il
// renvoie vers un plan payant de Tiquiz OU vers l'Atelier suivant les
// besoins de l'user. Si question technique : plan payant. Si question
// stratégie : Atelier."
//
// Le critère n'est pas le vocabulaire employé, c'est ce que la personne
// cherche :
//   - TECHNIQUE : elle sait ce qu'elle veut faire, elle bute sur l'outil
//     ou sur une limite de son plan. Un plan payant lève le blocage.
//   - STRATÉGIE : elle ne sait pas encore QUOI faire, ni pourquoi. Aucun
//     plan payant ne répond à ça, c'est de la méthode. L'Atelier.
//
// En cas de doute, on penche vers la STRATÉGIE : proposer un abonnement à
// quelqu'un qui cherche de la méthode, c'est lui vendre la mauvaise
// chose, et il revient déçu. L'inverse coûte juste une hésitation.
//
// Et la règle absolue sur l'argent : le lien porte TOUJOURS l'identifiant
// de l'affilié quand on le connaît. "Je ne veux jamais les léser."

export type CoachNeed = "technique" | "strategie";

/** Ce que la personne cherche, d'après sa question. */
export function classifyCoachNeed(message: string): CoachNeed {
  const m = normalize(message);

  // Signaux TECHNIQUE : un geste dans l'outil, un réglage, une panne, une
  // limite de plan. Ce sont des mots d'action sur un objet du logiciel.
  const technique = [
    "comment faire pour", "ou est", "ou se trouve", "je ne trouve pas",
    "bouton", "champ", "reglage", "parametre", "option", "case a cocher",
    "bug", "erreur", "message d erreur", "ca ne marche pas", "ne fonctionne pas",
    "importer", "exporter", "csv", "integrer", "integration", "domaine",
    "systeme io", "systeme.io", "tag", "webhook", "api", "code", "iframe",
    "logo", "couleur", "police", "image", "video", "pdf",
    "limite", "quota", "plan gratuit", "passer au plan", "debloquer",
    "supprimer", "dupliquer", "publier", "modifier",
  ];

  // Signaux STRATÉGIE : le quoi et le pourquoi. Ce sont des mots de
  // decision, pas de manipulation.
  const strategie = [
    "quel type de quiz", "profil ou score", "par ou commencer", "par ou je commence",
    "quelle question poser", "quelles questions poser", "combien de questions",
    "quel sujet", "quelle idee", "quelle offre", "quelle audience", "ma cible",
    "quoi ecrire", "quoi mettre", "quoi proposer", "quoi vendre",
    "strategie", "methode", "tunnel", "funnel", "sequence", "nurturing",
    "convertir", "vendre", "rentable", "prix", "positionnement",
    "ca ne convertit pas", "personne ne repond", "j ai pas d audience",
    "pas d idee", "je sais pas quoi", "je ne sais pas quoi", "je suis perdue",
    "je suis perdu", "aide moi a choisir", "conseil",
  ];

  const techniqueHits = countHits(m, technique);
  const strategieHits = countHits(m, strategie);

  // Égalité ou silence : stratégie. Voir le commentaire d'en-tête.
  return techniqueHits > strategieHits ? "technique" : "strategie";
}

function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countHits(normalized: string, needles: string[]): number {
  let n = 0;
  for (const needle of needles) {
    if (normalized.includes(normalize(needle))) n += 1;
  }
  return n;
}

// ── Le lien proposé ─────────────────────────────────────────────────

export type CoachUpsell = {
  need: CoachNeed;
  /** Page de vente, avec l'identifiant affilié quand il est connu. */
  url: string;
};

/** Pages de vente canoniques (cf. AGENTS, section URLs canoniques). */
export const TIQUIZ_PLANS_URL = "https://www.tipote.fr/tiquiz";
export const ATELIER_URL = "https://www.tipote.fr/atelier-du-quiz";

/**
 * Le lien à proposer, identifiant affilié inclus.
 *
 * `affiliateSa` vide ou inconnu -> lien nu. Jamais un `sa=` inventé : une
 * attribution fausse est pire que pas d'attribution, elle vole la
 * commission à quelqu'un d'autre.
 */
export function buildCoachUpsell(need: CoachNeed, affiliateSa?: string | null): CoachUpsell {
  const base = need === "technique" ? TIQUIZ_PLANS_URL : ATELIER_URL;
  const sa = (affiliateSa ?? "").trim();
  // Les identifiants Systeme.io sont de la forme sa00078783172001... :
  // on refuse tout ce qui ne ressemble pas a un identifiant, pour ne
  // jamais coller un fragment d'URL ou du texte libre dans le lien.
  const clean = /^[A-Za-z0-9_-]{4,64}$/.test(sa) ? sa : "";
  return { need, url: clean ? `${base}?sa=${encodeURIComponent(clean)}` : base };
}

// ── Quota des non-élèves ────────────────────────────────────────────

/** Questions offertes par jour à quelqu'un qui n'a pas l'Atelier. */
export const GUEST_DAILY_QUESTIONS = 2;

export type GuestQuota = {
  /** Reste-t-il une question ? */
  allowed: boolean;
  /** Questions restantes APRÈS celle-ci (0 = c'était la dernière). */
  remaining: number;
  /** Dernière question offerte : on accompagne la réponse d'une porte. */
  isLast: boolean;
};

/**
 * `askedToday` = questions DÉJÀ posées aujourd'hui, avant celle-ci.
 *
 * La dernière question reçoit sa réponse ET la proposition : on ne coupe
 * jamais quelqu'un au milieu d'une phrase pour lui vendre quelque chose.
 */
export function guestQuota(askedToday: number): GuestQuota {
  const asked = Math.max(0, Math.trunc(askedToday));
  const remainingBefore = Math.max(0, GUEST_DAILY_QUESTIONS - asked);
  if (remainingBefore === 0) return { allowed: false, remaining: 0, isLast: false };
  return { allowed: true, remaining: remainingBefore - 1, isLast: remainingBefore === 1 };
}
