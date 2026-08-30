// tests/logic/expediteur-emails.test.mts
//
// L'ATELIER ÉCRIT DEPUIS SON DOMAINE (Béné, 30 août 2026).
//
// La bascule ne demandait aucun code : l'adresse sort de
// `FORMAQUIZ_EMAIL_FROM`. Ce qui demandait du code, c'est le contrôle au
// démarrage, parce que le danger propre à cette app est SILENCIEUX : une
// adresse posée sur un domaine pas encore vérifié chez Resend part en
// spam, l'API répond 200, et le seul symptôme est une cliente qui ne
// reçoit pas ses accès.
//
// Le dépôt de Tiquiz porte le même module et le même contrôle : un
// garde-fou qui ne protège qu'un des deux jumeaux ne protège personne
// (leçon des deux versions divergentes de pdf-parse, 7 août).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  verifierExpediteur,
  formaterExpediteur,
  domaineDe,
} from "../../lib/env/expediteur.ts";

const ATTENDUS = ["atelierduquiz.fr", "tiquiz.fr"];

test("la bonne configuration ne dit rien du tout", () => {
  const d = verifierExpediteur({ brut: "hello@atelierduquiz.fr", domainesAttendus: ATTENDUS });
  assert.equal(d.ok, true);
  assert.equal(formaterExpediteur(d, "ATELIER"), null);
});

test("l'oubli de la variable CRIE : sans elle aucun email ne part", () => {
  const d = verifierExpediteur({ brut: undefined, domainesAttendus: ATTENDUS });
  assert.equal(d.ok === false && d.genre, "absente");
  const msg = formaterExpediteur(d, "ATELIER");
  assert.ok(msg !== null, "aucun message : l'oubli passerait inapercu");
  assert.ok(msg.includes("FORMAQUIZ_EMAIL_FROM"), msg);
});

test("un domaine inattendu est signale, pas corrige", () => {
  // On ne peut pas PROUVER qu'un domaine est verifie sans interroger
  // Resend : on signale, on ne tranche pas.
  const d = verifierExpediteur({ brut: "hello@tipote.com", domainesAttendus: ATTENDUS });
  assert.equal(d.ok === false && d.genre, "domaine-inattendu");
  const msg = formaterExpediteur(d, "ATELIER");
  assert.ok(msg !== null, "un domaine inattendu passerait inapercu");
  assert.ok(msg.includes("hello@tipote.com"), msg);
});

test("une adresse deja nommee est signalee, sans casser l'envoi", () => {
  // `withBrandName` (lib/email/resend.ts) n'en garde que l'adresse : le
  // .env est a corriger, mais rien n'est casse en attendant.
  const d = verifierExpediteur({
    brut: "L'Atelier du Quiz <hello@atelierduquiz.fr>",
    domainesAttendus: ATTENDUS,
  });
  assert.equal(d.ok === false && d.genre, "nom-en-double");
});

test("le domaine se lit sur le DERNIER arobase", () => {
  assert.equal(domaineDe("hello@atelierduquiz.fr"), "atelierduquiz.fr");
  assert.equal(domaineDe("HELLO@AtelierDuQuiz.FR"), "atelierduquiz.fr");
  assert.equal(domaineDe("sans-arobase"), "");
});

test("le nom de marque est toujours ecrit par le CODE, jamais par le .env", () => {
  // Le .env de prod portait encore "FormaQuiz <...>" apres le rebrand,
  // ce qui affichait l'ancien nom dans la boite des eleves. La regle est
  // dans le code depuis, et elle doit y rester.
  const src = fs.readFileSync(path.join(process.cwd(), "lib/email/resend.ts"), "utf8");
  assert.ok(/BRAND_FROM_NAME\s*=\s*"L'Atelier du Quiz"/.test(src), src.slice(0, 400));
  assert.ok(/withBrandName\(/.test(src), "le nom n'est plus force cote code");
});
