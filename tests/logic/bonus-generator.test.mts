// tests/logic/bonus-generator.test.mts
//
// Le générateur de bonus post-quiz. Prompt écrit par Béné (4 août 2026),
// corrigé le 5 après son premier vrai test.
//
// Chaque test correspond à une décision prise avec elle, pas à une
// préférence de style.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BONUS_FORMATS,
  BONUS_RULES_PREFIX,
  PRODUCTION_BLOCKS,
  buildPistesSystemPrompt,
  buildProductionSystemPrompt,
  renderBriefForPrompt,
  type BonusBrief,
} from "../../lib/prompts/bonus.ts";

const brief = (over: Partial<BonusBrief> = {}): BonusBrief => ({
  // Ce que la creatrice saisit, et c'est TOUT ce qu'elle saisit.
  offers: [
    {
      promise:
        "J'aide les personnes TDAH a apaiser leur stress quotidien en 1 mois grace a des techniques simples",
      kind: "formation en ligne",
      price: "97 euros",
      profileIndexes: [],
    },
  ],
  trigger: "completion",
  plan: "shared",
  // Repris du quiz suivi.
  quizTitle: "Quel est ton profil de vendeuse sur Instagram ?",
  quizIntro: "Decouvre ce qui bloque tes ventes en 3 minutes",
  addressForm: "tu",
  profiles: [
    { title: "La fonceuse", description: "tu publies beaucoup, tu vends peu" },
    { title: "La discrete", description: "tu n'oses pas proposer" },
  ],
  shareTagName: "partage-quiz",
  ...over,
});

// ── Les 5 critères : ce qui compte le plus pour elle ─────────────────

test("les 5 critères sont un CONTROLE, pas une liste décorative", () => {
  const p = recu(buildPistesSystemPrompt(brief()));
  assert.match(p, /Tu les VERIFIES avant de montrer quoi que ce soit/);
  assert.match(p, /REMPLACES ce qui en rate un au lieu de le commenter/);
  for (const c of ["UTILE", "SPECIFIQUE", "CIBLE", "APPLICABLE", "UNIQUE"]) {
    assert.match(p, new RegExp(c), `le critère ${c} doit être nommé`);
  }
});

test("les 5 critères suivent jusque dans la production", () => {
  for (const block of PRODUCTION_BLOCKS) {
    assert.match(recu(buildProductionSystemPrompt(brief(), block)), /LES 5 CRITERES/);
  }
});

/**
 * CE QUE LE MODÈLE REÇOIT VRAIMENT.
 *
 * Depuis le 6 août, le prompt système part en DEUX blocs : le socle
 * stable (`BONUS_RULES_PREFIX`, marqué pour le cache Anthropic) puis la
 * partie variable rendue par les constructeurs. Une règle qui vit dans
 * le socle est donc absente du second, alors qu'elle arrive bien au
 * modèle.
 *
 * Tester un seul des deux blocs testerait la plomberie, pas la règle.
 * Ces tests portent sur l'assemblage, donc ils survivent au prochain
 * découpage.
 */
const recu = (variable: string) => `${BONUS_RULES_PREFIX}\n${variable}`;

// ── On ne redemande plus ce que le quiz sait déjà ────────────────────

