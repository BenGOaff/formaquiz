// lib/prompts/bonus.ts
//
// LE BONUS POST-QUIZ. Prompt écrit par Béné (4 août 2026), corrigé le 5
// après son premier vrai test.
//
// -- CE QUI COMPTE LE PLUS POUR ELLE ----------------------------------
//
// Les 5 critères d'un contenu de valeur (utile, spécifique, ciblé,
// applicable, unique). Ils sont un CONTRÔLE, exécuté avant de montrer
// quoi que ce soit, et un critère de REMPLACEMENT : une piste qui en
// rate un est refaite, pas commentée.
//
// -- LES TROIS CORRECTIONS DU PREMIER TEST ----------------------------
//
// 1. ON NE REDEMANDE PLUS CE QU'ON SAIT DÉJÀ. "On ne réutilise pas assez
//    les données du quiz : pourquoi ne pas prendre le quiz suivi par
//    l'Atelier et récupérer toutes ces infos automatiquement ?" Elle a
//    raison, et "mon audience" / "ma niche" n'étaient même pas
//    différenciables. Le thème, le ton (tu/vous), les profils de
//    résultat et le tag de partage viennent du quiz. Il ne reste que ce
//    que le quiz ne sait pas : l'OFFRE.
//
// 2. UN BONUS PAR PROFIL, ÉCRIT UN PROFIL À LA FOIS. Le premier contenu
//    généré traitait les quatre profils dans un seul document ("si ta
//    fuite c'est le trafic... si c'est la capture..."). C'est l'inverse
//    exact de la promesse : le visiteur reçoit un catalogue où il doit
//    trouver sa section, au lieu d'un texte qui parle de lui. Et ça rate
//    trois des cinq critères d'un coup (ciblé, applicable, unique).
//
// 3. LA LIVRAISON, LA VRAIE. Le guide décrivait "crée 4 résultats et
//    mets le lien du PDF dans chacun". Non : le PDF part sur un drive
//    (lien accessible à tous en lecture), et l'email de livraison est
//    déclenché par le TAG de Systeme.io. Pour un bonus de partage,
//    c'est le tag de partage du quiz ; pour un bonus de fin de quiz,
//    c'est le tag du profil obtenu.
//
// -- OÙ LE BONUS ATTERRIT VRAIMENT ------------------------------------
//
// Vérifié dans le code de Tiquiz : les colonnes `bonus_*` vivent sur
// `quizzes`, pas sur `quiz_results`. Il n'existe qu'UN bonus par quiz,
// et son écran est gaté sur `virality_enabled`. Une version par profil
// passe donc forcément par les tags Systeme.io.

// Import RELATIF avec l'extension : le runner de tests de ce repo ne
// resout pas l'alias `@/`.
import { bonusShape, type BonusShape } from "../bonus/shape.ts";
import {
  hasOfferPerProfile,
  isPerProfile,
  offerForProfile,
  type BonusOffer,
  type BonusPlan,
} from "../bonus/offers.ts";

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

/** Le format de l'offre payante vers laquelle le bonus mène. */
export const OFFER_KINDS = [
  "formation en ligne",
  "accompagnement ou coaching",
  "prestation de service",
  "outil ou logiciel",
  "produit physique",
  "abonnement",
  "programme de groupe",
] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

/**
 * Ce que le générateur reçoit.
 *
 * `quiz*` vient du quiz suivi, la créatrice ne le saisit pas.
 * `offer*` est la seule chose qu'elle écrit : le quiz ne sait rien de
 * son offre payante.
 */
export type BonusBrief = {
  /**
   * LES OFFRES, ET À QUI ELLES S'ADRESSENT (Monique, 5 août 2026).
   *
   * Une seule dans le cas courant. Plusieurs quand le quiz sert à
   * orienter vers l'offre adaptée : "je n'ai pas une offre à proposer,
   * mais 3, chaque profil mène vers une offre différente".
   */
  offers: BonusOffer[];
  trigger: BonusTrigger;
  /** Comment le bonus ET l'offre se déclinent. Cf. lib/bonus/offers.ts. */
  plan: BonusPlan;

  // ── Repris du quiz suivi ──
  quizTitle: string;
  quizIntro: string;
  /** "tu" ou "vous". */
  addressForm: string;
  /** Les profils, titre et description. */
  profiles: { title: string; description: string }[];
  /** Le tag Systeme.io du partage, quand il existe. */
  shareTagName: string;
};

