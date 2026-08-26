// tests/logic/google-tools.test.mts
//
// LE JETON DE PROPRIÉTÉ GOOGLE, DES DEUX CÔTÉS.
//
// Béné, 26 août 2026 : "tu peux ajouter ça pour que je puisse suivre les
// performances sur les outils Google ?"
//
// LE PIÈGE, ET IL EST ENTIER : cette app sert son HTML par deux chemins
// qui n'ont rien en commun. Les écrans de l'espace membre passent par
// `app/layout.tsx` ; **la page de vente `atelierduquiz.fr` est servie
// par un route handler** qui renvoie le HTML capturé, sans jamais
// toucher ce layout.
//
// Poser la balise dans le seul layout, le réflexe évident, ne l'aurait
// donc jamais mise sur le domaine qu'on cherche à vérifier. Et Search
// Console aurait répondu "balise introuvable" sur une page où l'on croit
// l'avoir mise.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  baliseVerificationGoogle,
  GA_MEASUREMENT_ID,
  ID_MESURE_HISTORIQUE,
  remplacerIdMesure,
  GOOGLE_SITE_VERIFICATION,
  scriptAnalyticsGoogle,
} from "@/lib/analytics/google";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

test("le jeton a la bonne forme et n'est écrit qu'une fois", () => {
  assert.ok(GOOGLE_SITE_VERIFICATION.length >= 20, "jeton trop court pour etre valide");
  assert.ok(baliseVerificationGoogle().includes(GOOGLE_SITE_VERIFICATION));
  assert.match(
    baliseVerificationGoogle(),
    /^<meta name="google-site-verification" content="[^"]+">$/,
  );
});

test("LA PAGE DE VENTE le porte, alors qu'elle ignore le layout", () => {
  const src = lire("lib/sales/servePage.ts");
  assert.match(
    src,
    /baliseVerificationGoogle\(\)/,
    "atelierduquiz.fr n'aurait aucune balise : la vérification échouerait sans qu'on sache pourquoi",
  );
});

test("l'espace membre, lui, ne le porte PAS", () => {
  // Béné : "je m'en fous de faire ranker les app." L'espace membre est
  // derrière une connexion et déjà en `noindex` : le jeton n'y sert à
  // rien, et il n'a rien à faire dans le HTML d'un écran de travail.
  const src = lire("app/layout.tsx");
  assert.match(src, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(src, /verification:/);
});

test("la mesure a SON identifiant, pas celui de Tiquiz", () => {
  // Deux produits, deux propriétés. Se tromper enverrait les visites de
  // l'un dans les chiffres de l'autre, et rien ne le signalerait avant
  // qu'un rapport devienne absurde.
  assert.match(GA_MEASUREMENT_ID, /^G-[A-Z0-9]{6,}$/);
  assert.notEqual(GA_MEASUREMENT_ID, "G-N6LQDRDMDB", "c'est l'identifiant de Tiquiz");
  assert.ok(scriptAnalyticsGoogle().includes(GA_MEASUREMENT_ID));
  const script = scriptAnalyticsGoogle();
  assert.equal((script.match(/<script/g) ?? []).length, 2);
  assert.equal((script.match(/<\/script>/g) ?? []).length, 2);
});

test("la page de vente la porte, l'aperçu derrière la clé non", () => {
  const src = lire("lib/sales/servePage.ts");
  assert.match(src, /remplacerIdMesure\(/, "l'identifiant ne serait plus pose sur la page de vente");
  assert.match(src, /analytics: boolean;/);
  // Déduire `analytics` de `indexable` marcherait aujourd'hui et
  // casserait au premier cas où l'on veut mesurer sans indexer.
  assert.doesNotMatch(src, /analytics: opts\.indexable/);
  assert.match(lire("app/apercu/vente/[slug]/route.ts"), /analytics: publique/);
});

// ── LE CONSENTEMENT : ON RÉÉCRIT DANS LE BANDEAU, ON N'AJOUTE PAS ──

test("l'identifiant est remplacé DANS le bandeau cookies de la page", () => {
  // La page capturée porte déjà le bandeau de Béné, qui ne charge GA4
  // qu'après consentement. Ajouter notre balise par dessus le
  // contournerait, sur la page même où elle demande ce consentement.
  const page = `<script>var CFG = {\n    ga     : '${ID_MESURE_HISTORIQUE}',\n    pixel  : '',\n};</script>`;
  const r = remplacerIdMesure(page, GA_MEASUREMENT_ID);
  assert.equal(r.remplace, true);
  assert.ok(r.html.includes(`'${GA_MEASUREMENT_ID}'`));
  assert.ok(!r.html.includes(ID_MESURE_HISTORIQUE), "l'ancien identifiant est reste");
  // Et le reste du bandeau n'est pas touché.
  assert.ok(r.html.includes("pixel  : ''"));
});

test("une page SANS bandeau le dit, au lieu de le deviner", () => {
  // `remplace: false` ne se déduit PAS d'une chaîne inchangée : une page
  // dont l'identifiant est déjà le bon rendrait exactement le même HTML.
  const r = remplacerIdMesure("<html><head></head><body>x</body></html>", GA_MEASUREMENT_ID);
  assert.equal(r.remplace, false);
  const deja = remplacerIdMesure(`<script>ga : '${GA_MEASUREMENT_ID}',</script>`, GA_MEASUREMENT_ID);
  assert.equal(deja.remplace, true, "un identifiant deja bon reste un remplacement reussi");
});

test("le rendu ne pose PAS deux balises Google sur une page", () => {
  const src = lire("lib/sales/servePage.ts");
  assert.match(src, /remplacerIdMesure\(sortie, GA_MEASUREMENT_ID\)/);
  // La balise brute n'est posée QUE si le bandeau est absent, et ça crie.
  assert.match(src, /if \(!rec\.remplace\)/);
  assert.match(src, /aucun bandeau cookies dans la page/);
});
