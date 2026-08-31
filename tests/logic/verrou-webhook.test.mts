// tests/logic/verrou-webhook.test.mts
//
// UN RÉESSAI DE WEBHOOK DE PAIEMENT DOIT POUVOIR REPASSER.
//
// Audit de l'Atelier demandé par Béné, 31 août 2026.
//
// -- LE TROU, ET IL ÉTAIT LE PLUS CHER DU DÉPÔT -----------------------
//
// Les deux webhooks de paiement écrivaient une ligne `received` AVANT
// de travailler, et TOUT conflit sur l'index valait "déjà traité". Or
// l'index de la migration initiale couvre tous les statuts.
//
// Donc dès que le traitement ÉCHOUAIT (Supabase indisponible une
// seconde, Stripe injoignable, `grantAccessByEmail` qui rate), la route
// répondait 502 pour demander un réessai, et **ce réessai était refusé
// par notre propre journal** : ligne existante -> doublon -> 200 -> le
// fournisseur arrête de réessayer.
//
// **Une vente encaissée dont le premier traitement rate n'ouvrait donc
// jamais l'accès.** Le symptôme est l'absence de symptôme : la page
// s'affiche, la carte passe, l'argent arrive, et l'acheteur n'a rien.
//
// C'est le bug corrigé chez Tiquiz le 24 août. L'Atelier avait gardé
// l'ancienne mécanique pendant une semaine, et c'est ici que ça coûtait
// le plus : le panier le plus gros, la commission la plus forte.
//
// -- ET CE QUE LE PORTAGE A FAILLI CASSER -----------------------------
//
// Deux pièges, tous les deux dans le fichier recopié :
//
//  1. **la colonne ne porte pas le même nom.** `created_at` ici,
//     `received_at` chez Tiquiz. Recopié tel quel, le `select`
//     échouait, la relecture du verrou répondait "je ne sais pas", donc
//     409, donc l'événement ne repassait PLUS JAMAIS. Un fichier jumeau
//     se relit contre le schéma d'arrivée, il ne se recopie pas ;
//  2. **l'index est PARTAGÉ avec le webhook Systeme.io**, qui écrit
//     `received` et ne le change jamais. Lui appliquer le filtre de
//     statut aurait SUPPRIMÉ sa protection anti-doublon : une relance
//     de Systeme.io rouvrirait un accès et REPAIERAIT une commission.
//     Les deux index sont donc séparés.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { REPRISE_APRES_MS, lireVerrou } from "@/lib/webhooks/verrouRegles";

const RACINE = process.cwd();
const lire = (rel: string) => fs.readFileSync(path.join(RACINE, rel), "utf8");

const MAINTENANT = Date.parse("2026-08-31T12:00:00.000Z");
const ilYA = (ms: number) => new Date(MAINTENANT - ms).toISOString();