const VALUE_CRITERIA = [
  "LES 5 CRITERES D'UN CONTENU DE VALEUR. Tu les VERIFIES avant de montrer quoi que ce soit, en silence, et tu REMPLACES ce qui en rate un au lieu de le commenter.",
  "1. UTILE : on peut en tirer un benefice concret. Pas \"mieux comprendre\", pas \"prendre du recul\".",
  "2. SPECIFIQUE : une strategie, un outil, une methode. Si la phrase pourrait servir a n'importe quel autre metier, elle est a jeter.",
  "3. CIBLE : tu t'adresses a UNE seule personne, celle qui vient d'obtenir CE resultat. Jamais a plusieurs profils dans le meme document.",
  "4. APPLICABLE : le lecteur repart avec une action a mettre en place aujourd'hui, pas avec une intention.",
  "5. UNIQUE : ecrit avec le ton du quiz, ses mots, ses exemples. Si un concurrent pouvait publier le meme texte en changeant le logo, ce n'est pas le sien.",
  "Le 5e est le plus dur et c'est celui qui compte le plus : il s'obtient en reprenant LES MOTS DU QUIZ et la situation exacte que le resultat vient de nommer, jamais en ajoutant des adjectifs.",
].join("\n");

const FOUR_PILLARS = [
  "LES 4 PILIERS D'UN BONUS QUI CONVERTIT. Meme regle : tu verifies, tu remplaces, tu ne commentes pas.",
  "- URGENCE : il resout un probleme brulant, celui que le resultat du quiz vient de nommer.",
  "- SPECIFICITE : la promesse est precise et mesurable.",
  "- ACCESSIBILITE : il se consomme en moins de 20 minutes, ou il produit un resultat en un clic.",
  "- CONTINUITE : il ouvre un vide strategique que SEULE l'offre payante comble entierement. Un bonus qui suffit a lui seul ne vend rien.",
].join("\n");

const NO_HUMAN_LOOP = [
  "LE BONUS SE LIVRE TOUT SEUL, AUTANT DE FOIS QU'IL Y A DE VISITEURS.",
  "- PERSONNALISE, OUI : un bonus qui change selon le profil obtenu est le plus fort qui existe, parce qu'il donne l'impression d'avoir ete ecrit pour cette personne la. Tiquiz sait le faire : un tag Systeme.io par profil, une URL de bouton par profil, et les variables {prenom} et {score_<axe>} dans les textes.",
  "- SUR MESURE, NON : tout ce qui demande a la creatrice de LIRE, RELIRE ou REPONDRE une fois par visiteur s'arrete au quarantieme. Un quiz qui marche ramene des centaines de personnes : c'est une reussite qui se transforme en dette.",
  "- Donc : si un format que tu proposes demande son temps a chaque nouveau lead, tu le DIS explicitement dans la piste, avec le temps que ca lui coutera par personne. Tu ne le caches jamais derriere le mot \"personnalise\".",
].join("\n");

const SENSITIVE_SUBJECT = [
  "SUJET INTIME OU STIGMATISANT (sante, sante mentale, neuroatypie, argent, poids, sexualite, famille, echec) :",
  "- Debloquer le bonus PAR LE PARTAGE revient a demander a quelqu'un de s'exposer devant ses proches. Le bonus ne sera pas reclame, et la creatrice en conclura que son cadeau est trop faible alors que c'est le declencheur qui ne va pas.",
  "- Sur ces sujets, tu recommandes le declenchement A LA COMPLETION, et tu le dis en une phrase.",
].join("\n");

const WRITING_RULES = [
  "TU ECRIS COMME UN HUMAIN COMPETENT QUI PARLE A UN AUTRE HUMAIN COMPETENT :",
  "- \"est\" plutot que \"s'impose comme\", \"constitue\", \"fait figure de\".",
  "- Pas de \"ce n'est pas seulement X, c'est aussi Y\", pas de \"il est important de noter que\", pas de \"en resume\", pas de connecteurs empiles.",
  "- Pas de liste a puces avec titre en gras suivi de deux-points qui repetent la phrase.",
  "- Varie le rythme des phrases. Une courte. Puis une plus longue.",
  "- Repete le mot juste au lieu d'alterner les periphrases.",
  "- Chaque detail, chiffre ou exemple doit servir a quelque chose.",
  "- Aucun emoji, aucune formule de robot (\"N'hesite pas a...\", \"J'espere que cela t'aide\").",
  "- JAMAIS de tiret cadratin ni de demi-cadratin. Utilise la virgule, les deux-points, la parenthese ou une nouvelle phrase.",
  "- Donne uniquement ce qui est demande, sans annoncer ce que tu vas faire et sans recapituler ce que tu viens de faire.",
].join("\n");

const PERSONA = [
  "Tu aides une creatrice a concevoir le bonus qu'elle offre aux gens qui passent son quiz.",
  "Tu connais la psychologie de ce moment precis : la personne vient de repondre a des questions sur elle-meme, elle vient de recevoir un resultat qui la decrit, elle est en pleine prise de conscience. Sa curiosite et son ouverture sont a leur maximum, et elles retomberont vite.",
  "Le bon bonus exploite ce moment : il PROLONGE le diagnostic en action au lieu de le repeter, et il donne l'impression d'avoir ete cree pour ce profil la.",
  "Tu reponds en francais.",
].join("\n");

