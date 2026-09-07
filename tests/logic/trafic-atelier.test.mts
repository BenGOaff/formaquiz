// tests/logic/trafic-atelier.test.mts
//
// LE COMPTEUR DE L'ATELIER (Béné, 7 septembre 2026).
//
// "il me faut aussi le compteur de l'Atelier."
//
// Tiquiz compte son trafic depuis le 7 septembre. L'Atelier vit ici,
// avec sa PROPRE base : sans compteur, sa page de vente restait la
// seule dont personne ne savait combien de monde la lit.
//
// LE PILOTAGE VIENT LIRE, L'ATELIER NE POUSSE PAS. C'est le motif déjà
// établi par `fetchAtelier` (21 août). Pousser vers Tiquiz à chaque vue
// serait plus court à écrire et strictement moins bon : une panne de
// Tiquiz ferait perdre nos vues POUR TOUJOURS, en silence.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  cheminPourStats,
  estUnRobot,
  sourceDeLaVue,
  vueASignaler,
} from "@/lib/trafic/vueASignaler";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

/**
 * LE FICHIER SANS SES COMMENTAIRES.
 *
 * Un test qui cherche une chaîne dans un fichier tombe sur sa propre
 * explication. Mesuré ici le 7 septembre : l'assertion `lisible: false`
 * restait VERTE sur une porte partenaire cassée, parce que la chaîne
 * vivait dans le commentaire posé juste au dessus du code.
 *
 * Treizième fois que ce dépôt paie ce défaut. Toute assertion qui parle
 * du CODE passe par ici.
 */
const code = (p: string) =>
  lire(p)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const PAGE = { accept: "text/html,application/xhtml+xml", userAgent: "Mozilla/5.0 (Macintosh)" };

test("on ne compte que le site public de l'Atelier", () => {
  assert.equal(vueASignaler({ host: "atelierduquiz.fr", pathname: "/", ...PAGE }), true);
  assert.equal(vueASignaler({ host: "www.atelierduquiz.fr", pathname: "/", ...PAGE }), true);
  // L'app derrière connexion n'est pas du trafic de vente : la compter
  // gonflerait le dénominateur avec des élèves déjà clients, donc
  // écraserait le taux de conversion sans rien dire.
  assert.equal(vueASignaler({ host: "quizing.tipote.com", pathname: "/", ...PAGE }), false);
});

test("les robots ne sont pas du trafic, agent vide compris", () => {
  assert.equal(estUnRobot("Googlebot/2.1"), true);
  assert.equal(estUnRobot(""), true, "un navigateur envoie toujours un agent : le vide exclut");
  assert.equal(estUnRobot(null), true);
  assert.equal(estUnRobot("Mozilla/5.0 (Macintosh)"), false);

  assert.equal(
    vueASignaler({ host: "atelierduquiz.fr", pathname: "/", accept: "text/html", userAgent: "curl/8" }),
    false,
  );
  // Une API et un fichier ne sont pas des pages.
  assert.equal(vueASignaler({ host: "atelierduquiz.fr", pathname: "/api/x", ...PAGE }), false);
  assert.equal(vueASignaler({ host: "atelierduquiz.fr", pathname: "/a.png", ...PAGE }), false);
});

test("le chemin est borné, jamais jeté", () => {
  assert.equal(cheminPourStats("/Commande/Atelier/"), "/commande/atelier");
  assert.equal(cheminPourStats("/"), "/");
  // Un scanner ne doit pas pouvoir remplir la table de lignes uniques,
  // mais une vue tronquée reste une vue : elle se voit et se comprend.
  assert.ok(cheminPourStats("/a/b/c/d/e/f").endsWith("…"));
});

test("une navigation interne compte comme vue mais n'a amené personne", () => {
  const h = "atelierduquiz.fr";
  assert.equal(sourceDeLaVue({ referrer: "https://atelierduquiz.fr/x", canal: null, utmSource: null, host: h }), "interne");
  assert.equal(sourceDeLaVue({ referrer: "https://www.google.fr/", canal: null, utmSource: null, host: h }), "google");
  assert.equal(sourceDeLaVue({ referrer: null, canal: null, utmSource: null, host: h }), "direct");
  // Le canal que l'affilié pose lui même passe devant : c'est ce que le
  // referrer ne peut PAS voir (une newsletter, un lien en bio).
  assert.equal(sourceDeLaVue({ referrer: "https://www.google.fr/", canal: "youtube", utmSource: null, host: h }), "youtube");
  // Un referrer illisible n'est pas une source : on ne devine pas.
  assert.equal(sourceDeLaVue({ referrer: "pas-une-url", canal: null, utmSource: null, host: h }), "direct");
});

test("le middleware appelle le module pur, il ne décide rien lui même", () => {
  const mw = code("middleware.ts");
  assert.match(mw, /vueASignaler\(\{/, "le middleware doit appeler la décision, pas la réécrire");
  // `waitUntil` et pas `await` : une statistique ne fait JAMAIS attendre
  // une page de vente.
  assert.match(mw, /event\.waitUntil\(\s*signalerVue\(/, "l'écriture doit rester hors du chemin de la réponse");
});

test("rien de ce que le middleware importe ne touche la base ni le disque", () => {
  // C'est la leçon du `node:fs` du 6 septembre : un composant du
  // middleware qui tire un module serveur casse le bundle, et `tsc`
  // répond exit 0 dessus.
  const signaler = code("lib/trafic/signalerVue.ts");
  assert.equal(
    /^import /m.test(signaler),
    false,
    "signalerVue ne doit RIEN importer : il est dans la chaîne du middleware",
  );
  const vue = code("lib/trafic/vueASignaler.ts");
  assert.equal(/supabaseAdmin|node:fs|server-only/.test(vue), false);

  // Et l'écriture, elle, vit dans un module qui n'est atteint que par la
  // route Node.
  assert.match(code("lib/trafic/compterVue.ts"), /import "server-only"/);
});

test("l'incrément est atomique et la table est fermée", () => {
  const sql = lire("supabase/migrations/20260907_trafic_pages_publiques.sql");
  // Lire puis écrire perdrait des vues dès que deux requêtes arrivent en
  // même temps, c'est à dire exactement les jours qui comptent.
  assert.match(sql, /on conflict[\s\S]*do update set vues = public\.trafic_jour\.vues \+ 1/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on function[\s\S]*from anon/);
  assert.match(sql, /notify pgrst, 'reload schema'/);
});

test("la porte partenaire rend le trafic dans le MÊME appel que les ventes", () => {
  const route = code("app/api/partner/pilotage/route.ts");
  assert.match(route, /trafic_jour/, "le trafic doit sortir par la porte qui existe déjà");
  assert.match(route, /sales:/, "…la même que celle des ventes");
  // "je n'ai pas pu lire" n'est pas "il n'y a rien" : l'appelant doit
  // pouvoir dire la différence, sinon le pilotage annonce un site
  // désert (règle du 23 août).
  assert.match(route, /lisible: false/);
  assert.match(route, /lisible: true/);
  // La période vient de l'appelant : deux périodes différentes des deux
  // côtés diviseraient des pommes par des poires.
  assert.match(route, /searchParams\.get\("debut"\)/);
});