describe("La decision du verrou", () => {
  test("DÉJÀ TRAITÉ : on répond 200 sans rien refaire", () => {
    assert.deepEqual(lireVerrou({ status: "processed", created_at: ilYA(1000) }, MAINTENANT), {
      action: "doublon",
    });
  });

  test("QUELQU'UN TRAVAILLE DESSUS : on demande un réessai plus tard", () => {
    // Et pas un 200 : si SON traitement echoue, il faut que quelqu'un
    // repasse. C'est tout le defaut qu'on ferme.
    assert.deepEqual(lireVerrou({ status: "processing", created_at: ilYA(5_000) }, MAINTENANT), {
      action: "en_cours",
    });
  });

  test("UN TRAITEMENT MORT EN ROUTE SE REPREND", () => {
    // Redemarrage PM2, delai de la plateforme, machine qui redemarre :
    // sans reprise, la vente resterait bloquee pour toujours.
    const vieux = ilYA(REPRISE_APRES_MS + 1000);
    assert.deepEqual(lireVerrou({ status: "processing", created_at: vieux }, MAINTENANT), {
      action: "traiter",
    });
  });

  test("un horodatage illisible se traite comme un traitement mort", () => {
    // Mieux vaut reprendre une vente que la laisser bloquee.
    assert.deepEqual(lireVerrou({ status: "processing", created_at: "n'importe quoi" }, MAINTENANT), {
      action: "traiter",
    });
    assert.deepEqual(lireVerrou({ status: "processing", created_at: null }, MAINTENANT), {
      action: "traiter",
    });
  });

  test("UNE LIGNE `error` NE BLOQUE RIEN : c'est le coeur de la correction", () => {
    // Elle est SORTIE de l'index, donc elle ne peut pas nous avoir
    // bloques : si on la lit quand meme, on ne sait pas ce qu'on lit.
    // L'important est qu'on ne reponde JAMAIS "doublon" dessus.
    assert.notEqual(lireVerrou({ status: "error", created_at: ilYA(1000) }, MAINTENANT).action, "doublon");
  });

  test("une ligne absente ou illisible ne vaut jamais un doublon", () => {
    // On SAIT qu'il y a eu conflit, donc une ligne existe : ne pas
    // pouvoir la lire est le cas ou on ne sait pas. Rejouer une vente
    // coute plus cher que la retarder.
    assert.deepEqual(lireVerrou(null, MAINTENANT), { action: "en_cours" });
    assert.deepEqual(lireVerrou({}, MAINTENANT), { action: "en_cours" });
  });

  test("AUCUNE colonne de l'autre depot dans la requete", () => {
    // Recopie de Tiquiz, elle s'appelait `received_at` : le `select`
    // echouait, donc 409, donc l'evenement ne repassait plus jamais.
    const src = lire("lib/webhooks/log.ts");
    assert.ok(
      !/\.order\("received_at"|received_at: new Date/.test(src),
      "une colonne de l'autre depot est restee dans la requete",
    );
    // La relecture ne NOMME plus les colonnes : `locked_at` peut ne pas
    // encore exister en prod, et une colonne nommee ferait echouer
    // TOUTE la requete, donc rendrait le verrou illisible.
    assert.match(src, /\.select\("\*"\)/);
  });
});

describe("Les deux webhooks de paiement prennent le verrou", () => {
  for (const rel of [
    "app/api/commande/webhook/route.ts",
    "app/api/commande/paypal/webhook/route.ts",
  ]) {
    test(`${rel} : plus de ligne \`received\` avant le travail`, () => {
      const src = lire(rel);
      assert.ok(!src.includes("logWebhookEvent"), "l'ancienne mecanique est encore la");
      assert.match(src, /prendreLeVerrou\(/);
    });

    test(`${rel} : le travail est MARQUÉ, quoi qu'il arrive`, () => {
      // Sans marquage, l'evenement reste `processing` et sera repris
      // deux minutes plus tard : c'est le filet, pas le fonctionnement.
      const src = lire(rel);
      assert.match(src, /marquerTraite\(SOURCE, eventId, "error"/);
      assert.match(src, /marquerTraite\(SOURCE, eventId, reussi \? "processed" : "error"/);
      // Et le traitement est SEPARE : un `return` oublie au milieu de
      // deux cents lignes laisserait l'evenement bloque.
      assert.match(src, /async function traiterEvenement\(/);
    });

    test(`${rel} : "quelqu'un travaille dessus" n'est pas un 200`, () => {
      const src = lire(rel);
      assert.match(src, /reason: "en_cours" \}, \{ status: 409 \}/);
    });
  }
});

describe("La migration separe les deux index", () => {
  const sql = lire("supabase/migrations/20260831_webhook_lock.sql");

  test("LE VERROU DES PAIEMENTS porte le statut", () => {
    assert.match(sql, /source in \('stripe', 'paypal'\)/);
    assert.match(sql, /status in \('processing', 'processed'\)/);
  });

  test("SYSTEME.IO GARDE SA PROTECTION, sans filtre de statut", () => {
    // Lui appliquer le filtre le sortirait de l'index : une relance de
    // Systeme.io rouvrirait un acces et REPAIERAIT une commission.
    const bloc = sql.slice(sql.indexOf("create unique index if not exists idx_webhook_logs_event_id"));
    const jusquAuPointVirgule = bloc.slice(0, bloc.indexOf(";"));
    assert.match(jusquAuPointVirgule, /source <> 'stripe'/);
    assert.match(jusquAuPointVirgule, /source <> 'paypal'/);
    assert.ok(
      !/status/.test(jusquAuPointVirgule),
      "un filtre de statut sur l'index de Systeme.io : sa protection saute",
    );
  });

  test("la colonne de l'index de reprise est celle de CETTE table", () => {
    assert.match(sql, /webhook_logs \(source, created_at desc\)/);
  });
});