/**
 * LE SOCLE STABLE DU PROMPT, IDENTIQUE POUR TOUT LE MONDE.
 *
 * Béné, 6 août 2026 : "il faut bien penser à mettre en cache ou optimiser
 * tous les trucs qui sont réutilisés pour toujours limiter la conso,
 * conformément aux reco d'Anthropic."
 *
 * Le cache d'Anthropic est un PRÉFIXE EXACT : il ne s'accroche que sur
 * des octets identiques, depuis le tout début. Ces blocs ne dépendent
 * donc d'AUCUN champ du brief : la même créatrice les réutilise sur ses
 * quatre appels (les pistes, puis les trois documents), et deux
 * créatrices différentes partagent exactement le même préfixe.
 *
 * MESURÉ : ~1250 tokens, au dessus du minimum de 1024 du modèle utilisé
 * (claude-sonnet-4-6). En dessous du minimum, le cache ne s'accroche
 * PAS, en silence, sans erreur : c'est pour ça que ce socle regroupe six
 * blocs au lieu d'être découpé plus finement.
 *
 * NE JAMAIS Y GLISSER UNE VALEUR DU BRIEF. Une seule interpolation
 * (le titre du quiz, le ton, un prix) rend le préfixe unique par
 * créatrice : le cache ne serait plus jamais lu, seulement écrit, et
 * l'écriture coûte 1,25 fois le prix normal. On paierait pour ne rien
 * économiser.
 */
export const BONUS_RULES_PREFIX = [
  PERSONA,
  "",
  VALUE_CRITERIA,
  "",
  FOUR_PILLARS,
  "",
  NO_HUMAN_LOOP,
  "",
  SENSITIVE_SUBJECT,
  "",
  WRITING_RULES,
].join("\n");

/** Le ton du quiz, imposé au modèle plutôt que redemandé. */
function toneLine(b: BonusBrief): string {
  return b.addressForm === "vous"
    ? "TON : tu VOUVOIES le lecteur, comme le quiz. Ne bascule jamais sur le tutoiement."
    : "TON : tu TUTOIES le lecteur, comme le quiz. Ne bascule jamais sur le vouvoiement.";
}

/** Ce qu'on sait du quiz, pour le message utilisateur. */
export function renderBriefForPrompt(b: BonusBrief, profileIndex?: number): string {
  // L'OFFRE QUI S'APPLIQUE A CE PROFIL LA (Monique, 5 aout 2026).
  // Sans ca, un quiz qui oriente vers trois offres differentes renvoyait
  // les trois profils vers la meme, c'est a dire vers l'inverse de ce que
  // le quiz venait de leur dire.
  const offer = offerForProfile(b.plan, b.offers, profileIndex ?? -1) ?? b.offers[0] ?? null;

  const lines = [
    `LE QUIZ : "${b.quizTitle}"`,
    b.quizIntro ? `CE QU'IL PROMET : ${b.quizIntro}` : "",
    "",
    offer ? `L'OFFRE PAYANTE VERS LAQUELLE LE BONUS MENE : ${offer.promise}` : "",
    offer ? `FORMAT DE L'OFFRE : ${offer.kind}` : "",
    offer?.price ? `PRIX : ${offer.price}` : "",
    "",
  ];

  // Quand chaque profil a SON offre, on montre la carte complete tant
  // qu'on n'ecrit pas pour un profil precis : c'est ce qui permet a
  // l'etape des pistes de proposer un format qui tienne pour les trois.
  if (hasOfferPerProfile(b.plan) && typeof profileIndex !== "number") {
    lines.push("CHAQUE PROFIL MENE VERS SA PROPRE OFFRE :");
    b.profiles.forEach((p, i) => {
      const o = offerForProfile(b.plan, b.offers, i);
      lines.push(`- ${p.title} -> ${o ? o.promise : "(aucune offre associee)"}`);
    });
    lines.push("");
  }
  if (b.profiles.length > 0) {
    if (typeof profileIndex === "number" && b.profiles[profileIndex]) {
      const p = b.profiles[profileIndex];
      lines.push(
        "LE PROFIL POUR LEQUEL TU ECRIS, ET LUI SEUL :",
        `- ${p.title}`,
        p.description ? `- ce que le quiz lui dit : ${p.description}` : "",
      );
    } else {
      lines.push("LES PROFILS DE RESULTAT DU QUIZ :");
      for (const p of b.profiles) {
        lines.push(`- ${p.title}${p.description ? ` : ${p.description.slice(0, 240)}` : ""}`);
      }
    }
  }
  return lines.filter(Boolean).join("\n");
}

