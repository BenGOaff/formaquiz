// lib/affiliate.ts
// Espace Affiliation de l'Atelier du Quiz. Module data-pure (réutilisable
// serveur + client).
//
// -- LE LIEN EST LE NÔTRE DEPUIS LE 26 AOÛT 2026 -----------------------
//
// Béné, capture de cet écran à l'appui : "t'as pas oublié un truc ?"
// L'onglet demandait encore un identifiant Systeme.io et fabriquait
// `tipote.fr/atelier-du-quiz?sa=...`, la veille du jour où l'Atelier est
// passé sur NOTRE bon de commande et NOTRE registre d'affiliés. La
// plomberie avait bougé, l'écran non : exactement la faute commise
// deux jours plus tôt sur `affiliate.tipote.com`.
//
// Le lien pointe donc sur `atelierduquiz.fr` et porte `?ref=<code>`.
// Ce n'est pas cosmétique : un tunnel Systeme.io ne nous transmet RIEN
// de ce qu'on ajoute à l'URL, donc un lien qui passe par eux ne peut
// atteindre ni notre commissionnement, ni le mois offert.
//
// -- LE `sa` RESTE LU, ET IL EST FACULTATIF ----------------------------
//
// Il ne sert plus qu'à UNE chose : rattacher les ventes arrivées par les
// anciens tunnels Systeme.io à la bonne personne. Celui qui en a un le
// colle, celui qui n'en a pas laisse vide et on lui fabrique une clé
// interne. Le nom du paramètre dit la génération du lien (`?ref=` vient
// d'ici, `?sa=` d'un ancien tunnel), et c'est ce qui permet de réserver
// le mois offert au système courant sans aucun marqueur à maintenir.
//
// Modèle de commission :
//   - 70% sur chaque vente de l'Atelier du Quiz
//     (100% au lancement, passé à 70% en juillet 2026)
//   - 40% par mois, en récurrent, sur chaque abonnement Tiquiz parrainé

// Import relatif avec extension : le runner de tests natif Node ne
// resout pas l'alias @/ (cf. AGENTS, filet de tests logique).
import { resolvePersona, type Persona } from "./personas.ts";
import { SA_RE } from "@/lib/affiliate/sa";
import { REF_PARAM, readRef } from "@/lib/affiliate/refLien";
import {
  COMMISSION_BASE,
  COMMISSION_RATES,
  PRICES_TTC_EUR,
  commissionEur,
} from "./affiliateCommission.ts";

/** Un montant en euros, écrit comme l'affiliée le lit. */
function formatEur(value: number): string {
  const entier = Number.isInteger(value);
  return `${value.toFixed(entier ? 0 : 2).replace(".", ",")} €`;
}

// --- Constantes -----------------------------------------------------------

export const QUIZING_COMMISSION_PCT = 70;
export const TIQUIZ_RECURRING_PCT = 40;

/**
 * Page de vente de l'Atelier du Quiz : la NÔTRE, jamais le tunnel
 * Systeme.io. Leur page ne nous transmet pas la query, donc un `?ref=`
 * posé dessus n'atteindrait jamais notre bon de commande.
 */
export const ATELIER_SALES_URL = "https://atelierduquiz.fr/";

/** Où l'affilié suit ses gains, ses liens et ses versements. */
export const ESPACE_AFFILIE_URL = "https://affiliate.tipote.com/";

/** Où l'affilié trouve son identifiant et règle ses paiements (Systeme.io). */
export const SIO_AFFILIATE_DASHBOARD_URL = "https://systeme.io/dashboard/affiliate-dashboard";
export const SIO_AFFILIATE_SETTINGS_URL = "https://systeme.io/dashboard/profile/affiliate-settings";

// --- Identifiant affilié Systeme.io --------------------------------------

// La forme vit dans lib/affiliate/sa.ts, et nulle part ailleurs. Elle
// etait recopiee ici : c'est ainsi que commence une divergence, et une
// commission se perd la ou personne ne regarde.
// Ex : sa0007878317200141bbe3de2b6644176621db2c6580

/**
 * Nettoie une saisie : accepte l'ID brut OU un lien complet collé
 * (https://systeme.io/fr?sa=saXXXX) dont on extrait le paramètre sa.
 * Retourne "" si rien d'exploitable.
 */
export function normalizeAffiliateId(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // Lien collé : on extrait ?sa=... ou &sa=...
  const m = s.match(/[?&]sa=([a-z0-9]+)/i);
  const candidate = (m ? m[1] : s).trim();
  return candidate;
}

export function isValidAffiliateId(value: string | null | undefined): boolean {
  return SA_RE.test(String(value ?? "").trim());
}

