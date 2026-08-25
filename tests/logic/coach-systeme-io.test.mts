// tests/logic/coach-systeme-io.test.mts
//
// Béné, 25 août 2026, deux retours d'élèves.
//
// "Je galère à mettre un html sur ma page" : l'élève était sur une PAGE
// INFO, qui ne propose ni bloc de code ni bouton. Le coach lui a
// expliqué où cliquer. Aucune explication ne pouvait marcher.
//
// "Je vais créer une formation, ajouter les 3 produits et créer un autre
// tunnel... je dois aussi faire un workflow et le déclencheur sera achat
// du kit ?" : six questions empilées, et rien nulle part ne disait au
// coach dans quel ORDRE ça se monte.
//
// Un prompt est du CODE : il régresse en silence quand on le retouche.
// Ce test lit la SOURCE plutôt que d'importer `knowledge.ts`, qui est
// marqué `server-only`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SYSTEME_IO_BUILD_RULES,
  SYSTEME_IO_PAGE_TYPES_RULES,
} from "../../lib/coach/systemeIo.ts";

const KNOWLEDGE = readFileSync(new URL("../../lib/coach/knowledge.ts", import.meta.url), "utf8");
const BONUS_CTX = readFileSync(new URL("../../lib/coach/bonusContext.ts", import.meta.url), "utf8");
const BONUS_PROMPT = readFileSync(new URL("../../lib/prompts/bonus.ts", import.meta.url), "utf8");

// ── Les deux blocs arrivent vraiment dans le prompt ──────────────────
// Un bloc écrit et non branché ne protège personne : c'est exactement
// la panne du 22 août (des garde-fous restés sur une branche pendant
// que la doc les décrivait comme actifs).

test("les deux blocs sont branches dans le prompt du coach", () => {
  assert.ok(
    KNOWLEDGE.includes('from "./systemeIo"'),
    "le module n'est pas importe : le coach ne verra jamais ces regles",
  );
  assert.ok(KNOWLEDGE.includes("${SYSTEME_IO_PAGE_TYPES_RULES}"));
  assert.ok(KNOWLEDGE.includes("${SYSTEME_IO_BUILD_RULES}"));
});

// ── Le réflexe : demander le type de page AVANT d'expliquer ──────────

test("le coach demande le type de page avant d'expliquer la manipulation", () => {
  assert.ok(
    SYSTEME_IO_PAGE_TYPES_RULES.includes("AVANT D'EXPLIQUER OÙ CLIQUER, DEMANDE SUR QUEL TYPE DE PAGE IL EST"),
    "sans ce reflexe, le coach explique un bouton qui n'est pas sur son ecran",
  );
});

test("le cas de la page info est nomme, et la sortie aussi", () => {
  assert.ok(SYSTEME_IO_PAGE_TYPES_RULES.includes("PAGE INFO"));
  assert.ok(
    SYSTEME_IO_PAGE_TYPES_RULES.includes("PAGE DE REMERCIEMENT"),
    "nommer le blocage sans donner la sortie laisse l'eleve au meme endroit",
  );
});

test("le type decide, le nom ne decide de rien", () => {
  assert.ok(SYSTEME_IO_PAGE_TYPES_RULES.includes("CE QUI DÉCIDE, C'EST LE TYPE, PAS LE NOM"));
  assert.ok(
    /renomme/i.test(SYSTEME_IO_PAGE_TYPES_RULES),
    "Bene demande explicitement qu'il conseille de RENOMMER la page de remerciement",
  );
});

test("le coach ne recite aucune liste d'elements par type de page", () => {
  // Une liste ecrite ici se perimerait au premier changement de
  // Systeme.io, sans que rien ne le signale, et le coach l'affirmerait
  // encore un an plus tard. Il demande, il compare, il n'enumere pas.
  assert.ok(SYSTEME_IO_PAGE_TYPES_RULES.includes("tu ne récites pas la liste des éléments"));
  assert.ok(SYSTEME_IO_PAGE_TYPES_RULES.includes("comparer"));
});

test("il ne fait jamais accuser un bug de Systeme.io", () => {
  assert.ok(SYSTEME_IO_PAGE_TYPES_RULES.includes("ne dis jamais que c'est un bug de Systeme.io"));
});

// ── Le plan de montage ───────────────────────────────────────────────