/** ÉTAPE 1 : les trois pistes. */
export function buildPistesSystemPrompt(b: BonusBrief): string {
  const perResult =
    isPerProfile(b.plan)
      ? [
          "LE BONUS SERA DECLINE PAR PROFIL.",
          "- Privilegie des formats faciles a decliner sans tout recreer : un tronc commun, et une partie qui change.",
          "- Chaque version sera ecrite SEPAREMENT, pour UN profil. Ne propose donc pas un format qui obligerait a mettre les quatre profils dans le meme document : ce serait un catalogue ou le lecteur doit chercher sa section, exactement ce qu'on veut eviter.",
        ].join("\n")
      : "LE BONUS SERA COMMUN A TOUS LES PARTICIPANTS. Une seule version, plus simple a produire et a livrer.";

  // CHAQUE PROFIL A SON OFFRE (Monique, 5 aout 2026). Le format doit
  // tenir pour les trois, sinon on choisit une piste impossible a
  // decliner sans la reecrire.
  const offres = hasOfferPerProfile(b.plan)
    ? [
        "",
        "ATTENTION : CHAQUE PROFIL MENE VERS UNE OFFRE DIFFERENTE. Le quiz sert justement a orienter vers l'offre adaptee.",
        "- Propose donc un format dont la MECANIQUE tient pour toutes les offres, et dont seul le contenu change d'un profil a l'autre.",
        "- Ne propose pas une piste qui ne marcherait que pour une des offres : deux profils sur trois se retrouveraient avec un bonus qui ne mene nulle part.",
      ].join("\n")
    : "";

  // LE SOCLE N'EST PLUS ICI : il part en bloc systeme cachable, avant
  // celui-ci (cf. BONUS_RULES_PREFIX). Ce que cette fonction rend est la
  // partie VARIABLE, celle qui depend du brief.
  return [
    toneLine(b),
    "",
    `LE BONUS SE DEBLOQUE ${TRIGGER_LABEL[b.trigger].toUpperCase()}.`,
    b.trigger === "share"
      ? "Le visiteur vient de DONNER quelque chose : il attend une contrepartie qui vaille le geste."
      : "Le visiteur vient de recevoir son resultat : il attend une SUITE, pas une recompense. Le bonus doit repondre a la question qu'il se pose a cette seconde, c'est a dire \"et maintenant, je fais quoi ?\".",
    "",
    perResult,
    offres,
    "",
    "COMMENT TU CHOISIS LES TROIS FORMATS (raisonnement silencieux, jamais montre) :",
    `- Choisis parmi cette liste et rien d'autre : ${BONUS_FORMATS.join(", ")}.`,
    "- Le quiz vient de creer une prise de conscience : les formats qui transforment un diagnostic en premier pas partent favoris. MAIS au moins une des trois pistes doit sortir de ces formats evidents, sinon tu proposes trois fois la meme chose sous trois noms.",
    "- Trois formats DIFFERENTS et trois angles assez distincts pour la faire reflechir.",
    "",
    "TU RECOMMANDES, ELLE CHOISIT. Tu designes celle des trois que tu recommandes et pourquoi, en une phrase, pour SON cas.",
    "",
    "Tu reponds STRICTEMENT en JSON valide, sans texte autour, au format :",
    '{ "pistes": [ { "format": string, "title": string, "punchline": string, "why": string, "needsHerTime": string } ], "recommended": number, "recommendedWhy": string }',
    "- pistes : EXACTEMENT trois.",
    "- title : clair, specifique, avec un benefice mesurable. Jamais un titre generique.",
    "- punchline : une phrase qui donne envie de le telecharger tout de suite.",
    "- why : 2 a 3 phrases, le lien entre ce format, la psychologie de ce public apres CE quiz, et le pont vers l'offre.",
    "- needsHerTime : vide si le bonus se livre tout seul. Sinon, la phrase qui dit ce que ca lui coutera par personne.",
    "- recommended : l'index (0, 1 ou 2) de la piste recommandee.",
    "- recommendedWhy : une phrase.",
    "",
    "EXEMPLE DU NIVEAU ATTENDU (audience fictive : freelances qui n'osent pas augmenter leurs tarifs) :",
    '{ "format": "calculateur", "title": "Ton vrai tarif jour : le calcul que tu evites depuis 2 ans", "punchline": "4 chiffres a remplir, 30 secondes, et tu sauras exactement combien chaque mission te coute au lieu de te rapporter.", "why": "Le quiz vient de lui montrer qu\'elle sous-facture par peur, pas par ignorance. Le calculateur transforme ce ressenti en chiffre brut, impossible a ignorer. Une fois le manque a gagner chiffre, la formation devient la reponse evidente a et maintenant, comment je le recupere ?", "needsHerTime": "" }',
  ].join("\n");
}

