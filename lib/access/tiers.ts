// lib/access/tiers.ts
//
// LES DEUX PALIERS D'ACCÈS À L'ATELIER (campagne pub, 3 août 2026).
//
// Béné lance une campagne de publicité avec un tunnel en deux temps :
//   -  7 € : l'Atelier + le coach + le Quiz Doctor
//   - 47 € (upsell) : + les bonus, les templates et le générateur d'email,
//     + 15 jours de Tiquiz Plus offerts (décomptés à partir de la création
//     du premier quiz)
//
// Jusqu'ici `enrollments` était binaire : actif ou révoqué, et tout élève
// actif avait tout. Il faut donc un PALIER, et ce module en est la seule
// source de vérité. Le webhook, les pages et les routes API l'appellent ;
// personne ne réécrit la règle ailleurs.
//
// POURQUOI CE MODULE EST SI DÉFENSIF. Ce code tourne pendant une campagne
// payante : chaque erreur est soit un client qui paie et n'a pas ce qu'on
// lui a vendu, soit un produit à 47 € donné gratuitement. Les deux coûtent
// cher, et le premier coûte la confiance. D'où trois principes :
//
//   1. LE PALIER NE REDESCEND JAMAIS TOUT SEUL (`mergeTier`). Systeme.io
//      réessaie, réordonne et rejoue ses webhooks. Si l'upsell à 47 €
//      arrive AVANT l'achat à 7 € (ça arrive : deux automatisations, deux
//      files), un simple écrasement rétrograderait un client qui vient de
//      payer le prix fort. Seule une révocation explicite fait descendre.
//   2. L'INCONNU DONNE LE PALIER COMPLET (`resolveTier`). Colonne absente,
//      migration pas encore passée, valeur illisible : on ouvre tout. Un
//      élève lésé écrit au support et perd confiance ; un accès trop
//      large se rattrape en une requête. Le sens du repli n'est pas
//      neutre, il est choisi.
//   3. CE QUI EST VERROUILLÉ TIENT EN UNE CONSTANTE (`PLUS_ONLY_SECTIONS`).
//      Une ligne à éditer, pas une logique à relire.

export type AtelierTier = "standard" | "plus";

/**
 * Les sections réservées au palier 47 €.
 *
 * ATTENTION, C'EST LA LISTE À ÉDITER, et la seule. Elle contient
 * aujourd'hui la Campagne (`/funnel`), qui EST le générateur d'emails
 * (séquence de bienvenue, un email par profil de résultat, séquence de
 * vente douce, kit de lancement) et les modèles Systeme.io prêts à
 * importer. C'est ce qui correspond mot pour mot à "les bonus, templates
 * et générateur d'email".
 *
 * Les BONUS sont verrouillés eux aussi, mais ils ne vivent pas dans une
 * URL à eux : voir `canAccessBonusDays`.
 *
 * Tout le reste est ouvert dès 7 € : la formation (`/dashboard`, les jours
 * du parcours), le carnet, les avancées, le Quiz Doctor (`/diagnostic`),
 * le coach, le certificat et l'affiliation.
 */
export const PLUS_ONLY_SECTIONS: readonly string[] = ["/funnel"];

/**
 * Les BONUS sont-ils ouverts à ce palier ?
 *
 * Les bonus ne sont pas une section d'URL : ce sont les jours marqués
 * `is_bonus` en base, affichés dans leur propre bloc du tableau de bord et
 * ouverts via `/jour/[n]`. Un verrou par chemin ne peut donc pas les
 * couvrir, d'où ce prédicat séparé.
 *
 * Béné, 3 août 2026 : "pour les 7 € tout sauf les 15 jours gratuits à
 * Tiquiz, les bonus quand tu veux et le /funnel."
 */
export function canAccessBonusDays(tier: AtelierTier): boolean {
  return tier === "plus";
}

/**
 * Les 15 jours de Tiquiz Plus sont-ils inclus à ce palier ?
 *
 * Uniquement à 47 €. Le décompte démarre à la création du premier quiz,
 * pas à l'achat : la mécanique de démarrage différé existe déjà côté
 * Tiquiz (`startPendingAtelierTrial`).
 */
export function includesPlusTrial(tier: AtelierTier): boolean {
  return tier === "plus";
}

/** Rang, pour comparer deux paliers sans écrire de ternaire ailleurs. */
const RANK: Record<AtelierTier, number> = { standard: 0, plus: 1 };

/**
 * Lit le palier stocké en base.
 *
 * Tout ce qui n'est pas EXPLICITEMENT "standard" vaut "plus". C'est le
 * principe 2 ci-dessus, et c'est aussi ce qui protège les élèves
 * existants : leurs lignes `enrollments` n'ont pas de palier (ou la
 * colonne n'existe pas encore en prod), et ils ont payé l'Atelier complet.
 * Ils ne doivent RIEN perdre le jour où cette migration passe.
 */
export function resolveTier(raw: string | null | undefined): AtelierTier {
  return raw === "standard" ? "standard" : "plus";
}

/**
 * Le palier à écrire quand une nouvelle vente arrive.
 *
 * On garde TOUJOURS le plus élevé des deux. C'est le principe 1 : les
 * webhooks Systeme.io arrivent dans un ordre qu'on ne contrôle pas, et un
 * client qui a payé 47 € ne doit jamais retomber à 7 € parce qu'un
 * webhook a doublé ou s'est croisé.
 */
export function mergeTier(current: AtelierTier | null | undefined, incoming: AtelierTier): AtelierTier {
  if (!current) return incoming;
  return RANK[incoming] > RANK[current] ? incoming : current;
}

/** `true` si ce palier ouvre cette section. */
export function canAccessSection(tier: AtelierTier, pathname: string): boolean {
  if (tier === "plus") return true;
  return !isPlusOnlySection(pathname);
}

/**
 * La section demandée est-elle réservée ?
 *
 * On compare sur le SEGMENT, pas en `startsWith` brut : sans ça,
 * verrouiller `/funnel` verrouillerait aussi un futur `/funnel-public` ou
 * `/funnels`, et une page ouverte deviendrait payante sans que personne
 * l'ait décidé.
 */
export function isPlusOnlySection(pathname: string): boolean {
  const path = normalize(pathname);
  return PLUS_ONLY_SECTIONS.some((section) => {
    const s = normalize(section);
    return path === s || path.startsWith(s + "/");
  });
}

function normalize(p: string): string {
  const trimmed = String(p ?? "").trim().split("?")[0].split("#")[0];
  const withSlash = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

/**
 * Nombre de jours de Tiquiz Plus offerts par la campagne pub.
 *
 * Décomptés à partir de la CRÉATION DU PREMIER QUIZ, pas de l'achat ni de
 * la première connexion : la mécanique de démarrage différé existe déjà
 * côté Tiquiz (`startPendingAtelierTrial`, appelé par POST /api/quiz).
 * Seul le palier 47 € y a droit.
 */
export const ADS_PLUS_TRIAL_DAYS = 15;

/**
 * Identifiant de tunnel des claims d'essai pour cette campagne.
 *
 * Distinct de "bene" et "affiliate" : l'opération des 20 places a ses
 * propres compteurs, et cette campagne ne doit ni les consommer ni les
 * fausser.
 */
export const ADS_TRIAL_FUNNEL = "ads_atelier_plus";
