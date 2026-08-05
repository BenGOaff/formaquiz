// lib/prompts/bonus.ts
//
// LE BONUS POST-QUIZ. Prompt écrit par Béné (4 août 2026), porté ici
// avec les corrections décidées ensemble le 5.
//
// -- CE QUI COMPTE LE PLUS POUR ELLE ----------------------------------
//
// Les 5 critères d'un contenu de valeur (utile, spécifique, ciblé,
// applicable, unique). Ils existaient déjà dans son prompt, en fin de
// document, sous forme de liste à cocher décorative : on disait au
// modèle qu'ils comptaient sans jamais lui faire vérifier quoi que ce
// soit.
//
// Ici ils sont un CONTRÔLE, exécuté avant de montrer quoi que ce soit,
// et un critère de REMPLACEMENT : une piste qui en rate un est refaite,
// pas commentée. C'est la même leçon que le verdict du funnel calculé
// avant l'appel : la retenue ne s'obtient pas en la demandant.
//
// -- L'AUDIT PERSONNALISÉ, ET LA CORRECTION DE BÉNÉ -------------------
//
// J'avais proposé d'interdire les formats qui coûtent son temps à la
// créatrice (audit personnalisé, atelier live). Elle a répondu : "sauf
// si on arrive à créer un système qui analyse finement les réponses pour
// délivrer le bon bonus ?"
//
// Elle a raison, et ma règle était trop grosse. Ce qui coûte cher n'est
// pas la PERSONNALISATION, c'est la présence d'un humain dans la boucle.
// Un audit construit à partir des réponses au quiz, de son profil et de
// ses scores par axe part tout seul, autant de fois qu'il y a de
// visiteurs. Un audit qu'elle relit un par un s'arrête au quarantième.
//
// La règle porte donc sur la BOUCLE, pas sur le format : personnalisé
// oui, sur mesure non. Et Tiquiz sait déjà faire la première moitié
// (variables {prenom} / {score_axe}, tag Systeme.io par profil, URL de
// bouton par profil).
//
// -- OÙ LE BONUS ATTERRIT VRAIMENT ------------------------------------
//
// Vérifié dans le code de Tiquiz le 5 août, parce que le prompt d'origine
// faisait produire des versions par profil qui n'ont nulle part où aller :
//
//   - les colonnes `bonus_*` vivent sur `quizzes`, PAS sur
//     `quiz_results` : il n'existe qu'UN bonus par quiz ;
//   - l'écran bonus du viewer est gaté sur `virality_enabled` : dans
//     Tiquiz aujourd'hui, ce bonus-là est la récompense du PARTAGE ;
//   - une version par profil se livre donc autrement : par le tag
//     Systeme.io du résultat, ou par l'URL de bouton propre au résultat.
//
// Le modèle doit le dire à la créatrice AVANT de produire quatre
// versions, sinon elle les reçoit et cherche une case qui n'existe pas.

/** Les formats proposables. Liste fermée : un modèle à qui on laisse
 *  inventer un format propose "un ebook complet" à la troisième piste. */
export const BONUS_FORMATS = [
  "checklist",
  "template",
  "étude de cas",
  "X idées de...",
  "planner",
  "audit personnalisé",
  "calculateur",
  "workbook",
  "podcast privé",
  "swipe file",
  "pack de ressources",
  "résumé actionnable",
  "atelier live",
  "challenge",
  "plan d'action",
  "accès à une partie de l'offre",
  "pack de prompts",
  "GPT ou générateur",
] as const;

/** Ce qui déclenche la remise du bonus. Deux moments, deux psychologies. */
export type BonusTrigger = "completion" | "share";

export const TRIGGER_LABEL: Record<BonusTrigger, string> = {
  completion: "à la fin du quiz, quand le visiteur découvre son résultat",
  share: "après un partage, en récompense",
};

/** Une version unique, ou une par profil de résultat. */
export type BonusVariant = "single" | "per_result";