/**
 * UNE PISTE DE PLUS, ET UNE SEULE.
 *
 * Béné, 6 août 2026 : "on peut ajouter l'option de générer 1 idée de
 * bonus en plus à la 2ème étape ? Au cas où l'élève n'est pas convaincu
 * par les propositions. À générer UNIQUEMENT si l'user clique sur le
 * bouton, limiter la conso de token."
 *
 * Les deux contraintes sont dans la mécanique, pas seulement dans le
 * bouton :
 *
 * 1. On rend UNE piste, pas trois. Relancer l'étape entière coûterait
 *    trois fois la sortie et effacerait des propositions qu'elle n'a
 *    peut-être pas fini de lire.
 * 2. On envoie ce qui a DÉJÀ été proposé, pour que la nouvelle soit
 *    vraiment autre chose. Sans cette liste, le modèle repropose le
 *    format évident et l'élève paie une génération pour un doublon,
 *    c'est à dire la pire dépense possible.
 */
export function buildOnePisteSystemPrompt(
  b: BonusBrief,
  dejaProposes: { format: string; title: string }[],
): string {
  const liste = dejaProposes
    .map((p, i) => `${i + 1}. ${p.format} : ${p.title}`)
    .join("\n");

  return [
    toneLine(b),
    "",
    `LE BONUS SE DEBLOQUE ${TRIGGER_LABEL[b.trigger].toUpperCase()}.`,
    "",
    "ELLE A DEJA CES PISTES SOUS LES YEUX, ET AUCUNE NE LA CONVAINC :",
    liste,
    "",
    "TU EN PROPOSES UNE SEULE, VRAIMENT AUTRE CHOSE :",
    "- un format qui n'est PAS dans la liste ci-dessus ;",
    "- un angle different, pas une reformulation d'une piste existante ;",
    `- choisi parmi : ${BONUS_FORMATS.join(", ")}.`,
    "- Si les pistes existantes couvrent deja les formats evidents, va chercher plus loin plutot que de revenir sur l'un d'eux.",
    "",
    "Tu reponds STRICTEMENT en JSON valide, sans texte autour, au format :",
    '{ "format": string, "title": string, "punchline": string, "why": string, "needsHerTime": string }',
    "- title : clair, specifique, avec un benefice mesurable.",
    "- punchline : une phrase qui donne envie de le telecharger tout de suite.",
    "- why : 2 a 3 phrases, le lien entre ce format, la psychologie de ce public apres CE quiz, et le pont vers l'offre.",
    "- needsHerTime : vide si le bonus se livre tout seul. Sinon, la phrase qui dit ce que ca lui coutera par personne.",
  ].join("\n");
}

export const PRODUCTION_BLOCKS = ["guide", "content", "presentation"] as const;
export type ProductionBlock = (typeof PRODUCTION_BLOCKS)[number];

export const BLOCK_LABEL: Record<ProductionBlock, string> = {
  guide: "Le guide de création",
  content: "Le contenu du bonus",
  presentation: "De quoi en parler",
};

/**
 * LA MÉCANIQUE DES PUCES PROMESSES.
 *
 * Béné, 5 août 2026 : "tu peux donner des arguments pour présenter le
 * bonus dans la campagne email et les posts qui vont promouvoir le
 * quiz : titre + punchline, 5 puces promesses (bénéfice + conséquence
 * concrète du bénéfice)."
 *
 * La mécanique est distillée de `copywriting-claude/Puces promesses`,
 * jamais recopiée : donner une liste finie à un modèle produit des
 * puces qui se ressemblent toutes d'un quiz à l'autre. Le patron en
 * deux temps vient de ses propres emails ("Tu sais quel quiz créer et
 * pour qui, avant d'écrire la première question. Fini les trois
 * semaines à hésiter sur le sujet").
 *
 * Le deuxième temps est ce qui distingue une puce d'un sommaire :
 * "un modèle d'email" est une table des matières, "tu écris ton email
 * du lundi en dix minutes au lieu d'y passer ta matinée" est une
 * promesse.
 */
const PROMISE_BULLETS = [
  "LES PUCES PROMESSES, EN DEUX TEMPS, ET LES DEUX SONT OBLIGATOIRES :",
  "1. LE BENEFICE : ce que la personne SAIT FAIRE ou OBTIENT apres avoir utilise le bonus.",
  "2. LA CONSEQUENCE CONCRETE : ce que ca change dans sa semaine. Du temps gagne, une hesitation qui disparait, une erreur qu'elle ne fait plus, un resultat qu'elle peut constater.",
  "Le deuxieme temps est ce qui separe une promesse d'un sommaire. \"Un modele d'email\" est une table des matieres. \"Tu ecris ton email du lundi en dix minutes au lieu d'y passer ta matinee\" est une promesse.",
  "Une puce = une phrase, deux au maximum. Elle commence par un VERBE ou par \"Comment\", jamais par un nom de chapitre.",
  "INTERDIT : les superlatifs creux (revolutionnaire, ultime, incontournable), les mots-valises (optimiser, booster, passer au niveau superieur), et toute promesse invérifiable.",
  "INTERDIT : parler du bonus a la troisieme personne (\"ce guide contient\"). On parle a la personne qui va le recevoir.",
].join("\n");

