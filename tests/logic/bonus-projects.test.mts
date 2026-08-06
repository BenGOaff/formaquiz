// tests/logic/bonus-projects.test.mts
//
// Béné, 6 août 2026 : "un truc pas super logique : le générateur de bonus
// est top MAIS on ne peut pas retrouver ce qu'on a créé ? On peut faire
// en sorte que l'étudiant puisse retrouver ce qu'il a créé directement ?
// En plus du générateur actuel pour en générer d'autres."
//
// C'était pire que "on ne retrouve pas" : RIEN n'était enregistré. Le
// brief, les pistes et les trois documents vivaient dans la mémoire de
// la page. Rafraîchir l'onglet, suivre un lien, fermer le portable :
// plusieurs minutes de génération disparaissaient sans un mot.
//
// Puis, dans la foulée : "aussi le coach doit voir les bonus créés, et
// guider la mise en oeuvre, EN ACCORD AVEC LE PROMPT QUI LE GÉNÈRE pour
// que ce soit des conseils cohérents." C'est la deuxième moitié qui est
// fragile, et c'est elle que la fin de ce fichier garde.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  UNTITLED,
  projectProgress,
  projectTitle,
  sanitizeProject,
  worthSaving,
} from "../../lib/bonus/project.ts";
import { bonusContextBlock, BONUS_IMPLEMENTATION_RULES, type CoachBonusRow } from "../../lib/coach/bonusContext.ts";

const lire = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

// ── Le nom sous lequel on le retrouve ────────────────────────────────

test("le titre de la piste retenue nomme le bonus", () => {
  // C'est le nom du bonus lui-meme, donc celui que l'eleve reconnait.
  assert.equal(
    projectTitle({ chosen: { title: "Le calculateur de ton budget reel" } }),
    "Le calculateur de ton budget reel",
  );
});

test("sans piste choisie, on prend sa promesse d'offre", () => {
  // Il vient de l'ecrire de sa main : c'est ce qu'il reconnaitra ensuite.
  assert.equal(
    projectTitle({ brief: { offers: [{ promise: "J'aide les TDAH a apaiser leur stress" }] } }),
    "J'aide les TDAH a apaiser leur stress",
  );
});

test("sans rien d'autre, le quiz sert de repere", () => {
  assert.equal(projectTitle({ quizTitle: "Quel entrepreneur es-tu ?" }), 'Bonus pour "Quel entrepreneur es-tu ?"');
});

test("le titre n'est JAMAIS vide", () => {
  // Un bonus qui s'appelle "" dans une liste est un bonus qu'on ne
  // retrouve pas, c'est a dire exactement le probleme qu'on corrige.
  assert.equal(projectTitle({}), UNTITLED);
  assert.equal(projectTitle({ chosen: { title: "  " }, brief: { offers: [{ promise: "ab" }] } }), UNTITLED);
});

test("une promesse tres longue est coupee sur un mot", () => {
  const long = "J'accompagne les therapeutes independantes a remplir leur agenda sans passer leurs journees sur les reseaux sociaux et sans publicite";
  const t = projectTitle({ brief: { offers: [{ promise: long }] } });
  assert.ok(t.length <= 70, `titre trop long : ${t.length}`);
  assert.ok(t.endsWith("..."));
  // Coupe sur un mot, pas au milieu : sinon la liste affiche des moities
  // de mots. On verifie la VRAIE propriete (le dernier mot existe tel
  // quel dans la promesse), pas la presence d'une espace avant les
  // points : en francais, "leur agenda..." est correct, "leur agenda ..."
  // ne l'est pas.
  const dernier = t.replace(/\.\.\.$/, "").split(/\s+/).pop() ?? "";
  assert.ok(long.split(/\s+/).includes(dernier), `"${dernier}" n'est pas un mot entier`);
});

// ── Ce qui est enregistré, et ce qui ne l'est pas ────────────────────

test("une page ouverte puis quittee ne cree pas de ligne", () => {
  // Sinon la liste se remplit de brouillons vides et le vrai bonus se
  // perd au milieu : on aurait remplace "je ne retrouve rien" par "je ne
  // retrouve pas le bon".
  assert.equal(worthSaving({ pistes: [], blocks: {} }), false);
  assert.equal(worthSaving({ pistes: [], blocks: { guide: "   " } }), false);
});