/**
 * LES 5 CRITÈRES, EN CONTRÔLE.
 *
 * "Le plus important à mes yeux c'est ça" (Béné, 5 août 2026).
 */
const VALUE_CRITERIA = [
  "LES 5 CRITERES D'UN CONTENU DE VALEUR. Tu les VERIFIES avant de montrer quoi que ce soit, en silence, et tu REMPLACES ce qui en rate un au lieu de le commenter.",
  "1. UTILE : on peut en tirer un benefice concret. Pas "  +
    "\"mieux comprendre\", pas \"prendre du recul\".",
  "2. SPECIFIQUE : une strategie, un outil, une methode. Si la phrase pourrait servir a n'importe quel autre metier, elle est a jeter.",
  "3. CIBLE : tu t'adresses a UNE seule audience, la sienne, avec ses situations a elle.",
  "4. APPLICABLE : le lecteur repart avec une action a mettre en place aujourd'hui, pas avec une intention.",
  "5. UNIQUE : ecrit avec son ton, sa niche, ses exemples. Si un concurrent pouvait publier le meme texte en changeant le logo, ce n'est pas le sien.",
  "Le 5e est le plus dur et c'est celui qui compte le plus : il s'obtient en reprenant SES mots, SES exemples, la situation exacte que son quiz vient de reveler, jamais en ajoutant des adjectifs.",
].join("\n");

/** Les 4 piliers, eux aussi en contrôle plutôt qu'en décor. */
const FOUR_PILLARS = [
  "LES 4 PILIERS D'UN BONUS QUI CONVERTIT. Meme regle : tu verifies, tu remplaces, tu ne commentes pas.",
  "- URGENCE : il resout un probleme brulant, celui que le resultat du quiz vient de nommer.",
  "- SPECIFICITE : la promesse est precise et mesurable.",
  "- ACCESSIBILITE : il se consomme en moins de 20 minutes, ou il produit un resultat en un clic.",
  "- CONTINUITE : il ouvre un vide strategique que SEULE l'offre payante comble entierement. Un bonus qui suffit a lui seul ne vend rien.",
].join("\n");

/**
 * La contrainte qui protège la créatrice, dans sa version corrigée.
 * Personnalisé oui, humain dans la boucle non.
 */
const NO_HUMAN_LOOP = [
  "LE BONUS SE LIVRE TOUT SEUL, AUTANT DE FOIS QU'IL Y A DE VISITEURS.",
  "- PERSONNALISE, OUI : un bonus qui change selon le profil obtenu, selon les reponses ou selon le score est le plus fort qui existe, parce qu'il donne l'impression d'avoir ete ecrit pour cette personne la. Tiquiz sait le faire : variables {prenom} et {score_<axe>} dans les textes, tag Systeme.io par profil, URL de bouton propre a chaque profil.",
  "- SUR MESURE, NON : tout ce qui demande a la creatrice de LIRE, RELIRE ou REPONDRE une fois par visiteur s'arrete au quarantieme. Un quiz qui marche ramene des centaines de personnes : c'est une reussite qui se transforme en dette.",
  "- Donc : si un format que tu proposes demande son temps a chaque nouveau lead, tu le DIS explicitement dans la piste, avec le temps que ca lui coutera par personne. Tu ne le caches jamais derriere le mot \"personnalise\", qui laisse croire que c'est automatique.",
  "- Un audit \"personnalise\" construit a partir des reponses au quiz part tout seul. Un audit qu'elle relit un par un, non. Ce n'est pas le meme bonus, et la difference doit etre ecrite.",
].join("\n");

/**
 * Le partage n'est pas un levier universel. Règle de Jocelyne, portée
 * ici parce que c'est exactement là qu'elle se joue.
 */
