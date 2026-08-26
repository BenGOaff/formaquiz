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
  GOOGLE_SITE_VERIFICATION,
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

test("aucune mesure d'audience n'est posée ici", () => {
  // Béné n'a donné d'identifiant GA que pour Tiquiz. En inventer un
  // pour l'Atelier enverrait ses visites dans la mauvaise propriété.
  const src = lire("lib/analytics/google.ts");
  assert.doesNotMatch(src, /googletagmanager|gtag\(/);
});
