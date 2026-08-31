// tests/logic/audit-atelier-bonus-certificat.test.mts
//
// AUDIT DU 31 AOÛT 2026 : LE BONUS ET LE CERTIFICAT.
//
// Béné : "tu as fini tous les audits ? Je peux envoyer des clients et
// des affiliés sans risque sur chaque page ? Tout le monde reçoit ce
// qu'il paye ?"
//
// Deux trous, et les deux ont la forme habituelle de ce dépôt : une
// logique écrite pour un cas, appliquée telle quelle à un autre.
//
// 1. ÊTRE CONNECTÉ N'EST PAS ÊTRE INSCRIT. Le générateur de bonus,
//    le point d'entrée le plus long et le plus cher de l'Atelier,
//    était le SEUL à ne pas regarder `viewer.enrolled`. Un
//    remboursement pose `enrollments.status = 'revoked'` et ne
//    supprime PAS le compte (`revokeAccessByEmail`) : la session
//    restait valide, et avec elle la génération, sans aucune limite
//    journalière. Le parcours, le coach et l'audit de quiz, eux,
//    fermaient bien.
//
// 2. UNE LECTURE QUI ÉCHOUE N'EST PAS UN CERTIFICAT QUI N'EXISTE PAS.
//    L'erreur du `select` des certificats était ignorée : une panne
//    d'une seconde faisait fabriquer un NOUVEAU jeton de partage et
//    allouer un DEUXIÈME numéro, que l'upsert écrasait par dessus les
//    anciens. Un certificat s'imprime : son lien `/cert/<jeton>`
//    répondait alors 404 et son numéro changeait.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const BONUS = readFileSync("app/api/me/bonus/route.ts", "utf8");
const LABO = readFileSync("app/(app)/labo-bonus/page.tsx", "utf8");
const CERT = readFileSync("app/api/certificat/claim/route.ts", "utf8");
const ECHEC = readFileSync("lib/aiFailure.ts", "utf8");

test("le generateur de bonus refuse un acces revoque", () => {
  assert.match(
    BONUS,
    /if \(!viewer\.enrolled\)/,
    "un rembourse gardait le point d'entree le plus cher de l'Atelier",
  );
  assert.match(BONUS, /reason: "no_access" \}, \{ status: 403 \}/);
  // L'ordre compte : on refuse AVANT de lire la cle Anthropic et avant
  // le moindre appel sortant.
  assert.ok(
    BONUS.indexOf("if (!viewer.enrolled)") < BONUS.indexOf("const apiKey = getApiKey()"),
    "le refus doit tomber avant tout travail",
  );
});