/**
 * Construit le lien affilié tracké vers la page de vente de l'Atelier.
 *
 * Il prend le CODE PUBLIC (`ref`), jamais l'identifiant Systeme.io. Le
 * code est fabriqué et gardé par le registre unique, chez Tipote : le
 * recopier ici donnerait deux registres, donc deux réponses différentes
 * le jour où l'un prend du retard.
 *
 * Pas de code -> chaîne vide, et l'écran n'affiche AUCUN lien. Jamais un
 * lien muet : un lien sans code se partage quand même, et chaque partage
 * est une vente perdue que personne ne peut plus retrouver.
 */
export function buildAffiliateLink(refCode: string | null | undefined): string {
  const ref = readRef(refCode);
  if (!ref) return "";
  return `${ATELIER_SALES_URL}?${REF_PARAM}=${encodeURIComponent(ref)}`;
}

// --- Personnalisation : playbook de promo par persona ---------------------

export interface AffiliatePlaybook {
  /** Angle d'accroche adapté au métier de l'affilié. */
  angle: string;
  /** Idées de quiz que l'affilié peut créer pour vendre Quizing à SON audience. */
  quizIdeas: string[];
  /** Niches / audiences à qui recommander l'Atelier du Quiz. */
  niches: string[];
}

const PLAYBOOKS: Record<Persona, AffiliatePlaybook> = {
  freelance: {
    angle:
      "Tes clients freelances galèrent à trouver des prospects qualifiés. Un quiz qui pré-qualifie, c'est exactement ce qui leur manque.",
    quizIdeas: [
      "« Quel type de freelance es-tu ? » qui segmente l'audience puis recommande l'Atelier du Quiz pour transformer ce diagnostic en machine à leads.",
      "« Ton offre est-elle assez claire pour vendre ? » : un quiz-audit qui finit sur l'Atelier du Quiz comme prochaine étape.",
      "« Combien de clients tu rates faute de tunnel ? » pour créer le déclic, puis ton lien affilié.",
    ],
    niches: [
      "Freelances et prestataires qui veulent arrêter le bouche-à-oreille",
      "Consultants qui vendent du temps et veulent scaler",
      "Communautés Malt / Comet / groupes Slack de freelances",
    ],
  },
  infopreneur: {
    angle:
      "Tu vends des formations : tu sais à quel point un bon quiz convertit mieux qu'un simple lead magnet. Montre-le et recommande la méthode.",
    quizIdeas: [
      "« Quel format de formation te correspond ? » qui capture des leads chauds, suivi de l'Atelier du Quiz pour ceux qui veulent reproduire le système.",
      "« Es-tu prêt à lancer ta première formation ? » : score de maturité + reco de l'Atelier du Quiz.",
      "« Ton tunnel de vente a-t-il un trou ? » pour révéler le manque d'un quiz d'entrée.",
    ],
    niches: [
      "Infopreneurs débutants qui peinent à remplir leur liste email",
      "Formateurs qui veulent segmenter avant de vendre",
      "Audiences de lancements / challenges en ligne",
    ],
  },
  coach: {
    angle:
      "Tes clients coachs cherchent des clients alignés. Un quiz qui révèle un profil, c'est l'outil parfait pour eux : recommande-le.",
    quizIdeas: [
      "« Quel est ton profil de [thème du coach] ? » qui crée de l'engagement, puis l'Atelier du Quiz pour ceux qui veulent leur propre quiz.",
      "« Es-tu prêt pour un accompagnement ? » : un quiz de pré-qualification que tes pairs voudront copier.",
      "« Quel blocage t'empêche d'avancer ? » suivi de ta recommandation Quizing.",
    ],
    niches: [
      "Coachs et consultants qui veulent des prospects pré-qualifiés",
      "Thérapeutes / praticiens du bien-être qui débutent en ligne",
      "Communautés de coachs (groupes Facebook, masterminds)",
    ],
  },
  auteur: {
    angle:
      "Tes lecteurs adorent les quiz ludiques. Transforme cet engagement en recommandation de l'Atelier du Quiz.",
    quizIdeas: [
      "« Quel personnage / archétype es-tu ? » dans ton univers, puis l'Atelier du Quiz pour les auteurs qui veulent capturer une audience.",
      "« Quel livre devrais-tu lire / écrire ensuite ? » avec capture email.",
      "« Connais-tu vraiment [ton thème] ? » un quiz de culture suivi de ton lien.",
    ],
    niches: [
      "Auteurs indépendants qui veulent une liste de lecteurs",
      "Créateurs de newsletters littéraires",
      "Communautés d'écriture et d'auto-édition",
    ],
  },
  createur: {
    angle:
      "Ton audience est énorme mais peu monétisée. Un quiz capture des emails et un revenu d'affiliation à la clé : montre-le.",
    quizIdeas: [
      "« Quel créateur es-tu ? » qui buzz, puis l'Atelier du Quiz pour transformer les vues en liste email.",
      "« Ton contenu te rapporte-t-il vraiment ? » : un quiz-révélateur sur la monétisation.",
      "« Quelle offre lancer à ta communauté ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Créateurs de contenu qui veulent enfin monétiser leur audience",
      "Instagrammeurs / TikTokeurs sans liste email",
      "Communautés de créateurs et de newsletters",
    ],
  },
  affilie: {
    angle:
      "Tu connais déjà l'affiliation : ici c'est 70% sur la vente + 40% récurrent sur Tiquiz. Un des meilleurs deals que tu puisses promouvoir.",
    quizIdeas: [
      "« Quel produit d'affiliation te correspond ? » qui segmente, puis l'Atelier du Quiz comme produit phare à 70%.",
      "« Es-tu un affilié rentable ? » : un quiz-audit qui finit sur ta reco.",
      "« Quelle source de revenus passive lancer ? » suivi de ton lien.",
    ],
    niches: [
      "Affiliés et marketeurs qui cherchent des offres récurrentes",
      "Audiences make-money / revenus en ligne",
      "Communautés d'affiliation Systeme.io",
    ],
  },
  mlm: {
    angle:
      "Ton réseau cherche des outils simples pour recruter et vendre. Un quiz, c'est l'aimant à prospects idéal : recommande la méthode.",
    quizIdeas: [
      "« Es-tu fait pour le marketing de réseau ? » qui qualifie tes prospects, puis l'Atelier du Quiz.",
      "« Quel est ton profil d'entrepreneur ? » pour engager ton réseau.",
      "« Prêt à développer ton équipe en ligne ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Leaders MLM qui veulent moderniser leur prospection",
      "Distributeurs qui débutent en ligne",
      "Équipes et lignées qui cherchent des outils duplicables",
    ],
  },
  autre: {
    angle:
      "L'Atelier du Quiz aide n'importe quel entrepreneur à capturer des leads avec un quiz. Recommande-le à ton audience.",
    quizIdeas: [
      "« Quel est ton profil d'entrepreneur ? » avec capture email, puis l'Atelier du Quiz.",
      "« Ton business a-t-il un tunnel qui convertit ? » : un quiz-audit.",
      "« Par quoi commencer pour vendre en ligne ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Entrepreneurs et solopreneurs qui veulent plus de leads",
      "Petites entreprises qui débutent en ligne",
      "Audiences business / marketing francophones",
    ],
  },
};

