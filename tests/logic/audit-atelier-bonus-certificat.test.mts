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