/**
 * COMMENT LE BONUS ARRIVE VRAIMENT CHEZ LE VISITEUR.
 *
 * Le premier guide généré disait "crée 4 résultats dans Tiquiz et mets
 * le lien du PDF dans chacun". C'est faux, et Béné l'a corrigé : le
 * fichier vit sur un drive, et c'est un TAG Systeme.io qui déclenche
 * l'email de livraison.
 */
/**
 * LE PROMPT QU'ON DONNE À LA CRÉATRICE, POUR QU'ELLE LE DONNE À L'IA.
 *
 * Béné, 5 août 2026 : "on peut plutôt demander à Claude ou GPT de coder
 * ça en donnant le prompt exact à utiliser à l'user, on lui dit de
 * l'héberger sur une page de blog ou de tunnel sur Systeme.io et
 * d'envoyer le lien dans le premier email ?? 1000000 fois plus simple et
 * moderne !!"
 *
 * Ce qu'elle venait de lire : Google Sheets, une formule par champ, la
 * feuille publiée en page web, "entre 2 h 45 et 3 heures pour les quatre
 * profils", et un service payant en repli. Elle a raison sur les deux
 * plans : ce temps là n'a plus de raison d'être, et une feuille de calcul
 * publiée n'est pas un livrable.
 *
 * Les contraintes techniques ci-dessous ne sont pas décoratives. Un
 * fichier unique sans dépendance, c'est ce qui se colle dans un bloc de
 * code d'une page de tunnel. Tout calculé dans le navigateur, c'est ce
 * qui évite d'expliquer le RGPD à quelqu'un qui voulait juste offrir un
 * calculateur.
 */
const AI_BUILT_PAGE = [
  "COMMENT ELLE FABRIQUE CET OUTIL : elle ne le code pas, et elle ne le monte pas dans un tableur. Elle le fait ECRIRE par Claude ou ChatGPT, et TU LUI DONNES LE PROMPT TOUT PRET.",
  "INTERDIT de proposer un tableur (Google Sheets, Excel), un service de calculateur en ligne, ou un outil no-code payant. C'est le conseil d'avant : des heures de formules pour un rendu qui ressemble a une feuille de calcul.",
  "Le prompt que tu ecris est COMPLET et se copie tel quel : il contient les champs exacts, la formule exacte, les tranches d'interpretation et le texte affiche pour chaque tranche, le texte du bouton final et l'adresse de l'offre. Celui qui le colle ne doit avoir AUCUNE decision a prendre, sauf sa couleur et son lien.",
  "Le prompt exige de l'IA : UN SEUL fichier HTML autonome, CSS et JavaScript a l'interieur, AUCUNE bibliotheque externe (il finira dans un bloc de code d'une page, ou rien ne se telecharge de l'exterieur) ; lisible sur telephone d'abord ; TOUT calcule dans le navigateur, aucune donnee envoyee nulle part ; une couleur principale posee en variable CSS en haut du fichier, pour qu'elle la change en une ligne.",
  "Tu ecris ce prompt DANS UN BLOC DE CODE markdown (trois backticks avant, trois backticks apres), et rien d'autre dans ce bloc. C'est ce qui lui donne son bouton Copier.",
  "Le temps annonce est le temps REEL de cette methode : coller le prompt, relire, ajuster une fois. Quinze a trente minutes, pas trois heures.",
].join("\n");

function deliveryFacts(b: BonusBrief, shape: BonusShape): string {
  const tag =
    b.trigger === "share"
      ? b.shareTagName
        ? `le tag de partage du quiz, qui s'appelle "${b.shareTagName}"`
        : "le tag de partage du quiz (a definir dans Tiquiz, onglet Partager)"
      : isPerProfile(b.plan)
        ? "le tag Systeme.io du profil obtenu (un tag par profil, defini sur chaque resultat)"
        : "le tag de capture du quiz";

  // LA PREMIERE ETAPE DEPEND DE CE QU'ON A FABRIQUE, LES TROIS AUTRES
  // JAMAIS. Un PDF vit sur un drive, un outil vit sur une page, un acces
  // n'a rien a heberger ; mais dans les trois cas c'est le TAG qui
  // declenche l'email, et c'est ca que le premier guide avait rate.
  const hosting: Record<BonusShape, string> = {
    document:
      "1. Le fichier est heberge sur un drive (Google Drive, Notion, ou l'espace Systeme.io). ATTENTION : le partage du fichier doit etre regle sur \"tout le monde avec le lien\", en LECTURE. Un lien restreint donne une page d'erreur au visiteur, et la creatrice ne le verra jamais puisque, elle, y a acces.",
    page: "1. Le fichier HTML produit par l'IA est colle dans un bloc de code d'une page Systeme.io : une page de blog, ou une page de tunnel. Elle publie la page et copie son adresse. Rien a installer, rien a heberger ailleurs, et l'adresse est sur son domaine.",
    acces:
      "1. Il n'y a pas de fichier a heberger : ce bonus est un acces. Elle prepare l'adresse qui l'ouvre (le lien de l'atelier, le flux prive, la page d'inscription au challenge) et verifie qu'elle fonctionne depuis une fenetre de navigation privee.",
  };

  return [
    "LA LIVRAISON, ET ELLE EST NON NEGOCIABLE. Voici le seul chemin exact, a decrire tel quel :",
    hosting[shape],
    `2. Dans Systeme.io, une automatisation "Tag ajoute a un contact" ecoute ${tag}.`,
    "3. Cette automatisation envoie l'email de livraison, qui contient le lien.",
    "4. Plus aucune action manuelle ensuite. Le tag part tout seul, l'email part tout seul.",
    "N'ECRIS JAMAIS qu'il faut coller le lien dans les resultats du quiz ni le remettre a la main : ce n'est pas comme ca que ca marche.",
  ].join("\n");
}