export function getAffiliatePlaybook(activityType: string | null | undefined): AffiliatePlaybook {
  return PLAYBOOKS[resolvePersona(activityType)];
}

/** Arguments de vente communs (les "supers avantages" à mettre en avant). */
export const AFFILIATE_ARGUMENTS: { title: string; body: string }[] = [
  {
    title: "70% sur la vente",
    body: `Tu touches 70% du prix de chaque Atelier du Quiz vendu via ton lien, soit ${formatEur(commissionEur({ ttcEur: PRICES_TTC_EUR.atelier, rate: COMMISSION_RATES.atelier, base: COMMISSION_BASE }))} par vente à ${formatEur(PRICES_TTC_EUR.atelier)}. Les commissions se calculent sur le montant hors taxes. Une des commissions les plus généreuses du marché.`,
  },
  {
    title: "40% récurrent sur Tiquiz",
    body: "Chaque personne qui prend un abonnement Tiquiz te rapporte 40% chaque mois, tant qu'elle reste abonnée. Un revenu qui s'accumule.",
  },
  {
    title: "Un produit qui se recommande tout seul",
    body: "L'Atelier du Quiz transforme un quiz en machine à leads. C'est concret, démontrable, et ton audience en a besoin.",
  },
  {
    title: "Payé chaque mois, comme tu veux",
    body: "Virement ou PayPal, au choix. Les commissions partent entre le 10 et le 13 du mois, dès 20 € cumulés (en dessous, l'argent reste acquis et part au versement suivant). La facture est écrite à ta place : tu n'as rien à nous envoyer.",
  },
];

/**
 * Phrase d'intro personnalisée selon le business du user (niche + maturité).
 * Reste générique et chaleureuse si les infos manquent.
 */
export function affiliateIntro(opts: {
  firstName?: string | null;
  niche?: string | null;
}): string {
  const name = (opts.firstName ?? "").trim();
  const hello = name ? `${name}, ` : "";
  const niche = (opts.niche ?? "").trim();
  if (niche) {
    return `${hello}ton audience (${niche}) a tout intérêt à créer des quiz pour capturer des leads. En la recommandant l'Atelier du Quiz, tu l'aides ET tu touches 70% de commission.`;
  }
  return `${hello}recommande l'Atelier du Quiz à ton audience : tu l'aides à capturer des leads avec des quiz, et tu touches 70% de commission sur chaque vente.`;
}