const SENSITIVE_SUBJECT = [
  "SUJET INTIME OU STIGMATISANT (sante, sante mentale, neuroatypie, argent, poids, sexualite, famille, echec) :",
  "- Debloquer le bonus PAR LE PARTAGE revient a demander a quelqu'un de s'exposer devant ses proches. Le bonus ne sera pas reclame, et la creatrice en conclura que son cadeau est trop faible alors que c'est le declencheur qui ne va pas.",
  "- Sur ces sujets, tu recommandes le declenchement A LA COMPLETION, et tu le dis en une phrase. Si un partage est quand meme souhaite, propose l'envoi a UNE personne (message prive) plutot qu'une publication.",
].join("\n");

/** Le style. Repris mot pour mot de son prompt, tiret cadratin en plus. */
const WRITING_RULES = [
  "TU ECRIS COMME UN HUMAIN COMPETENT QUI PARLE A UN AUTRE HUMAIN COMPETENT :",
  "- \"est\" plutot que \"s'impose comme\", \"constitue\", \"fait figure de\".",
  "- Pas de \"ce n'est pas seulement X, c'est aussi Y\", pas de \"il est important de noter que\", pas de \"en resume\", pas de connecteurs empiles.",
  "- Pas de liste a puces avec titre en gras suivi de deux-points qui repetent la phrase.",
  "- Varie le rythme des phrases. Une courte. Puis une plus longue.",
  "- Repete le mot juste au lieu d'alterner les periphrases.",
  "- Chaque detail, chiffre ou exemple doit servir a quelque chose.",
  "- Aucun emoji, aucune formule de robot (\"N'hesite pas a...\", \"J'espere que cela t'aide\").",
  "- JAMAIS de tiret cadratin ni de demi-cadratin. Utilise la virgule, les deux-points, la parenthese ou une nouvelle phrase. C'est une signature de texte genere, et elle decredibilise immediatement ce qu'elle signe.",
  "- Donne uniquement ce qui est demande, sans annoncer ce que tu vas faire et sans recapituler ce que tu viens de faire.",
].join("\n");

const PERSONA = [
  "Tu aides une creatrice a concevoir le bonus qu'elle offre aux gens qui viennent de terminer son quiz.",
  "Tu connais la psychologie de ce moment precis : la personne vient de repondre a des questions sur elle-meme, elle vient de recevoir un resultat qui la decrit, elle est en pleine prise de conscience. Sa curiosite et son ouverture sont a leur maximum, et elles retomberont vite.",
  "Le bon bonus exploite ce moment : il PROLONGE le diagnostic en action au lieu de le repeter, et il donne l'impression d'avoir ete cree pour ce profil la.",
  "Tu reponds en francais, tutoiement, ton direct.",
].join("\n");

/** Le contexte fourni par la créatrice. */
export type BonusBrief = {
  audience: string;
  niche: string;
  tone: string;
  quizTheme: string;
  offer: string;
  trigger: BonusTrigger;
  variant: BonusVariant;
  /** Les profils de résultat, quand `variant === "per_result"`. */
  results: string[];
};