test("des pistes obtenues suffisent a enregistrer", () => {
  // C'est le premier ACTE de generation : a partir de la, un
  // rafraichissement d'onglet ne doit plus rien perdre.
  assert.equal(worthSaving({ pistes: [{}], blocks: {} }), true);
  assert.equal(worthSaving({ pistes: [], blocks: { guide: "# Mon guide" } }), true);
});

// ── Ce qui a le droit d'entrer en base ───────────────────────────────

test("une cle de bloc inventee est rejetee", () => {
  // Ces cles servent d'index dans l'ecran : une cle fantaisiste y
  // afficherait un dossier qui n'existe pas.
  const p = sanitizeProject({
    blocks: { guide: "ok", "content:2": "ok", __proto__: "x", evil: "x", "content:abc": "x" },
  });
  assert.deepEqual(Object.keys(p.blocks).sort(), ["content:2", "guide"]);
});

test("un bloc vide n'est pas garde", () => {
  const p = sanitizeProject({ blocks: { guide: "   ", presentation: "vrai" } });
  assert.deepEqual(Object.keys(p.blocks), ["presentation"]);
});

test("un document demesure est borne, pas refuse", () => {
  // Refuser ferait perdre le document ; borner garde l'essentiel.
  const p = sanitizeProject({ blocks: { guide: "a".repeat(500_000) } });
  assert.ok(p.blocks.guide.length <= 120_000);
});

test("n'importe quoi en entree rend une structure utilisable", () => {
  // La route ne doit jamais tomber sur `undefined.offers`.
  for (const entree of [null, undefined, 42, "texte", []]) {
    const p = sanitizeProject(entree);
    assert.ok(Array.isArray(p.brief.offers));
    assert.ok(Array.isArray(p.pistes));
    assert.equal(typeof p.blocks, "object");
  }
});

test("le brief garde ses champs sans liste blanche", () => {
  // Meme partage de responsabilites que `generator_briefs` : ajouter un
  // champ au generateur ne doit pas demander une migration.
  const p = sanitizeProject({
    brief: { offers: [{ promise: "x", kind: "formation en ligne", price: "97" }], trigger: "share", plan: "per_profile" },
  });
  assert.equal(p.brief.trigger, "share");
  assert.equal(p.brief.plan, "per_profile");
  assert.equal(p.brief.offers[0].promise, "x");
});

// ── Où en est ce bonus ───────────────────────────────────────────────

test("l'avancement se lit sans ouvrir les trois dossiers", () => {
  assert.equal(projectProgress({}, 0, false), "Piste choisie, rien de généré");
  assert.equal(projectProgress({ guide: "x" }, 0, false), "1 document sur 3");
  assert.equal(projectProgress({ guide: "x", content: "y", presentation: "z" }, 0, false), "Complet");
});

test("un contenu decline n'est pas 'complet' s'il manque des profils", () => {
  // Sinon on croit le bonus fini alors que trois profils n'ont rien a
  // recevoir.
  const b = { guide: "x", presentation: "z", "content:0": "y" };
  assert.match(projectProgress(b, 4, true), /sauf 3 profils/);
});

// ── Le coach voit ce qu'il a créé ────────────────────────────────────

const BONUS: CoachBonusRow = {
  title: "Le calculateur de ton budget reel",
  quiz_title: "Ou en est ta tresorerie ?",
  chosen: { format: "calculateur", title: "Le calculateur de ton budget reel", punchline: "En 3 minutes" },
  brief: {
    plan: "per_profile",
    trigger: "share",
    offers: [{ promise: "Je remets tes comptes a plat en 30 jours", kind: "accompagnement ou coaching", price: "490 euros" }],
  },
  blocks: { guide: "# guide", "content:0": "# contenu" },
  updated_at: "2026-08-06T09:00:00Z",
};

test("le coach recoit le titre, le format et l'offre visee", () => {
  const b = bonusContextBlock([BONUS]);
  assert.match(b, /Le calculateur de ton budget reel/);
  assert.match(b, /calculateur/);
  assert.match(b, /Je remets tes comptes a plat/);
  assert.match(b, /490 euros/);
});