test("demander la carte n'est pas demander un diagnostic", () => {
  // Sans cette phrase, la regle "UN SEUL CONSEIL A LA FOIS" de
  // STATS_READING_RULES contredit ce bloc, et le coach repond par trois
  // lignes a quelqu'un qui a besoin des sept.
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("LE PLAN NUMÉROTÉ EST LA BONNE RÉPONSE"));
  assert.ok(SYSTEME_IO_BUILD_RULES.includes('seule exception à la règle "un seul conseil à la fois"'));
  assert.ok(KNOWLEDGE.includes("UN SEUL CONSEIL À LA FOIS"), "la regle qu'on excepte doit exister");
});

test("le produit donne l'acces, l'automatisation envoie les emails", () => {
  // Verifie dans l'API Systeme.io le 25 aout 2026 : un produit livre a
  // la fois `membership_course` et `systemeio_tag`. C'est ce qui rend
  // inutile l'automatisation que l'eleve croit devoir ecrire.
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("Le PRODUIT donne l'accès au cours et pose le tag lui-même"));
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("L'AUTOMATISATION : elle envoie les EMAILS. Elle ne donne pas l'accès."));
});

test("trois fichiers vendus ensemble font UN produit", () => {
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("UN SEUL PRODUIT, PAS TROIS"));
});

test("les cinq pieces sont nommees et l'ordre de montage est donne", () => {
  for (const piece of ["LE CONTENU", "LE PRODUIT", "LE PLAN TARIFAIRE", "LA PAGE QUI VEND", "L'AUTOMATISATION"]) {
    assert.ok(SYSTEME_IO_BUILD_RULES.includes(piece), `piece manquante : ${piece}`);
  }
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("L'ORDRE DE MONTAGE D'UNE OFFRE PAYANTE"));
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("BONUS GRATUIT REMIS APRÈS UN PARTAGE"));
});

test("un tag d'action n'est pas un profil", () => {
  // La confusion exacte de l'eleve : "cette offre est pour tous les
  // profils sauf le tag quiz-partage". Les deux livraisons repondent a
  // deux actions differentes, et la meme personne peut recevoir les deux.
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("UN TAG D'ACTION N'EST PAS UN PROFIL"));
});

test("le critere page ou cours est donne, pas laisse au hasard", () => {
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("LE CRITÈRE POUR TRANCHER ENTRE PAGE ET COURS"));
  assert.ok(
    SYSTEME_IO_BUILD_RULES.includes("PUBLIQUE pour qui a l'adresse"),
    "une page de remerciement se transfere : l'eleve doit le savoir avant de choisir",
  );
});

test("il fait tester le parcours complet, avec une autre adresse", () => {
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("navigation privée"));
  assert.ok(SYSTEME_IO_BUILD_RULES.includes("AUTRE adresse email"));
});

// ── Les deux moities de la meme decision ─────────────────────────────
// Le guide de creation du bonus disait de coller le HTML dans "une page
// de blog, ou une page de tunnel", sans dire QUEL type de page. C'est
// exactement le mur ou l'eleve s'est cogne. Corriger le reflexe du coach
// sans corriger le guide qu'il a en main laisserait deux marches a
// suivre contradictoires, et c'est la version ecrite qu'on suit.

test("le guide du bonus ne renvoie plus vers n'importe quelle page de tunnel", () => {
  for (const [nom, src] of [["lib/prompts/bonus.ts", BONUS_PROMPT], ["lib/coach/bonusContext.ts", BONUS_CTX]] as const) {
    assert.ok(
      /page info/i.test(src),
      `${nom} envoie encore coller du HTML sans nommer le type de page qui refuse le bloc de code`,
    );
    assert.ok(/remerciement/i.test(src), `${nom} ne donne pas la sortie`);
  }
});

// ── Ce que le coach a sous les yeux finit chez l'eleve ───────────────

test("aucun tiret cadratin dans ces deux blocs", () => {
  const tout = SYSTEME_IO_PAGE_TYPES_RULES + SYSTEME_IO_BUILD_RULES;
  assert.ok(!/[—–]/.test(tout), "un em-dash dans le prompt ressort dans la reponse a l'eleve");
});