test("l'ecran du generateur ne s'ouvre pas quand la route refuse", () => {
  // Un ecran qui s'ouvre sur un formulaire dont chaque bouton repond
  // 403 est pire qu'un ecran absent : il fait travailler pour rien.
  assert.match(LABO, /if \(!viewer\.enrolled\) redirect\(/);
});

test("le refus d'acces a une phrase, il ne tombe pas dans le defaut", () => {
  // "ca n'a pas abouti, relance" enverrait quelqu'un relancer dix fois
  // une generation qui ne repartira jamais.
  assert.match(ECHEC, /case "no_access":/);
});

test("le jeton et le numero d'un certificat ne se refabriquent jamais sur une erreur", () => {
  const bloc = CERT.slice(CERT.indexOf('.from("certificates")'));
  assert.match(CERT, /error: lectureErr/, "l'erreur de lecture doit etre vue, jamais avalee");
  assert.match(CERT, /if \(lectureErr\)/);
  assert.ok(
    CERT.indexOf("if (lectureErr)") < CERT.indexOf("makeToken()", CERT.indexOf("if (lectureErr)") - 1) ||
      CERT.indexOf("if (lectureErr)") < CERT.indexOf("allocate_cert_number"),
    "on s'arrete AVANT d'allouer une nouvelle identite",
  );
  assert.match(bloc, /const shareToken =/, "le jeton ne doit plus etre reassignable");
  assert.doesNotMatch(bloc, /let shareToken =/);
});

test("la page publique d'un certificat ne lit que ce qu'elle affiche", () => {
  // Elle tourne en service_role : un `select("*")` sortirait le
  // user_id et le lien affilie de l'eleve a n'importe quel visiteur.
  const page = readFileSync("app/cert/[token]/page.tsx", "utf8");
  assert.match(page, /\.select\("full_name, cert_number"\)/);
  assert.doesNotMatch(page, /\.select\("\*"\)/);
});

// -- ET LA DATE D'UNE VENTE NE BOUGE PAS PARCE QU'UN WEBHOOK A ETE
//    REESSAYE (meme audit) --------------------------------------------
//
// La reprise d'un traitement mort repoussait `created_at`. C'est la
// DATE DE LA VENTE : `buildSales` en fait le `paidAt` et l'ecran de
// pilotage trie dessus. Un reessai deplacait donc une vente d'aout au
// jour de la reprise, et la faisait remonter en tete de liste.

import { lireVerrou } from "@/lib/webhooks/verrouRegles";

const LOG = readFileSync("lib/webhooks/log.ts", "utf8");
const VENTES = readFileSync("lib/checkout/sales.ts", "utf8");

test("la date de vente vient bien de created_at : c'est ce qui rend la correction necessaire", () => {
  assert.match(VENTES, /paidAt: row\.created_at/, "si ca change, la raison de cette correction change aussi");
});

test("la reprise d'un verrou ne repousse plus created_at", () => {
  const bloc = LOG.slice(LOG.indexOf("async function relireLeVerrou"));
  const codeSeul = bloc
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
    .join("\n");
  // Le repli sur created_at reste, mais UNIQUEMENT derriere le test de
  // colonne inconnue : sans lui, un deploiement en avance sur la
  // migration ne pourrait plus jamais relacher un verrou.
  assert.match(codeSeul, /update\(\{ locked_at:/, "le battement de coeur a sa propre colonne");
  assert.match(codeSeul, /colonneInconnue\(repriseErr\)/, "le repli doit etre conditionne, pas systematique");
});

test("la prise du verrou survit a une migration pas encore passee", () => {
  // PostgREST rejette l'ecriture ENTIERE sur une colonne inconnue :
  // sans repli, la prise du verrou de TOUS les paiements echouerait.
  assert.match(LOG, /function colonneInconnue/);
  assert.match(LOG, /PGRST204/);
  const bloc = LOG.slice(LOG.indexOf("export async function prendreLeVerrou"), LOG.indexOf("async function relireLeVerrou"));
  assert.match(bloc, /colonneInconnue\(error\)/);
  // Et la relecture ne NOMME pas la colonne, sinon toute la requete
  // echouerait au lieu de la seule ecriture.
  const relecture = LOG.slice(LOG.indexOf("async function relireLeVerrou"));
  assert.doesNotMatch(relecture, /\.select\("id, status, created_at, locked_at"\)/);
});

test("locked_at prime sur created_at pour juger un traitement mort", () => {
  const maintenant = Date.parse("2026-08-31T12:00:00Z");
  // Vente ancienne, verrou pris il y a dix secondes : quelqu'un
  // travaille, on ne reprend pas.
  assert.deepEqual(
    lireVerrou(
      { status: "processing", created_at: "2026-08-01T09:00:00Z", locked_at: "2026-08-31T11:59:50Z" },
      maintenant,
    ),
    { action: "en_cours" },
  );
  // Verrou pris il y a une heure : le traitement est mort, on reprend.
  assert.deepEqual(
    lireVerrou(
      { status: "processing", created_at: "2026-08-31T11:59:50Z", locked_at: "2026-08-31T11:00:00Z" },
      maintenant,
    ),
    { action: "traiter" },
  );
  // Ligne d'avant la migration : on retombe sur created_at, donc sur
  // l'ancien comportement, jamais sur "je ne sais pas".
  assert.deepEqual(
    lireVerrou({ status: "processing", created_at: "2026-08-31T11:59:50Z" }, maintenant),
    { action: "en_cours" },
  );
});