test("le coach sait ce qui est ecrit et ce qui manque", () => {
  // Sans ca il conseille de generer ce qui existe deja, ou passe a cote
  // de ce qui manque.
  const b = bonusContextBlock([BONUS]);
  assert.match(b, /déjà généré[^;]*guide de création/);
  assert.match(b, /pas encore généré[^\n]*de quoi en parler/);
});

test("le coach sait quand le bonus est remis, et a qui", () => {
  const b = bonusContextBlock([BONUS]);
  assert.match(b, /remis après un PARTAGE/);
  assert.match(b, /décliné par profil/);
});

test("la livraison annoncee depend de la FORME du bonus", () => {
  // Un PDF vit sur un drive, un calculateur sur une page : lui donner la
  // mauvaise premiere etape, c'est l'envoyer bricoler pour rien.
  assert.match(bonusContextBlock([BONUS]), /bloc de code d'une page Systeme\.io/);
  const pdf = bonusContextBlock([{ ...BONUS, chosen: { format: "guide PDF" } }]);
  assert.match(pdf, /drive/);
  assert.match(pdf, /tout le monde avec le lien/);
});

test("aucun bonus cree : le bloc est VIDE", () => {
  // Un bloc "il n'a aucun bonus" pousserait le coach a en parler a chaque
  // echange, y compris quand l'eleve demande autre chose.
  assert.equal(bonusContextBlock([]), "");
  assert.equal(bonusContextBlock([{ ...BONUS, chosen: null, blocks: null }]), "");
});

test("le coach ne redige pas a la place du generateur", () => {
  const b = bonusContextBlock([BONUS]);
  assert.match(b, /ne se rédige PAS par toi/);
});

// ── Et il ne contredit JAMAIS le guide qu'il a en main ───────────────

test("la chaine de livraison du coach est celle du prompt de generation", () => {
  // C'est LE risque de la demande de Bene : un coach qui voit le bonus
  // mais improvise la mise en oeuvre donne une deuxieme marche a suivre,
  // et c'est la parlee qu'on suit.
  const prompt = lire("lib/prompts/bonus.ts");
  const regles = BONUS_IMPLEMENTATION_RULES;

  // Le declencheur est un TAG Systeme.io, dans les deux.
  assert.match(prompt, /Tag ajoute a un contact/);
  assert.match(regles, /Tag ajouté à un contact/);

  // L'interdiction centrale, dans les deux.
  assert.match(prompt, /N'ECRIS JAMAIS qu'il faut coller le lien dans les resultats du quiz/);
  assert.match(regles, /NE DIS JAMAIS de coller le lien du bonus dans la page de résultat/);

  // Plus aucune action manuelle, dans les deux.
  assert.match(prompt, /Plus aucune action manuelle/);
  assert.match(regles, /Plus aucune action manuelle/);
});

test("le tableur reste interdit des deux cotes", () => {
  const prompt = lire("lib/prompts/bonus.ts");
  assert.match(prompt, /INTERDIT de proposer un tableur \(Google Sheets, Excel\)/);
  assert.match(BONUS_IMPLEMENTATION_RULES, /NE SE MONTE PAS DANS UN TABLEUR/);
  assert.match(BONUS_IMPLEMENTATION_RULES, /Google Sheets/);
});

test("le partage du fichier en LECTURE est rappele des deux cotes", () => {
  // C'est le piege que la creatrice ne peut pas voir seule : elle a
  // acces au fichier, donc le lien restreint marche chez elle.
  const prompt = lire("lib/prompts/bonus.ts");
  assert.match(prompt, /tout le monde avec le lien/);
  assert.match(BONUS_IMPLEMENTATION_RULES, /tout le monde avec le lien/);
});

test("les regles de mise en oeuvre sont bien injectees dans le coach", () => {
  // Un fichier de regles qui n'est branche nulle part ne protege
  // personne.
  const k = lire("lib/coach/knowledge.ts");
  assert.match(k, /BONUS_IMPLEMENTATION_RULES/);
  const route = lire("app/api/coach/route.ts");
  assert.match(route, /bonusContextBlock\(/);
  assert.match(route, /from\("bonus_projects"\)/);
});

// ── L'écran et la route ──────────────────────────────────────────────

test("la sauvegarde est automatique, il n'y a pas de bouton Enregistrer", () => {
  // Un eleve qui vient d'attendre une generation ne doit pas avoir a
  // penser a la garder : s'il fallait y penser, on recreerait le probleme
  // pour tous ceux qui n'y pensent pas.
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /void save\(\{ pistes: nouvelles/);
  assert.match(c, /void save\(\{ blocks: suivants \}\)/);
  assert.doesNotMatch(c, />\s*Enregistrer\s*</);
});

test("un echec de sauvegarde ne fait jamais echouer une generation", () => {
  // Perdre la sauvegarde est ennuyeux ; perdre le document parce que la
  // sauvegarde a rate serait absurde.
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  const i = c.indexOf("const doSave = useCallback(");
  const j = c.indexOf("const save = useCallback(");
  assert.ok(i > 0 && j > i);
  assert.match(c.slice(i, j), /catch \{/);
});

test("deux sauvegardes concurrentes ne creent pas deux lignes", () => {
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /inFlight/);
});

test("les corrections a la main sont enregistrees aussi, mais pas a chaque frappe", () => {
  // Sinon : une requete par lettre. Et sans rien du tout, dix minutes de
  // relecture partent en fermant l'onglet, alors que l'ecran promet que
  // tout est garde.
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /setTimeout\(\(\) => void save\(\), 1500\)/);
});

test("la liste s'ouvre en premier, sauf pour un premier venu", () => {
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /initialProjects\.length > 0 \? "library" : "brief"/);
});

test("on peut en lancer un nouveau sans quitter l'ecran", () => {
  // "En plus du generateur actuel pour en generer d'autres" : les deux
  // moities de sa demande.
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /Créer un nouveau bonus/);
  assert.match(c, /function startNew\(\)/);
});