test("le contexte est rempli par le quiz, pas par la créatrice", () => {
  // "On ne réutilise pas assez les données du quiz : pourquoi ne pas
  // prendre le quiz suivi par l'Atelier et récupérer toutes ces infos
  // automatiquement ?" Et "mon audience" / "ma niche" n'étaient même pas
  // différenciables.
  const rendered = renderBriefForPrompt(brief());
  assert.match(rendered, /Quel est ton profil de vendeuse sur Instagram/);
  assert.match(rendered, /La fonceuse/);
  assert.match(rendered, /J'aide les personnes TDAH/);
  assert.match(rendered, /FORMAT DE L'OFFRE : formation en ligne/);
  assert.match(rendered, /PRIX : 97 euros/);
});

test("le ton vient du quiz, il ne se redemande pas", () => {
  assert.match(buildPistesSystemPrompt(brief()), /tu TUTOIES le lecteur, comme le quiz/);
  assert.match(
    buildPistesSystemPrompt(brief({ addressForm: "vous" })),
    /tu VOUVOIES le lecteur, comme le quiz/,
  );
});

test("la creatrice ne saisit que ce que le quiz ignore", () => {
  // Son OFFRE, et rien d'autre : promesse, format, prix, et les profils
  // qu'elle sert quand il y en a plusieurs. Plus les deux choix
  // (declencheur, et comment le bonus se decline).
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  const schema = route.slice(route.indexOf("const offerSchema"), route.indexOf("const schema ="));
  for (const champ of ["offers", "promise", "kind", "price", "trigger", "plan"]) {
    assert.ok(schema.includes(champ), `${champ} doit etre saisi`);
  }
  for (const repris of ["quizTitle", "addressForm", "profiles", "shareTagName", "audience", "niche"]) {
    assert.ok(!schema.includes(repris), `${repris} ne doit PAS venir du client`);
  }
});

// ── Un bonus par profil, écrit un profil à la fois ───────────────────

test("quand le bonus est décliné, on écrit pour UN profil à la fois", () => {
  // Le premier contenu généré traitait les quatre profils dans un seul
  // document ("si ta fuite c'est le trafic... si c'est la capture...").
  // Le visiteur devait chercher sa section dans un catalogue : ça rate
  // trois des cinq critères d'un coup (ciblé, applicable, unique).
  const un = renderBriefForPrompt(brief({ plan: "per_profile" }), 0);
  assert.match(un, /LE PROFIL POUR LEQUEL TU ECRIS, ET LUI SEUL/);
  assert.match(un, /La fonceuse/);
  assert.doesNotMatch(un, /La discrete/);

  const p = buildProductionSystemPrompt(brief({ plan: "per_profile" }), "content", 0);
  assert.match(p, /TU ECRIS POUR UN SEUL PROFIL/);
  assert.match(p, /INTERDIT d'ecrire "si ton cas c'est X/);
});

test("sans déclinaison, le contenu reste commun", () => {
  const p = buildProductionSystemPrompt(brief(), "content");
  assert.doesNotMatch(p, /TU ECRIS POUR UN SEUL PROFIL/);
});

// ── La livraison, la vraie ───────────────────────────────────────────

test("la livraison passe par le TAG, jamais par un lien collé dans un résultat", () => {
  // "Ben non" (Béné, 5 août 2026) : le fichier vit sur un drive, et
  // c'est une automatisation Systeme.io sur le tag qui envoie l'email.
  const guide = buildProductionSystemPrompt(brief({ trigger: "share" }), "guide");
  assert.match(guide, /Tag ajoute a un contact/);
  assert.match(guide, /partage-quiz/, "le vrai nom du tag du quiz est repris");
  assert.match(guide, /N'ECRIS JAMAIS qu'il faut coller le lien dans les resultats/);
});

test("le piège du lien de drive restreint est nommé", () => {
  // La créatrice ne le verra JAMAIS : elle, elle a accès au fichier.
  const guide = buildProductionSystemPrompt(brief(), "guide");
  assert.match(guide, /tout le monde avec le lien/);
  assert.match(guide, /la creatrice ne le verra jamais/);
});

test("le tag change selon le déclencheur", () => {
  assert.match(buildProductionSystemPrompt(brief({ trigger: "share" }), "guide"), /tag de partage/);
  assert.match(
    buildProductionSystemPrompt(brief({ trigger: "completion", plan: "per_profile" }), "guide"),
    /tag Systeme\.io du profil obtenu/,
  );
});

// ── La correction de Béné sur l'audit personnalisé ───────────────────

test("personnalisé est encouragé, sur mesure est signalé", () => {
  const p = recu(buildPistesSystemPrompt(brief()));
  assert.match(p, /PERSONNALISE, OUI/);
  assert.match(p, /SUR MESURE, NON/);
  assert.match(p, /tu le DIS explicitement dans la piste/);
});

test("l'audit personnalisé reste proposable", () => {
  assert.ok(BONUS_FORMATS.includes("audit personnalisé"));
  assert.ok(BONUS_FORMATS.includes("calculateur"));
});

// ── Deux déclencheurs, deux psychologies ─────────────────────────────

test("le bonus de partage et le bonus de fin de quiz ne sont pas le même", () => {
  const completion = buildPistesSystemPrompt(brief({ trigger: "completion" }));
  const share = buildPistesSystemPrompt(brief({ trigger: "share" }));
  assert.match(completion, /il attend une SUITE/);
  assert.match(share, /vient de DONNER quelque chose/);
});

test("le sujet intime ne se débloque pas par le partage", () => {
  const p = recu(buildPistesSystemPrompt(brief({ trigger: "share" })));
  assert.match(p, /SUJET INTIME OU STIGMATISANT/);
  assert.match(p, /declenchement A LA COMPLETION/);
});

// ── Le rendu, et le drame du 3 août ──────────────────────────────────

test("le rendu est structuré, pas un pavé", () => {
  // "Ce bloc de texte c'est indigeste, on a les moyens de faire BEAUCOUP
  // plus facile à lire."
  for (const block of PRODUCTION_BLOCKS) {
    const p = buildProductionSystemPrompt(brief(), block);
    assert.match(p, /MISE EN FORME, et elle compte autant que le fond/);
    assert.match(p, /Un pave de texte ne se lit pas/);
  }
  assert.match(buildProductionSystemPrompt(brief(), "guide"), /## Comment il arrive chez ton visiteur/);
});

test("la production se fait en trois blocs séparés", () => {
  assert.deepEqual([...PRODUCTION_BLOCKS], ["guide", "content", "presentation"]);
  for (const block of PRODUCTION_BLOCKS) {
    assert.match(buildProductionSystemPrompt(brief(), block), /Tu produis UNIQUEMENT le bloc demande/);
  }
});

test("le contenu s'adapte au format, il ne devient pas de la prose", () => {
  // Un swipe file donne ses modeles, un plan donne ses etapes datees :
  // le contenu ne se rabat pas sur des paragraphes quel que soit le
  // format demande.
  const p = buildProductionSystemPrompt(brief(), "content", undefined, "swipe file");
  assert.match(p, /ADAPTE-TOI AU FORMAT/);
  assert.match(p, /swipe file/);
});

test("pour un outil, le contenu ecrit les MOTS et le guide la mecanique", () => {
  // Deux blocs qui decrivent tous les deux la formule finissent par ne
  // plus decrire la meme : le contenu ecrit ce que la page AFFICHE, le
  // prompt du guide dit comment elle CALCULE.
  const contenu = buildProductionSystemPrompt(brief(), "content", undefined, "calculateur");
  assert.match(contenu, /PAGE INTERACTIVE/);
  assert.match(contenu, /Aucun code, aucun prompt, aucune formule ici/);

  const guide = buildProductionSystemPrompt(brief(), "guide", undefined, "calculateur");
  assert.match(guide, /la formule exacte/);
});

test("la route ne renvoie jamais de texte brut illisible", () => {
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /reason: "unreadable"/);
});

test("sans quiz relié, la route refuse et le dit", () => {
  // Un refus n'est pas une panne : 409, avec une raison exploitable.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /reason: "no_quiz" \}, \{ status: 409 \}/);
});

// ── Le style, et la règle absolue de Béné ────────────────────────────

test("aucun tiret cadratin dans ce qu'on donne au modèle", () => {
  const prompts = [
    buildPistesSystemPrompt(brief()),
    buildPistesSystemPrompt(brief({ plan: "per_profile", trigger: "share" })),
    ...PRODUCTION_BLOCKS.map((b) => buildProductionSystemPrompt(brief(), b)),
  ];
  for (const p of prompts) assert.ok(!/[—–]/.test(p), "un tiret cadratin a survécu");
});

// ── L'ouverture aux eleves (5 aout 2026) ─────────────────────────────
//
// "Ok c'est cool on envoie pour les users je vais leur demander de
// tester." Le generateur a vecu deux jours en page non listee, reservee
// aux admins, le temps que Bene verifie sa sortie sur de vrais cas.

test("la page ET la route sont ouvertes, pas seulement la page", () => {
  // Fermer l'une sans l'autre etait le point de vigilance a l'aller ;
  // c'est le meme au retour. Une page ouverte devant une route qui refuse
  // donnerait un ecran qui echoue a chaque clic.
  const page = readFileSync(new URL("../../app/(app)/labo-bonus/page.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(page, /isAdminEmail/);
  assert.doesNotMatch(route, /isAdminEmail/);
  // Mais la connexion, elle, reste exigee des deux cotes.
  assert.match(page, /if \(!viewer\) redirect/);
  assert.match(route, /reason: "unauth"/);
});

test("le coach sait ou est le generateur, et ce qu'il produit", () => {
  // "Il faut aussi informer le coach pour qu'il puisse proposer cette
  // nouvelle option si l'user ne sait pas quel bonus offrir et qu'il
  // sache comment les guider, ou trouver ca, ce que ca propose."
  const k = readFileSync(new URL("../../lib/coach/knowledge.ts", import.meta.url), "utf8");
  assert.match(k, /GÉNÉRATEUR DE BONUS POST-QUIZ/);
  assert.match(k, /onglet "Bonus post-quiz"/, "il sait OU c'est");
  assert.match(k, /compte Tiquiz doit être connecté/, "il sait ce qu'il faut AVANT");
  assert.match(k, /3 pistes/, "il sait ce que ca REND");
});

test("le coach conseille les MEMES criteres que le generateur", () => {
  // Deux avis contradictoires dans le meme espace, c'est pire que pas de
  // conseil du tout.
  const k = readFileSync(new URL("../../lib/coach/knowledge.ts", import.meta.url), "utf8");
  for (const c of ["UTILE", "SPÉCIFIQUE", "CIBLÉ", "APPLICABLE", "UNIQUE"]) {
    assert.ok(k.includes(c), `le critere ${c} manque au coach`);
  }
  assert.match(k, /PERSONNALISÉ/);
  assert.match(k, /SUR MESURE/);
  assert.match(k, /jamais collé dans la page de résultat/);
});

test("le coach n'envoie plus vers une page qui a change de nom", () => {
  // "Campagne" est devenu "Bonus" le 5 aout : un coach qui nomme un
  // menu qui n'existe plus fait chercher l'eleve pour rien.
  const k = readFileSync(new URL("../../lib/coach/knowledge.ts", import.meta.url), "utf8");
  const orientation = k.slice(k.indexOf("OUTILS DE L'ESPACE"), k.indexOf("COMMENT MARCHE TIQUIZ"));
  assert.match(orientation, /page "Bonus" du menu/);
});

test("aucun jargon interne ne fuite dans l'interface", () => {
  // "Tu penseras à enlever ce genre de choses pour les users : un bloc à
  // la fois, ça ne peut pas se couper en plein milieu comme la campagne
  // email en juillet." Nos drames internes n'ont rien a faire a l'ecran.
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  // ON REGARDE CE QUI EST AFFICHE, pas "tout ce qui suit le premier
  // `return (`". Ce decoupage supposait que le code venait entierement
  // avant le premier return, ce qui a cesse d'etre vrai le 6 aout : un
  // `return () => clearTimeout(t)` (le nettoyage d'un effet) est arrive
  // avant le JSX, et le test a rougi sur un `JSON.stringify` de la
  // sauvegarde automatique, c'est a dire sur du code que personne ne
  // voit. Un test qui rougit pour une mauvaise raison finit desactive.
  //
  // On extrait donc les deux seules choses qu'un eleve peut lire : le
  // texte entre balises JSX, et les chaines de caracteres. Un
  // identifiant comme `JSON.stringify` n'est ni l'un ni l'autre.
  const sansCommentaires = client
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  const visible = [
    ...(sansCommentaires.match(/>[^<>{}]+</g) ?? []),
    ...(sansCommentaires.match(/"[^"]*"/g) ?? []),
    ...(sansCommentaires.match(/'[^']*'/g) ?? []),
  ].join(" ");
  for (const mot of ["campagne email", "JSON", "juillet", "en test", "non listée"]) {
    assert.ok(!visible.includes(mot), `"${mot}" ne doit pas etre affiche`);
  }
});

// ── Le bonus s'annonce, il ne vend pas ───────────────────────────────
//
// Béné, 5 août 2026, sur l'email généré qui finissait par "c'est
// exactement ce que fait le Quizing. 47€, tout est dedans. [voir le
// Quizing]" :
//
//   "Sinon ce mail là il sert à rien : c'est déjà dans la séquence email
//    générée par le générateur de mail (ou alors ça doit l'être) un peu
//    comme j'ai fait ma séquence email. Et le bonus il est envoyé par
//    email, il ne doit pas polluer la page de résultat qui mène à un cta
//    déjà. Par contre tu peux donner des arguments pour présenter le
//    bonus dans la campagne email et les posts qui vont promouvoir le
//    quiz : titre + punchline, 5 puces promesses."
//
// Sa propre séquence le montre : l'offre, l'histoire, la garantie et le
// prix vivent dans les emails 3 à 5. Un email de livraison qui vend en
// trois lignes ne fait que grignoter ce travail.

test("l'email de livraison ne vend pas l'offre", () => {
  const p = buildProductionSystemPrompt(brief(), "presentation");
  assert.match(p, /INTERDIT ABSOLU 1/);
  assert.match(p, /SEQUENCE EMAIL/);
  assert.match(p, /Pas de prix/);
});

test("rien n'est ajouté sur la page de résultat", () => {
  // Elle mene deja a un appel a l'action : un encart de plus ne fait que
  // diluer le seul clic qui compte.
  const p = buildProductionSystemPrompt(brief(), "presentation");
  assert.match(p, /INTERDIT ABSOLU 2/);
  assert.doesNotMatch(p, /## Sur la page de resultat/);
});

test("le bloc donne de quoi ANNONCER le bonus", () => {
  const p = buildProductionSystemPrompt(brief(), "presentation");
  assert.match(p, /## Le titre et la punchline/);
  assert.match(p, /## Les 5 puces promesses/);
  assert.match(p, /## L'email de livraison/);
  assert.match(p, /campagne email et dans les posts/);
});

test("une puce promesse porte le bénéfice ET sa conséquence", () => {
  // C'est ce qui separe une promesse d'un sommaire, et c'est la forme de
  // ses propres emails ("Tu sais quel quiz creer et pour qui, avant
  // d'ecrire la premiere question. Fini les trois semaines a hesiter").
  const p = buildProductionSystemPrompt(brief(), "presentation");
  assert.match(p, /LE BENEFICE/);
  assert.match(p, /LA CONSEQUENCE CONCRETE/);
  assert.match(p, /EXACTEMENT 5 puces/);
  assert.match(p, /table des matieres/, "le contre-exemple est montre");
});

test("les puces promesses ne servent qu'à ce bloc", () => {
  // Les coller partout ferait grossir les deux autres prompts sans rien
  // leur apporter : le guide s'adresse a la creatrice, le contenu au
  // visiteur qui a DEJA le bonus.
  for (const b of ["guide", "content"] as const) {
    assert.doesNotMatch(buildProductionSystemPrompt(brief(), b), /puces promesses/i, b);
  }
});

// ── Trois dossiers, un seul contenu long à l'écran ───────────────────
//
// "Je trouve que c'est pas pratique à consulter, ces 3 blocs qui
// s'enchainent ça fait beaucoup scroller, on voit mal la limite entre
// chacun. On peut faire 3 dossiers comme les dossiers quiz / sondages de
// Tiquiz ?"

test("l'écran de production passe par des dossiers", () => {
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(client, /"folders"/, "l'etat initial est la grille de dossiers");
  assert.match(client, /Retour aux dossiers/);
  // Un dossier par bloc de production, jamais moins.
  for (const b of PRODUCTION_BLOCKS) {
    assert.match(client, new RegExp(`\\b${b}: \\{`), `dossier manquant : ${b}`);
  }
});

test("une carte dit où on en est sans qu'on l'ouvre", () => {
  // Sinon il faut entrer dans les trois pour le savoir, ce qui est
  // exactement le parcours qu'on vient de supprimer.
  const client = readFileSync(
    new URL("../../app/(app)/labo-bonus/BonusLabClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(client, /folderStatus\(/);
  assert.match(client, /À générer/);
});

// ── Un outil se fait coder par l'IA, pas monter dans un tableur ──────
//
// Béné, 5 août 2026, devant un guide qui lui proposait Google Sheets,
// une formule par champ, la feuille publiée en page web, "entre 2 h 45
// et 3 heures pour les quatre profils", puis un service payant :
//
//   "On peut plutôt demander à Claude ou GPT de coder ça en donnant le
//    prompt exact à utiliser à l'user, on lui dit de l'héberger sur une
//    page de blog ou de tunnel sur Systeme.io et d'envoyer le lien dans
//    le premier email ?? 1000000 fois plus simple et moderne !!"

test("un calculateur ne renvoie plus vers un tableur", () => {
  const p = buildProductionSystemPrompt(brief(), "guide", undefined, "calculateur");
  assert.match(p, /INTERDIT de proposer un tableur/);
  assert.match(p, /Claude ou ChatGPT/);
});

test("le prompt est donne TOUT PRET, dans un bloc de code", () => {
  // Un prompt qu'il faut reconstituer en recopiant six paragraphes n'est
  // pas un prompt, c'est un exercice.
  const p = buildProductionSystemPrompt(brief(), "guide", undefined, "calculateur");
  assert.match(p, /## Le prompt a copier dans Claude ou ChatGPT/);
  assert.match(p, /BLOC DE CODE markdown/);
  assert.match(p, /AUCUNE decision a prendre/);
});

test("la page produite doit tenir dans un bloc de code de page", () => {
  // Un seul fichier, aucune dependance externe : c'est la condition pour
  // que ca marche colle dans une page de tunnel.
  const p = buildProductionSystemPrompt(brief(), "guide", undefined, "calculateur");
  // 25 aout 2026 : le prompt disait "UN SEUL fichier HTML autonome".
  // Un fichier HTML autonome commence par <!DOCTYPE html> : colle dans
  // un bloc de code, c'est une page DANS une page, et son CSS repeint
  // toute la page de la creatrice. Le code produit est un MORCEAU.
  assert.match(p, /CE N'EST PAS UNE PAGE, C'EST UN MORCEAU DE PAGE/);
  assert.match(p, /N'ecris ni <!DOCTYPE>, ni <html>/);
  assert.match(p, /N'attends ni DOMContentLoaded ni window\.onload/);
  assert.match(p, /AUCUN SERVEUR/);
  assert.match(p, /AUCUNE BIBLIOTHEQUE, aucun CDN/);
  assert.match(p, /aucune donnee ne part nulle part/);
});

test("un outil se livre par une page, un document par un drive", () => {
  const page = buildProductionSystemPrompt(brief(), "guide", undefined, "calculateur");
  assert.match(page, /bloc de code d'une page Systeme\.io/);
  assert.doesNotMatch(page, /heberge sur un drive/);
  // 25 aout 2026 : la phrase disait "une page de blog, ou une page de
  // tunnel", sans dire LAQUELLE. Un eleve l'a suivie sur une PAGE INFO,
  // qui ne propose pas le bloc de code, et a cherche pendant une heure
  // un element qui n'etait pas sur son ecran. Le guide doit nommer le
  // type qui refuse, et donner celui qui accepte.
  assert.match(page, /PAGE INFO/);
  assert.match(page, /PAGE DE REMERCIEMENT/);

  const doc = buildProductionSystemPrompt(brief(), "guide", undefined, "checklist");
  assert.match(doc, /heberge sur un drive/);
  assert.doesNotMatch(doc, /INTERDIT de proposer un tableur/);
});

test("dans les trois formes, c'est le TAG qui declenche l'email", () => {
  // C'est ce que le tout premier guide avait rate, et ca ne doit pas se
  // reperdre en changeant la premiere etape.
  for (const f of ["calculateur", "checklist", "atelier live"]) {
    const p = buildProductionSystemPrompt(brief(), "guide", undefined, f);
    assert.match(p, /Tag ajoute a un contact/, f);
    assert.match(p, /N'ECRIS JAMAIS qu'il faut coller le lien dans les resultats/, f);
  }
});

test("un bonus decline ne fait pas coder quatre pages", () => {
  const p = buildProductionSystemPrompt(brief({ plan: "per_profile" }), "guide", 0, "calculateur");
  assert.match(p, /UN SEUL PROMPT, pas quatre/);
});

test("la route transmet le format choisi", () => {
  // Sans lui, la regle de forme ne sert a rien : le guide retombe sur le
  // document quel que soit l'outil choisi.
  const src = readFileSync(new URL("../../app/api/me/bonus/route.ts", import.meta.url), "utf8");
  assert.match(src, /input\.chosen\.format/);
});
