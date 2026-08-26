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
  GOOGLE_SITE_VERIFICATION,
  scriptAnalyticsGoogle,
  MEMOIRE_CONSENTEMENT_JOURS,
  CLE_CONSENTEMENT,
  scriptConsentementGoogle,
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
  assert.match(src, /scriptAnalyticsGoogle\(\)/, "la balise ne serait plus posee sur la page de vente");
  assert.match(src, /analytics: boolean;/);
  // Déduire `analytics` de `indexable` marcherait aujourd'hui et
  // casserait au premier cas où l'on veut mesurer sans indexer.
  assert.doesNotMatch(src, /analytics: opts\.indexable/);
  assert.match(lire("app/apercu/vente/[slug]/route.ts"), /analytics: publique/);
});

// ── LA BALISE EST CELLE DE GOOGLE, AU CARACTERE PRES ──

test("le bloc rendu est EXACTEMENT celui que Google donne", () => {
  // Bene a colle ce bloc trois fois. Le recopier tel quel n'est pas de
  // la paresse : c'est ce qui permet de comparer d'un coup d'oeil ce que
  // Google affiche et ce que la page sert.
  const attendu = [
    "<!-- Google tag (gtag.js) -->",
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
    "<script>",
    "  window.dataLayer = window.dataLayer || [];",
    "  function gtag(){dataLayer.push(arguments);}",
    "  gtag('js', new Date());",
    "",
    `  gtag('config', '${GA_MEASUREMENT_ID}');`,
    "</script>",
  ].join("\n");
  assert.equal(scriptAnalyticsGoogle(), attendu);
});

test("la page de vente pose la balise ENTIERE, pas seulement le src", () => {
  // La version d'avant reecrivait l'identifiant dans le bandeau cookies
  // au lieu de poser la balise. Defendable, et pas ce qui etait demande.
  const src = lire("lib/sales/servePage.ts");
  assert.match(src, /opts\.analytics \? scriptAnalyticsGoogle\(\) : ""/);
  assert.doesNotMatch(src, /remplacerIdMesure/, "on ne reecrit plus le bandeau de Bene");
});

// -- LE CONSENTEMENT (26 août 2026) -----------------------------------

test("la balise ne dépose RIEN avant accord", () => {
  const c = scriptConsentementGoogle();
  assert.match(c, /gtag\('consent', 'default'/, "l'état par défaut doit être posé");
  assert.match(c, /analytics_storage: 'denied'/, "refusé par défaut");
  assert.match(c, /gtag\('consent', 'update', \{ analytics_storage: 'granted' \}\)/);
});

test("le consentement est posé AVANT la balise, jamais après", () => {
  // `consent default` arrivé après le chargement de la balise ne sert à
  // rien : elle a déjà écrit ses cookies.
  const page = [scriptConsentementGoogle(), scriptAnalyticsGoogle()].join("\n");
  assert.ok(
    page.indexOf("consent', 'default'") < page.indexOf("googletagmanager.com/gtag/js"),
    "l'ordre est inversé",
  );
});

test("on relit la clé et la mémoire du bandeau, pas les nôtres", () => {
  const c = scriptConsentementGoogle();
  assert.match(c, new RegExp(`var CLE = '${CLE_CONSENTEMENT}'`));
  assert.match(c, new RegExp(`var MEMOIRE = ${MEMOIRE_CONSENTEMENT_JOURS}`));
  // Un accord expiré côté bandeau doit expirer chez nous aussi.
  assert.match(c, /Date\.now\(\) - o\.t > MEMOIRE \* 864e5/);
});

test("tout ce qui n'est pas un OUI franc est un NON", () => {
  const c = scriptConsentementGoogle();
  assert.match(c, /o\.mesure === true/, "une valeur approchante ne suffit pas");
  assert.match(c, /catch \(e\) \{ return false; \}/, "stockage bloqué = pas de mesure");
});

test("la balise elle même reste INTACTE", () => {
  // Le mode Consentement existe précisément pour ne pas y toucher.
  const b = scriptAnalyticsGoogle();
  assert.match(b, /<!-- Google tag \(gtag\.js\) -->/);
  assert.match(b, new RegExp(`gtag\\('config', '${GA_MEASUREMENT_ID}'\\);`));
});