test("une suppression refusee produit un message visible", () => {
  // Drame du 3 aout : un `ok: false` silencieux envoie chercher au
  // mauvais endroit.
  const c = lire("app/(app)/labo-bonus/BonusLabClient.tsx");
  assert.match(c, /if \(!data\?\.ok\) \{\s*toast\.error\("La suppression n'a pas abouti/);
});

test("la liste ne charge pas les documents", () => {
  // Trois documents markdown par bonus, multiplies par le nombre de
  // bonus, pour afficher des titres.
  const r = lire("app/api/me/bonus/projects/route.ts");
  assert.match(r, /LIST_COLUMNS = "id, title, quiz_title, chosen, updated_at"/);
});

test("la route borne toujours sur l'utilisateur, en plus de la RLS", () => {
  const r = lire("app/api/me/bonus/projects/route.ts");
  const eqUser = r.match(/eq\("user_id", viewer\.userId\)/g) ?? [];
  assert.ok(eqUser.length >= 4, `attendu sur les 4 requetes, vu ${eqUser.length}`);
});

test("la migration existe, avec RLS et les 4 politiques", () => {
  const m = lire("supabase/migrations/20260806_bonus_projects.sql");
  assert.match(m, /create table if not exists public\.bonus_projects/);
  assert.match(m, /enable row level security/);
  for (const p of ["own_select", "own_insert", "own_update", "own_delete"]) {
    assert.match(m, new RegExp(`bonus_projects_${p}`), p);
  }
  // Sans politique UPDATE, la deuxieme sauvegarde echoue en silence.
  assert.match(m, /for update using \(auth\.uid\(\) = user_id\)/);
  assert.match(m, /notify pgrst, 'reload schema'/);
});

test("la table absente ne casse pas l'ecran", () => {
  // La migration peut ne pas encore etre appliquee en prod : le
  // generateur doit continuer de fonctionner (lecon `quiz_events.meta`).
  const r = lire("app/api/me/bonus/projects/route.ts");
  assert.match(r, /if \(error\) return NextResponse\.json\(\{ ok: true, projects: \[\], degraded: true \}\)/);
  const page = lire("app/(app)/labo-bonus/page.tsx");
  assert.match(page, /catch \{\s*return \[\];/);
});