test("aucun accord au feminin dans l'adresse a l'eleve", () => {
  // On ne vend pas qu'a des femmes, et l'eleve lit ce que le coach
  // ecrit. Le prompt parle de l'eleve au masculin generique ("il"), donc
  // aucune forme accordee ne doit trainer.
  const tout = SYSTEME_IO_PAGE_TYPES_RULES + SYSTEME_IO_BUILD_RULES;
  assert.ok(!/\b(prête|inscrite|connectée|déconnectée)\b/i.test(tout));
});

// ── Le code collé dans une page Systeme.io ──────────────────────────
//
// Béné, 25 août 2026 : "pas de balises html ou body, chargement
// dynamique des pages etc... il ne doit jamais proposer de créer un
// serveur ou autre non plus, juste un truc simple."
//
// Le prompt disait "UN SEUL fichier HTML autonome", ce qui est par
// définition un document avec <html> et <body>. Collé dans un bloc de
// code, son CSS repeint la page de vente autour.

import {
  SYSTEME_IO_BLOC_CONTRAINTES,
  SYSTEME_IO_BLOC_DEPANNAGE,
} from "../../lib/prompts/systemeIoBloc.ts";

const BONUS_PROMPT_SRC = readFileSync(new URL("../../lib/prompts/bonus.ts", import.meta.url), "utf8");

test("les contraintes du bloc de code sont ecrites a UN seul endroit", () => {
  assert.ok(
    BONUS_PROMPT_SRC.includes("SYSTEME_IO_BLOC_CONTRAINTES"),
    "le generateur doit importer la regle, pas en recopier une version",
  );
  assert.ok(KNOWLEDGE.includes("${SYSTEME_IO_BLOC_DEPANNAGE}"), "le coach ne voit pas le depannage");
});

test("le code produit est un MORCEAU de page, jamais un document", () => {
  assert.ok(SYSTEME_IO_BLOC_CONTRAINTES.includes("CE N'EST PAS UNE PAGE, C'EST UN MORCEAU DE PAGE"));
  for (const balise of ["<!DOCTYPE>", "<html>", "<head>", "<body>"]) {
    assert.ok(SYSTEME_IO_BLOC_CONTRAINTES.includes(balise), `balise non interdite : ${balise}`);
  }
});

test("le CSS est porte par un identifiant, jamais par une regle nue", () => {
  assert.ok(SYSTEME_IO_BLOC_CONTRAINTES.includes("CHAQUE REGLE CSS COMMENCE PAR CET IDENTIFIANT"));
  assert.ok(
    /bouton d'achat/.test(SYSTEME_IO_BLOC_CONTRAINTES),
    "dire la CONSEQUENCE (sa page repeinte) fait tenir la regle mieux que la regle seule",
  );
});

test("le script ne peut pas attendre un evenement deja passe", () => {
  // La panne silencieuse : la page charge son contenu dynamiquement,
  // donc DOMContentLoaded est souvent deja tire quand le bloc s'execute.
  // Le script ne demarre jamais, sans un mot dans la console.
  assert.ok(SYSTEME_IO_BLOC_CONTRAINTES.includes("N'attends ni DOMContentLoaded ni window.onload"));
  assert.ok(SYSTEME_IO_BLOC_DEPANNAGE.includes("DOMContentLoaded"));
});

test("jamais de serveur, d'API, d'installation ni d'etape de build", () => {
  for (const interdit of ["AUCUN SERVEUR", "aucune API", "aucune installation", "pas de npm", "pas de terminal"]) {
    assert.ok(SYSTEME_IO_BLOC_CONTRAINTES.includes(interdit), `pas interdit : ${interdit}`);
  }
  assert.ok(SYSTEME_IO_BLOC_DEPANNAGE.includes("monter un serveur"));
});

test("le depannage part des SYMPTOMES, pas de la liste des regles", () => {
  // L'eleve arrive par ce qu'il voit, pas par ce qu'il a enfreint.
  assert.ok(SYSTEME_IO_BLOC_DEPANNAGE.includes("MON ENCART EST VIDE"));
  assert.ok(SYSTEME_IO_BLOC_DEPANNAGE.includes("MA PAGE EST TOUTE DÉFORMÉE"));
});

test("aucun tiret cadratin dans ces deux blocs non plus", () => {
  assert.ok(!/[—–]/.test(SYSTEME_IO_BLOC_CONTRAINTES + SYSTEME_IO_BLOC_DEPANNAGE));
});
