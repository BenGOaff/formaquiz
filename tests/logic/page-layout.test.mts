// tests/logic/page-layout.test.mts
//
// Béné, 5 août 2026 : "il faut renommer campagne dans le menu, personne
// comprend ce que c'est", "même largeur de contenu que pour le reste",
// "système d'onglets comme les réglages pour trouver plus facilement",
// "et tout occupe aussi la même largeur que les autres pages : même
// padding, mêmes marges".
//
// Ces trois choses se défont toutes seules au premier écran suivant :
// quelqu'un recolle un `max-w-3xl` pour "aérer", ou réécrit une barre
// d'onglets à la main parce qu'elle n'est pas exportée. Ce fichier les
// fige.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// ── Le nom dans le menu ──────────────────────────────────────────────

test("le menu ne dit plus Campagne", () => {
  const nav = read("../../components/AppHeader.tsx");
  assert.doesNotMatch(nav, /label: "Campagne"/);
  assert.match(nav, /href: "\/funnel", label: "Bonus"/);
});

// ── La largeur, et d'où elle vient ───────────────────────────────────

test("les marges et le padding vivent dans le layout, une seule fois", () => {
  const layout = read("../../app/(app)/layout.tsx");
  assert.match(layout, /<main className="container flex-1 py-8">/);
});

test("la page Bonus ne se bride plus toute seule", () => {
  // Elle portait un `mx-auto max-w-3xl` quand le tableau de bord, les
  // avancées, l'affiliation et les jours prennent toute la largeur du
  // container commun. C'est ce décalage qu'elle voyait.
  // On lit le JSX, pas le fichier : un commentaire qui cite l'ancienne
  // classe ne doit pas faire rougir le test. Un test qui rougit pour la
  // mauvaise raison finit par etre desactive.
  const page = read("../../app/(app)/funnel/page.tsx");
  const root = page.slice(page.indexOf("return ("));
  const firstClass = root.match(/className="([^"]*)"/)?.[1] ?? "";
  assert.doesNotMatch(firstClass, /max-w-/);
  assert.doesNotMatch(firstClass, /mx-auto/);
});

test("AUCUNE page de l'espace membre ne se bride toute seule", () => {
  // "Oui il faut mettre la même largeur partout même pour les réglages"
  // (Béné, 5 août 2026). Carnet, Profil et Certificat portaient chacun
  // leur propre borne : trois largeurs différentes sur quatre écrans,
  // et l'impression que l'un est plus important que l'autre.
  const dir = fileURLToPath(new URL("../../app/(app)/", import.meta.url));
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let src: string;
    try {
      src = readFileSync(`${dir}${entry.name}/page.tsx`, "utf8");
    } catch {
      continue;
    }
    // La RACINE du rendu, pas le fichier : une carte centrée à
    // l'intérieur d'un écran reste legitime.
    const root = src.slice(src.indexOf("return ("));
    const firstClass = root.match(/className="([^"]*)"/)?.[1] ?? "";
    assert.doesNotMatch(firstClass, /max-w-/, `${entry.name} se bride`);
    assert.doesNotMatch(firstClass, /mx-auto/, `${entry.name} se centre`);
  }
});

test("le labo bonus se cale sur le même gabarit", () => {
  const page = read("../../app/(app)/labo-bonus/page.tsx");
  const client = read("../../app/(app)/labo-bonus/BonusLabClient.tsx");
  for (const src of [page, client]) {
    // Aucun conteneur de largeur a lui : il herite du layout.
    assert.doesNotMatch(src.split("return (")[1] ?? "", /className="[^"]*mx-auto[^"]*max-w/);
  }
});

test("aucune page de l'espace membre ne redefinit le padding lateral", () => {
  // Le padding est dans le container Tailwind (1.25rem, 2.5rem des md).
  // Une page qui rajoute le sien produit exactement le decalage que Bene
  // a signale, et il devient invisible tant qu'on ne compare pas deux
  // pages cote a cote.
  const dir = fileURLToPath(new URL("../../app/(app)/", import.meta.url));
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let src: string;
    try {
      src = readFileSync(`${dir}${entry.name}/page.tsx`, "utf8");
    } catch {
      continue;
    }
    const root = src.slice(src.indexOf("return ("));
    const firstDiv = root.slice(0, 400);
    assert.doesNotMatch(
      firstDiv,
      /className="[^"]*\bpx-\d/,
      `${entry.name} ne doit pas reposer son padding lateral`,
    );
  }
});

