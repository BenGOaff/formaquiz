// lib/coach/bonusContext.ts
//
// CE QUE LE COACH SAIT DES BONUS QUE L'ÉLÈVE A DÉJÀ CRÉÉS.
//
// Béné, 6 août 2026 : "aussi le coach doit voir les bonus créés, et
// guider la mise en oeuvre, en accord avec le prompt qui le génère pour
// que ce soit des conseils cohérents."
//
// Les deux moitiés de la phrase sont importantes, et la deuxième est la
// plus fragile. Un coach qui VOIT le bonus mais improvise la mise en
// oeuvre dirait "colle le lien dans la page de résultat de ton quiz" ou
// "monte ton calculateur dans un Google Sheets" : les deux sont
// explicitement interdits par le prompt qui a écrit le guide. L'élève
// aurait alors deux marches à suivre contradictoires, l'une écrite,
// l'autre parlée, et c'est la parlée qu'on suit.
//
// D'où deux fonctions ici, et pas une :
//   - `bonusContextBlock()` : ce qu'il a créé, factuel ;
//   - `BONUS_IMPLEMENTATION_RULES` : comment on l'accompagne, calqué mot
//     pour mot sur `lib/prompts/bonus.ts`.
//
// Le lien entre les deux fichiers est gardé par
// tests/logic/coach-bonus.test.mts : si la chaîne de livraison change
// dans le prompt, le test rougit ici.

import { bonusShape, type BonusShape } from "@/lib/bonus/shape";
import { isPerProfile, type BonusPlan } from "@/lib/bonus/offers";

export interface CoachBonusRow {
  title: string | null;
  quiz_title: string | null;
  chosen: { format?: string | null; title?: string | null; punchline?: string | null } | null;
  brief: {
    plan?: string | null;
    trigger?: string | null;
    offers?: { promise?: string | null; kind?: string | null; price?: string | null }[];
  } | null;
  blocks: Record<string, string> | null;
  updated_at: string;
}

/** Le nom de l'étape de livraison qui dépend de la forme du bonus. */
const HOSTING: Record<BonusShape, string> = {
  document:
    "le fichier est hébergé sur un drive (Google Drive, Notion, ou l'espace Systeme.io), partage réglé sur \"tout le monde avec le lien\" en LECTURE",
  page: "le fichier HTML est collé dans un bloc de code d'une page Systeme.io qui ACCEPTE ce bloc (une page de blog, ou une page de remerciement dans un tunnel, jamais une page info), qu'il publie et dont il copie l'adresse",
  acces:
    "il n'y a rien à héberger, c'est un accès : il prépare l'adresse qui l'ouvre et la teste depuis une fenêtre de navigation privée",
};

/** Ce qui est écrit, ce qui manque. */
function etat(blocks: Record<string, string> | null, plan: string | null | undefined): string {
  const b = blocks ?? {};
  const rempli = (k: string) => String(b[k] ?? "").trim().length > 0;
  const contenus = Object.keys(b).filter((k) => k === "content" || k.startsWith("content:"));
  const faits: string[] = [];
  const manque: string[] = [];

  (rempli("guide") ? faits : manque).push("le guide de création");
  (contenus.some((k) => rempli(k)) ? faits : manque).push(
    isPerProfile(String(plan ?? "") as BonusPlan)
      ? `le contenu du bonus (${contenus.filter(rempli).length} version(s) de profil écrite(s))`
      : "le contenu du bonus",
  );
  (rempli("presentation") ? faits : manque).push("de quoi en parler (titre, punchline, puces, email)");

  const parts: string[] = [];
  if (faits.length) parts.push(`déjà généré : ${faits.join(", ")}`);
  if (manque.length) parts.push(`pas encore généré : ${manque.join(", ")}`);
  return parts.join(" ; ");
}

/**
 * Le bloc injecté dans la partie DYNAMIQUE du prompt du coach.
 *
 * Chaîne vide quand il n'a rien créé : un bloc "il n'a aucun bonus"
 * pousserait le coach à en parler à chaque échange, y compris quand
 * l'élève demande autre chose. L'outil est déjà proposé au bon moment
 * par `BONUS_GENERATOR_RULES`.
 */