/**
 * ÉTAPE 2 : la production, UN BLOC À LA FOIS.
 *
 * Trois appels séparés plutôt qu'un seul JSON : une réponse coupée en
 * plein milieu ne peut plus emporter les deux autres blocs.
 *
 * `profileIndex` : quand le bonus est décliné, le contenu s'écrit pour
 * UN profil. Le premier essai mettait les quatre dans le même document,
 * ce qui rate trois des cinq critères d'un coup.
 */
export function buildProductionSystemPrompt(
  b: BonusBrief,
  block: ProductionBlock,
  profileIndex?: number,
  /** Le format de la piste choisie. Il decide de la FORME du bonus, donc
   *  de la facon dont il se fabrique et dont il se livre. Absent, on
   *  retombe sur le document, la forme la plus courante. */
  chosenFormat = "",
): string {
  const shape = bonusShape(chosenFormat);
  // LE SOCLE N'EST PLUS ICI (cf. BONUS_RULES_PREFIX) : il part en bloc
  // systeme cachable, avant celui-ci.
  //
  // Au passage, ces trois appels recoivent maintenant AUSSI les quatre
  // piliers et la regle des sujets sensibles, qu'ils n'avaient pas.
  // C'est la condition du cache (le prefixe doit etre identique d'un
  // appel a l'autre, a l'octet pres), et c'est un gain de fond : ecrire
  // le contenu d'un bonus sur un sujet intime sans la regle des sujets
  // sensibles etait une lacune, pas un choix.
  const out = [
    toneLine(b),
    "",
    "Tu produis UNIQUEMENT le bloc demande. Pas d'introduction, pas de conclusion, pas d'annonce de ce qui vient apres.",
    "MISE EN FORME, et elle compte autant que le fond : markdown leger. Des titres avec ## pour les sections, ### pour les sous-sections, des listes avec - , du **gras** sur les mots qui portent l'action. Un pave de texte ne se lit pas, donc ne s'applique pas. Pas de tableaux, pas de code.",
  ];

  if (block === "guide") {
    // LE TROISIEME TITRE CHANGE AVEC LA FORME. Pour un outil, la
    // question n'est plus "avec quel logiciel" mais "quel prompt je
    // colle" : c'est tout le sens du retour du 5 aout.
    const thirdTitle =
      shape === "page"
        ? "## Le prompt a copier dans Claude ou ChatGPT"
        : shape === "acces"
          ? "## Ce que tu prepares, et en combien de temps"
          : "## Avec quel outil, et en combien de temps";

    const thirdBody =
      shape === "page"
        ? AI_BUILT_PAGE
        : shape === "acces"
          ? "Sous le troisieme : ce qu'elle doit preparer (la date, le support, l'adresse d'acces), le temps reel, et ce qui doit exister AVANT le premier inscrit."
          : isPerProfile(b.plan)
            ? "Sous le troisieme : l'outil, le temps reel, ET ce qui change d'une version a l'autre contre ce qui reste commun, pour ne produire le tronc commun qu'une seule fois."
            : "Sous le troisieme : l'outil le plus simple et le temps reel, honnetement.";

    out.push(
      "",
      "BLOC DEMANDE : LE GUIDE DE CREATION. Il s'adresse a la CREATRICE, pas au visiteur.",
      "Structure imposee, avec ces titres exacts :",
      "## Ce que tu vas produire",
      "## La structure, section par section",
      thirdTitle,
      "## Comment il arrive chez ton visiteur",
      "Sous le premier titre : une phrase, pas plus.",
      "Sous le deuxieme : la structure du bonus, une sous-section par partie, avec ce qu'elle contient et pourquoi.",
      thirdBody,
      hasOfferPerProfile(b.plan)
        ? "CHAQUE VERSION MENE VERS UNE OFFRE DIFFERENTE. Dis-le explicitement dans le guide : le tronc commun est le meme, mais l'appel a l'action et le dernier paragraphe changent d'un profil a l'autre, et l'automatisation Systeme.io de chaque profil envoie SA version. Ne laisse pas croire qu'un seul fichier suffit."
        : "",
      shape === "page" && isPerProfile(b.plan)
        ? "UN SEUL PROMPT, pas quatre. La page est la meme pour tous les profils : le prompt demande a l'IA de prevoir une variable en haut du fichier pour le texte qui change d'un profil a l'autre, et le guide dit quoi y mettre pour chacun. Faire coder quatre pages presque identiques est exactement le genre de corvee qu'on vient de supprimer."
        : "",
      "Sous le quatrieme : la livraison, exactement comme decrite ci-dessous.",
      "",
      deliveryFacts(b, shape),
    );
  }

  if (block === "content") {
    out.push(
      "",
      "BLOC DEMANDE : LE CONTENU DU BONUS, pret a copier-coller. Il s'adresse au VISITEUR.",
      "- Titre, puis chaque section entierement redigee. JAMAIS de \"ici tu peux ajouter...\" ni de crochets a remplir.",
      shape === "page"
        ? // La MECANIQUE de l'outil vit dans le prompt du guide. Ici on
          // ecrit les MOTS, et seulement les mots : deux blocs qui
          // decrivent tous les deux la formule finissent par ne plus
          // decrire la meme.
          "- CE BONUS EST UNE PAGE INTERACTIVE, et tu n'ecris PAS son fonctionnement (il vit dans le prompt du guide). Tu ecris les TEXTES QU'ELLE AFFICHE : l'accroche, le libelle et l'aide de chaque champ a remplir, le texte affiche pour chaque tranche de resultat, et le texte du bouton final. Aucun code, aucun prompt, aucune formule ici."
        : "- ADAPTE-TOI AU FORMAT. Un texte se redige. Un swipe file donne les modeles eux-memes. Un plan donne les etapes datees.",
      "- Termine par l'appel a l'action vers l'offre, presente comme la suite logique de ce qui precede, jamais comme une publicite.",
    );
    if (isPerProfile(b.plan)) {
      // On NOMME le profil dans la consigne, pas seulement dans les
      // donnees : une instruction qui designe "le profil indique plus
      // bas" se dilue, une instruction qui dit son nom ne se dilue pas.
      const p = typeof profileIndex === "number" ? b.profiles[profileIndex] : undefined;
      out.push(
        "",
        p?.title
          ? `TU ECRIS POUR UN SEUL PROFIL : "${p.title}".`
          : "TU ECRIS POUR UN SEUL PROFIL, celui indique dans le message.",
        "INTERDIT de mentionner les autres profils, et INTERDIT d'ecrire \"si ton cas c'est X... si c'est Y...\" : le visiteur ne doit pas avoir a chercher sa section dans un catalogue. Il a obtenu UN resultat, il lit un texte qui parle de lui et de rien d'autre.",
      );
    }
  }

  if (block === "presentation") {
    out.push(
      "",
      "BLOC DEMANDE : DE QUOI PARLER DU BONUS. Ce bloc sert a ANNONCER le bonus dans la campagne email et dans les posts qui font la promotion du quiz. Structure imposee, avec ces titres exacts :",
      "## Le titre et la punchline",
      "## Les 5 puces promesses",
      "## L'email de livraison",
      "Sous le premier : le titre du bonus, puis UNE phrase de punchline qui donne envie de l'obtenir. Le titre nomme le resultat, pas le format.",
      "Sous le deuxieme : EXACTEMENT 5 puces, en liste a tirets.",
      "",
      PROMISE_BULLETS,
      "",
      "Sous le troisieme : l'objet, puis le corps de l'email qui LIVRE le bonus, dans le ton du quiz. Il contient le lien du fichier, une phrase qui dit par ou commencer, et rien d'autre.",
      "",
      // DEUX INTERDITS QUI VIENNENT D'UN VRAI RETOUR (Béné, 5 août 2026).
      "INTERDIT ABSOLU 1 : vendre l'offre dans cet email. Pas de prix, pas de lien vers l'offre, pas de \"si tu veux aller plus loin\". La vente vit dans la SEQUENCE EMAIL, qui est generee ailleurs et qui la fait mieux : elle a plusieurs jours, une histoire, une garantie. Un email de livraison qui vend en trois lignes ne fait que grignoter la sequence.",
      "INTERDIT ABSOLU 2 : ecrire quoi que ce soit a ajouter SUR LA PAGE DE RESULTAT. Elle mene deja a un appel a l'action, et le bonus arrive par email. Un encart de plus sur cette page ne fait que diluer le seul clic qui compte.",
    );
  }

  return out.join("\n");
}