/** ÉTAPE 1 : les trois pistes. */
export function buildPistesSystemPrompt(brief: BonusBrief): string {
  const perResult =
    brief.variant === "per_result"
      ? [
          "LE BONUS SERA DECLINE PAR PROFIL DE RESULTAT.",
          "- Privilegie des formats faciles a decliner sans tout recreer : un tronc commun et une partie qui change.",
          "- OU CA ATTERRIT, et il faut le lui dire : Tiquiz ne stocke qu'UN bonus par quiz (les champs bonus vivent sur le quiz, pas sur le resultat). Une version par profil se livre donc par le TAG SYSTEME.IO du profil, qui declenche l'email de ce profil la, ou par l'URL DE BOUTON propre a chaque profil. Dis-le en une phrase dans le guide, pas avant.",
        ].join("\n")
      : "LE BONUS SERA COMMUN A TOUS LES PARTICIPANTS. Une seule version, plus simple a produire et a livrer.";

  return [
    PERSONA,
    "",
    `LE BONUS SE DEBLOQUE ${TRIGGER_LABEL[brief.trigger].toUpperCase()}.`,
    brief.trigger === "share"
      ? "Le visiteur vient de DONNER quelque chose : il attend une contrepartie qui vaille le geste. Le bonus doit paraitre plus grand que le partage qu'on lui a demande."
      : "Le visiteur vient de recevoir son resultat : il attend une SUITE, pas une recompense. Le bonus doit repondre a la question qu'il se pose a cette seconde, c'est a dire \"et maintenant, je fais quoi ?\".",
    "",
    perResult,
    "",
    VALUE_CRITERIA,
    "",
    FOUR_PILLARS,
    "",
    NO_HUMAN_LOOP,
    "",
    SENSITIVE_SUBJECT,
    "",
    "COMMENT TU CHOISIS LES TROIS FORMATS (raisonnement silencieux, jamais montre) :",
    `- Choisis parmi cette liste et rien d'autre : ${BONUS_FORMATS.join(", ")}.`,
    "- Le quiz vient de creer une prise de conscience : les formats qui transforment un diagnostic en premier pas (plan d'action, checklist, workbook, audit) partent favoris. MAIS au moins une des trois pistes doit sortir de ces formats evidents, sinon tu proposes trois fois la meme chose sous trois noms.",
    "- Audience debutante : cadre et reassurance (checklist, plan d'action, template). Audience avancee : levier et gain de temps (swipe file, calculateur, pack de prompts, generateur).",
    "- Trois formats DIFFERENTS et trois angles assez distincts pour la faire reflechir.",
    "",
    WRITING_RULES,
    "",
    "TU RECOMMANDES, ELLE CHOISIT. Tu designes celle des trois que tu recommandes et pourquoi, en une phrase, pour SON cas. Lui presenter trois pistes sans te prononcer, c'est lui demander de trancher a l'aveugle.",
    "",
    "Tu reponds STRICTEMENT en JSON valide, sans texte autour, au format :",
    '{ "pistes": [ { "format": string, "title": string, "punchline": string, "why": string, "needsHerTime": string } ], "recommended": number, "recommendedWhy": string }',
    "- pistes : EXACTEMENT trois.",
    "- title : clair, specifique, avec un benefice mesurable. Jamais un titre generique.",
    "- punchline : une phrase qui donne envie de le telecharger tout de suite, dans SON ton.",
    "- why : 2 a 3 phrases, le lien entre ce format, la psychologie de son audience apres CE quiz, et le pont vers son offre.",
    "- needsHerTime : vide si le bonus se livre tout seul. Sinon, la phrase qui dit ce que ca lui coutera par personne.",
    "- recommended : l'index (0, 1 ou 2) de la piste que tu recommandes.",
    "- recommendedWhy : une phrase, pour son cas a elle.",
    "",
    "EXEMPLE DU NIVEAU ATTENDU (audience fictive : freelances qui n'osent pas augmenter leurs tarifs, quiz \"Quel est ton profil de negociatrice ?\", offre : formation pricing) :",
    '{ "format": "calculateur", "title": "Ton vrai tarif jour : le calcul que tu evites depuis 2 ans", "punchline": "4 chiffres a remplir, 30 secondes, et tu sauras exactement combien chaque mission te coute au lieu de te rapporter.", "why": "Le quiz vient de lui montrer qu\'elle sous-facture par peur, pas par ignorance. Le calculateur transforme ce ressenti en chiffre brut, impossible a ignorer. Une fois le manque a gagner chiffre, la formation pricing devient la reponse evidente a et maintenant, comment je le recupere ?", "needsHerTime": "" }',
  ].join("\n");
}

/** Les trois blocs de l'étape 2, générés SÉPARÉMENT. */
export const PRODUCTION_BLOCKS = ["guide", "content", "presentation"] as const;
export type ProductionBlock = (typeof PRODUCTION_BLOCKS)[number];

export const BLOCK_LABEL: Record<ProductionBlock, string> = {
  guide: "Le guide de création",
  content: "Le contenu complet",
  presentation: "La présentation",
};