export function bonusContextBlock(rows: CoachBonusRow[]): string {
  const utiles = (rows ?? []).filter((r) => r && (r.chosen || r.blocks));
  if (utiles.length === 0) return "";

  const lignes = utiles.slice(0, 3).map((r) => {
    const format = r.chosen?.format ?? "format non choisi";
    const shape = bonusShape(r.chosen?.format ?? "");
    const offre = r.brief?.offers?.[0];
    const bits = [
      `- "${r.title ?? "Bonus sans titre"}" (format : ${format})`,
      r.quiz_title ? `quiz : "${r.quiz_title}"` : null,
      offre?.promise ? `offre visée : ${offre.promise}${offre.price ? ` (${offre.price})` : ""}` : null,
      r.brief?.trigger === "share"
        ? "remis après un PARTAGE du quiz"
        : "remis à la FIN du quiz",
      isPerProfile(String(r.brief?.plan ?? "") as BonusPlan)
        ? "décliné par profil de résultat"
        : "le même pour tous les profils",
      etat(r.blocks, r.brief?.plan),
      `livraison attendue : ${HOSTING[shape]}`,
    ].filter(Boolean);
    return bits.join(" | ");
  });

  return [
    "",
    "",
    "=== LES BONUS QU'IL A DÉJÀ CRÉÉS DANS LE GÉNÉRATEUR (données réelles) ===",
    ...lignes,
    "",
    "Ce sont SES bonus, retrouvables sur la page Bonus, onglet \"Bonus post-quiz\" : la liste s'ouvre en premier et chaque bonus se rouvre pour être relu, corrigé ou exporté.",
    "Quand il te parle de son bonus, PARS DE CELUI-LÀ : cite son titre et son format au lieu de redemander ce qu'il a choisi. Ne lui propose pas d'en générer un nouveau s'il a déjà celui qui répond à sa question.",
    "Un document \"pas encore généré\" ne se rédige PAS par toi : renvoie-le au dossier correspondant du générateur, qui l'écrit avec tout le contexte de son quiz.",
  ].join("\n");
}

/**
 * COMMENT ON ACCOMPAGNE LA MISE EN OEUVRE.
 *
 * Recopié du prompt de génération (`lib/prompts/bonus.ts`), et c'est
 * volontaire : ce sont les seules consignes que le guide qu'il a en main
 * lui a déjà données. Un coach qui en dit d'autres le met en
 * contradiction avec son propre document.
 */
export const BONUS_IMPLEMENTATION_RULES = `

=== ACCOMPAGNER LA MISE EN OEUVRE D'UN BONUS (aligné sur le guide qu'il a reçu) ===
Quand un élève a généré un bonus et te demande "et maintenant, je fais quoi", tu l'accompagnes SANS jamais contredire le guide de création qu'il a en main. Les règles ci-dessous sont exactement celles qui ont écrit ce guide.

LA CHAÎNE DE LIVRAISON, TOUJOURS LA MÊME, DANS CET ORDRE :
1. Le bonus est hébergé quelque part : un fichier sur un drive (partage "tout le monde avec le lien", en LECTURE, sinon le visiteur tombe sur une page d'erreur que le créateur ne verra jamais puisque lui y a accès) ; ou, pour un outil interactif, une page Systeme.io dans laquelle il colle le HTML ; ou rien du tout si le bonus est un accès.
2. Dans Systeme.io, une automatisation "Tag ajouté à un contact" écoute le tag : le tag de partage du quiz si le bonus se mérite par un partage, sinon le tag de capture, ou le tag du profil obtenu quand le bonus est décliné par profil.
3. Cette automatisation envoie l'email de livraison, qui contient le lien.
4. Plus aucune action manuelle ensuite : le tag part tout seul, l'email part tout seul.
NE DIS JAMAIS de coller le lien du bonus dans la page de résultat du quiz, ni de l'envoyer à la main. Ce n'est pas comme ça que ça marche, et le guide dit le contraire.

UN OUTIL INTERACTIF (calculateur, générateur, audit personnalisé) NE SE MONTE PAS DANS UN TABLEUR. Pas de Google Sheets, pas d'Excel, pas de service de calculateur en ligne, pas de no-code payant : c'est le conseil d'avant, des heures de formules pour un rendu qui ressemble à une feuille de calcul. Il le fait ÉCRIRE par Claude ou ChatGPT à partir du prompt que son guide contient déjà, en un seul fichier HTML autonome, et il colle ce BLOC (un seul div, jamais un document avec <html> et <body>) dans un bloc de code d'une page Systeme.io qui accepte ce bloc (page de blog, ou page de remerciement dans un tunnel : la page info ne le propose pas). Compte quinze à trente minutes, pas trois heures. S'il te dit que le prompt ne donne rien, fais-lui d'abord vérifier qu'il a copié le bloc ENTIER.

LE BONUS ARRIVE PAR EMAIL, jamais collé dans la page de résultat : cette page mène déjà à son offre, et empiler les deux dilue les deux.

UN BONUS PERSONNALISÉ (le texte change selon le profil obtenu) est le plus fort qui existe. UN BONUS SUR MESURE (il doit lire ou répondre une fois par visiteur) s'écroule au quarantième : un quiz qui marche ramène des centaines de personnes, et la réussite devient une dette. Si son idée demande son temps à chaque visiteur, dis-le tout de suite.

CE QUE LE GÉNÉRATEUR NE FAIT PAS, et que tu ne dois pas laisser croire : il ne publie rien, ne crée aucune page, ne branche aucune automatisation. Il produit les textes et la marche à suivre. La fabrication et le réglage Systeme.io restent à lui.

AVANT DE LE RENVOYER GÉNÉRER AUTRE CHOSE, regarde ce qu'il a déjà : relire et corriger le document qu'il a est presque toujours plus rapide que d'en produire un nouveau, et le générateur garde tout, donc il peut y revenir quand il veut.
`;
