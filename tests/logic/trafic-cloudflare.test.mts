// tests/logic/trafic-cloudflare.test.mts
//
// « MON TRAFIC N'EST ABSOLUMENT PAS TRACKÉ » (Béné, 18 septembre 2026)
//
// Trouvé chez Tiquiz, et ce dépôt portait EXACTEMENT le même défaut :
// un garde-fou qui ne protège qu'un des deux jumeaux ne protège
// personne. Mesuré ici le même jour.
//
// La cause, mesurée le jour même sur la production :
//
//   curl -sS -o /dev/null -D - https://atelierduquiz.fr/ -H "accept: text/html"
//   -> cache-control: max-age=300
//   -> cf-cache-status: HIT      age: 9
//
// Cloudflare répond à la place du serveur. Le middleware ne tourne pas.
// La vue n'existe nulle part. Onze jours.
//
// Ce fichier tient le garde-fou du correctif : le compteur vit dans le
// navigateur. L'écran, lui, est chez Tiquiz, et son garde-fou aussi
// (`tests/logic/trafic-cloudflare.test.mts` là-bas).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { vueNavigateurASignaler } from "../../lib/trafic/vueNavigateur.ts";

const NOS_HOTES = {
  "atelierduquiz.fr": "atelier-du-quiz",
  "www.atelierduquiz.fr": "atelier-du-quiz",
} as const;
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function lire(chemin: string): string {
  return readFileSync(new URL(`../../${chemin}`, import.meta.url), "utf8");
}

// ------------------------------------------------ ce qui compte, ou pas

test("un vrai visiteur sur une de nos pages compte", () => {
  const v = vueNavigateurASignaler({
    hote: "atelierduquiz.fr",
    chemin: "/blog/avis-tiquiz",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: true, hote: "atelierduquiz.fr", chemin: "/blog/avis-tiquiz" });
});

test("le port ne change pas l'hôte, et la casse non plus", () => {
  const v = vueNavigateurASignaler({
    hote: "ATELIERDUQUIZ.FR:443",
    chemin: "/",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.equal(v.compte && v.hote, "atelierduquiz.fr");
});

test("un hôte qui n'est pas à nous ne compte pas", () => {
  const v = vueNavigateurASignaler({
    hote: "quizing.tipote.com",
    chemin: "/dashboard",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: false, raison: "hote_inconnu" });
});

test("une page TIERCE qui appellerait notre adresse ne compte pas", () => {
  for (const site of ["cross-site", "same-site", "none"]) {
    const v = vueNavigateurASignaler({
      hote: "atelierduquiz.fr",
      chemin: "/",
      secFetchSite: site,
      // Son `origin` la désigne, elle, et pas nous.
      origin: "https://un-site-tiers.example",
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "hors_site" }, site);
  }
});

test("SAFARI ANCIEN COMPTE QUAND MÊME, et c'est une faute que j'ai faite", () => {
  // Mon premier jet n'acceptait que `sec-fetch-site`. Safari ne le pose
  // que depuis la version 16.4 : tous les visiteurs d'un iPhone un peu
  // ancien auraient été refusés en silence, et le compteur aurait
  // recommencé à sous compter. C'est le défaut qu'on répare.
  //
  // Un POST porte TOUJOURS `origin`, même same-origin, dans tous les
  // navigateurs. C'est la deuxième preuve.
  const v = vueNavigateurASignaler({
    hote: "atelierduquiz.fr",
    chemin: "/tarifs",
    secFetchSite: null,
    origin: "https://atelierduquiz.fr",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 Version/15.6 Mobile Safari/604.1",
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: true, hote: "atelierduquiz.fr", chemin: "/tarifs" });
});

test("un `origin` qui n'est pas le nôtre ne vaut pas preuve", () => {
  for (const origin of ["https://atelierduquiz.fr.attaquant.example", "pas-une-url", "https://www.atelierduquiz.fr"]) {
    const v = vueNavigateurASignaler({
      hote: "atelierduquiz.fr",
      chemin: "/",
      secFetchSite: null,
      origin,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "hors_site" }, origin);
  }
});

test("les DEUX preuves absentes : refusé, jamais toléré", () => {
  // Le sens du repli : une vue ratée est une ligne en moins, une vue
  // inventée est une décision prise sur un chiffre faux.
  for (const absent of [null, undefined, ""]) {
    const v = vueNavigateurASignaler({
      hote: "atelierduquiz.fr",
      chemin: "/",
      secFetchSite: absent,
      origin: absent,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.equal(v.compte, false);
  }
});

test("un robot ne compte pas, même bien élevé", () => {
  for (const ua of ["Googlebot/2.1", "curl/8.4.0", "python-requests/2.31", ""]) {
    const v = vueNavigateurASignaler({
      hote: "atelierduquiz.fr",
      chemin: "/",
      secFetchSite: "same-origin",
      origin: null,
      userAgent: ua,
      hotesConnus: NOS_HOTES,
    });
    assert.equal(v.compte, false, ua || "(agent vide)");
  }
});

test("un fichier n'est pas une page, une URL complète non plus", () => {
  for (const chemin of ["/logo.png", "/sitemap.xml", "https://atelierduquiz.fr/", "", "blog"]) {
    const v = vueNavigateurASignaler({
      hote: "atelierduquiz.fr",
      chemin,
      secFetchSite: "same-origin",
      origin: null,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "chemin_invalide" }, chemin || "(vide)");
  }
});

test("le chemin est normalisé par le MÊME module que l'ancien compteur", () => {
  // Sinon deux périodes du même tableau ne parlent pas de la même page.
  const v = vueNavigateurASignaler({
    hote: "atelierduquiz.fr",
    chemin: "/Blog/Avis-Tiquiz/",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.equal(v.compte && v.chemin, "/blog/avis-tiquiz");
});

// ------------------------------------------------- là où vit la mécanique

test("la balise est posée à la RACINE, pas page par page", () => {
  // Le bon de commande n'est pas sous `SiteShell` : c'est justement sa
  // vue qui manquait ("vues d'un bon de commande : 0" à côté de 8
  // ventes). Une balise page par page est une balise qu'on oublie.
  const layout = lire("app/layout.tsx");
  assert.ok(layout.includes("<CompteurDeVue />"), "la balise vit dans le cadre racine");
});

test("la balise refuse d'elle même un hôte qui n'est pas public", () => {
  const src = lire("components/site/CompteurDeVue.tsx");
  assert.ok(src.includes("SALES_HOSTS"), "le garde est sur l'HÔTE");
  assert.ok(src.includes("keepalive"), "la vue d'un visiteur qui repart aussitôt ne se perd pas");
  // Aucun identifiant, aucun cookie : c'est ce qui dispense de
  // consentement, donc ce qui fait voir aussi ceux qui refusent le
  // bandeau.
  assert.ok(!src.includes("document.cookie"), "aucun cookie n'est lu ni posé");
  assert.ok(src.includes('credentials: "omit"'), "aucun cookie n'est envoyé non plus");
});

test("l'adresse ne porte aucun des mots que les bloqueurs reconnaissent", () => {
  const src = lire("components/site/CompteurDeVue.tsx");
  const adresse = /fetch\("([^"]+)"/.exec(src)?.[1] ?? "";
  assert.ok(adresse.startsWith("/"), "première partie, donc pas un domaine tiers");
  for (const mot of ["track", "analytic", "collect", "pixel", "beacon", "stat"]) {
    assert.ok(!adresse.includes(mot), `"${mot}" est dans les listes de blocage`);
  }
});