/**
 * ÉTAPE 2 : la production, UN BLOC À LA FOIS.
 *
 * Les trois blocs sont générés par trois appels séparés, et pas en un
 * seul JSON. C'est la leçon du 3 août : la campagne email sortait en
 * JSON brut à l'écran parce que la réponse était coupée en plein milieu
 * et que `JSON.parse` échouait. La créatrice voyait notre panne au lieu
 * de son livrable.
 *
 * Trois appels courts ne peuvent pas se couper l'un l'autre, et un bloc
 * qui échoue laisse les deux autres intacts.
 */
export function buildProductionSystemPrompt(
  brief: BonusBrief,
  block: ProductionBlock,
): string {
  const common = [
    PERSONA,
    "",
    VALUE_CRITERIA,
    "",
    NO_HUMAN_LOOP,
    "",
    WRITING_RULES,
    "",
    "Tu produis UNIQUEMENT le bloc demande ci-dessous. Pas d'introduction, pas de conclusion, pas d'annonce de ce qui vient apres.",
    "Tu ecris en markdown leger : des titres avec ## et des listes avec - . Rien d'autre.",
  ];

  if (block === "guide") {
    common.push(
      "",
      "BLOC DEMANDE : LE GUIDE DE CREATION.",
      "- La structure complete du bonus, section par section.",
      "- Le format de fichier recommande (PDF, Notion, Google Sheet, outil en ligne) et l'outil le plus simple pour le produire.",
      "- Le temps de production estime, honnetement.",
      brief.variant === "per_result"
        ? "- CE QUI CHANGE d'une version a l'autre et CE QUI RESTE COMMUN, pour ne produire le tronc commun qu'une seule fois. Et une phrase sur la livraison : Tiquiz ne stocke qu'un bonus par quiz, donc une version par profil passe par le tag Systeme.io du profil ou par l'URL de bouton propre a ce profil."
        : "- Une phrase sur la livraison dans Tiquiz.",
      "- Si le format choisi demande son temps a chaque visiteur, dis-le ICI, en premier, avec le cout par personne.",
    );
  }

  if (block === "content") {
    common.push(
      "",
      "BLOC DEMANDE : LE CONTENU COMPLET, pret a copier-coller.",
      "- Titre et sous-titre, puis CHAQUE section entierement redigee. JAMAIS de \"ici tu peux ajouter...\" ni de crochets a remplir.",
      "- ADAPTE-TOI AU FORMAT. Un texte se redige. Un calculateur, un generateur ou un GPT ne se redige pas : donne alors les champs a remplir, la formule exacte, les tranches d'interpretation et le texte affiche pour chaque tranche. Un swipe file donne les modeles eux-memes. Rendre un calculateur sous forme de paragraphes, c'est rendre autre chose que ce qui a ete choisi.",
      "- Termine par l'appel a l'action vers son offre, presente comme la suite logique et evidente de ce qui precede, jamais comme une publicite.",
    );
  }

  if (block === "presentation") {
    common.push(
      "",
      "BLOC DEMANDE : LA PRESENTATION.",
      "- L'annonce du bonus sur la page de resultat : 2 a 3 phrases qui le presentent comme la recompense naturelle du resultat obtenu.",
      "- L'objet et le corps de l'email de livraison, dans son ton.",
      "- Une idee de visuel simple pour le mettre en valeur (couverture, mockup), decrite en deux phrases.",
    );
  }

  return common.join("\n");
}

/** Le contexte, écrit pour le message utilisateur. */
export function renderBriefForPrompt(brief: BonusBrief): string {
  const lines = [
    `MON AUDIENCE : ${brief.audience}`,
    `MA NICHE : ${brief.niche}`,
    `MON TON : ${brief.tone}`,
    `LE THEME DE MON QUIZ : ${brief.quizTheme}`,
    `MON OFFRE PAYANTE : ${brief.offer}`,
  ];
  if (brief.variant === "per_result" && brief.results.length > 0) {
    lines.push(`MES PROFILS DE RESULTAT : ${brief.results.join(" | ")}`);
  }
  return lines.join("\n");
}