// ── Les onglets ──────────────────────────────────────────────────────

test("la barre d'onglets est ecrite UNE fois", () => {
  // Le motif etait enferme dans ProfileTabs. Le recopier sur un
  // deuxieme ecran, c'est la garantie que les deux finissent par ne
  // plus se ressembler.
  const bar = read("../../components/TabBar.tsx");
  assert.match(bar, /export function TabBar/);
  assert.match(bar, /export function TabButton/);
  for (const f of ["../../app/(app)/profil/ProfileTabs.tsx", "../../app/(app)/funnel/FunnelClient.tsx"]) {
    const src = read(f);
    assert.match(src, /from "@\/components\/TabBar"/, `${f} doit utiliser la barre commune`);
    assert.doesNotMatch(src, /^function TabButton\(/m, `${f} ne doit plus en definir une`);
  }
});

test("la page Bonus a ses trois onglets", () => {
  const src = read("../../app/(app)/funnel/FunnelClient.tsx");
  assert.match(src, /type Tab = "emails" \| "promo" \| "modeles"/);
  for (const label of ["Emails", "Promo du quiz", "Modèles"]) {
    assert.ok(src.includes(label), `l'onglet ${label} doit exister`);
  }
});

test("un onglet vide dit pourquoi il est vide", () => {
  // Sans cette phrase, elle clique sur Modèles, ne voit rien, et
  // conclut que c'est cassé.
  const src = read("../../app/(app)/funnel/FunnelClient.tsx");
  assert.match(src, /Aucun modèle disponible pour le moment/);
});

// ── Le générateur de bonus est ouvert (5 août 2026) ──────────────────

test("son onglet est visible par tout le monde", () => {
  // "Ok c'est cool on envoie pour les users." Il a vecu deux jours
  // derriere un `isAdmin`, le temps de verifier sa sortie.
  const client = read("../../app/(app)/funnel/FunnelClient.tsx");
  const i = client.indexOf("/labo-bonus");
  assert.ok(i > 0, "l'onglet existe");
  assert.doesNotMatch(client.slice(Math.max(0, i - 400), i), /\{isAdmin && \(/);
});

test("il vit dans les onglets de la page Bonus, pas dans le menu", () => {
  // Une entree de plus dans la navigation principale pour un outil qui
  // appartient a la meme famille (emails, promo, modeles) eparpillerait
  // ce qui vient d'etre regroupe.
  assert.doesNotMatch(read("../../components/AppHeader.tsx"), /labo-bonus/);
});

test("les DEUX branches de la page recoivent les memes proprietes", () => {
  // La page rend FunnelClient deux fois : verrouillee (palier 7 euros)
  // et libre. Une propriete ajoutee a une seule des deux est exactement
  // le defaut que ce repo corrige en boucle, et il ne se voit que pour
  // les eleves qui sont du mauvais cote du verrou.
  //
  // Le test porte sur l'EGALITE des deux appels, pas sur une propriete
  // en particulier : il survit donc a celles qui vont et viennent.
  const page = read("../../app/(app)/funnel/page.tsx");
  const appels = [...page.matchAll(/<FunnelClient([\s\S]*?)\/>/g)].map((m) =>
    [...m[1].matchAll(/(\w+)=\{/g)].map((x) => x[1]).sort().join(","),
  );
  assert.equal(appels.length, 2, "la page rend FunnelClient deux fois");
  assert.equal(appels[0], appels[1]);
  assert.ok(appels[0].length > 0, "les appels passent bien des proprietes");
});
