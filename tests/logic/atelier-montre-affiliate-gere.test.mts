// tests/logic/atelier-montre-affiliate-gere.test.mts
//
// L'ATELIER MONTRE. L'ESPACE AFFILIÉ GÈRE.
//
// Béné, 31 août 2026 : "attention : affiliation sur atelier montre les
// données de affiliate mais les élèves de l'atelier doivent aller sur
// affiliate pour tout gérer. **On gère tout sur affiliate et le reste
// montre seulement.**"
//
// -- CE QUI NE RESPECTAIT PAS LA RÈGLE ---------------------------------
//
// **1. Un champ pour enregistrer son identifiant Systeme.io.** Il
// écrivait dans le registre HISTORIQUE de l'Atelier
// (`profiles.sio_affiliate_id`), pendant que l'espace affilié écrit dans
// le registre CENTRAL. Deux endroits pour régler la même chose, avec
// deux effets différents : c'est la mécanique qui produit les
// contradictions les plus chères de ces dépôts. Le champ est parti, et
// sa route `PATCH /api/me/affiliate` avec lui.
//
// Ce qui est DÉJÀ enregistré reste lu (c'est le repli des ventes des
// anciens tunnels) et s'affiche en lecture seule : personne ne doit
// croire sa valeur perdue.
//
// **2. Un relevé qui avait l'air complet et ne l'était pas.**
// `getAffiliateGains` lit `affiliate_commissions` D'ICI, alimenté par le
// webhook Systeme.io : il ne voit RIEN de ce qui passe par un lien
// `?ref=` d'aujourd'hui. Or les libellés disaient "Total gagné (net)",
// "Versé (estimé)", "Prochain versement estimé". Un élève qui vend par
// son lien actuel lisait donc un relevé qui ne compte que ses vieilles
// ventes, sans que rien ne le dise.
//
// C'est la même famille que le tableau de bord affilié du 31 août chez
// Tipote : **un chiffre qui a l'air d'être le total et qui ne l'est pas
// coûte la confiance, et ça se découvre au premier versement.**

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

const RACINE = process.cwd();
const ECRAN = "app/(app)/affiliation/AffiliationClient.tsx";
const src = fs.readFileSync(path.join(RACINE, ECRAN), "utf8");

describe("Rien ne se GÈRE depuis l'Atelier", () => {
  test("le champ d'identifiant Systeme.io a disparu", () => {
    assert.ok(!src.includes("normalizeAffiliateId"), "le champ de saisie est encore la");
    assert.ok(
      !/fetch\("\/api\/me\/affiliate"/.test(src),
      "l'ecran ecrit encore dans le registre historique",
    );
  });

  test("LA ROUTE D'ÉCRITURE N'EXISTE PLUS", () => {
    // Une porte sans appelant est une porte que le prochain passage
    // rebranche en croyant reparer. Une fonction morte se retire.
    assert.ok(
      !fs.existsSync(path.join(RACINE, "app/api/me/affiliate/route.ts")),
      "la route d'ecriture est encore la",
    );
  });

  test("ce qui est déjà enregistré reste MONTRÉ, en lecture seule", () => {
    // Le retirer de l'ecran ferait croire a l'eleve qu'il a ete perdu,
    // alors qu'il sert toujours de repli.
    assert.match(src, /Identifiant Systeme\.io rattaché à ce compte/);
    assert.ok(src.includes("savedId"), "la valeur enregistree n'est plus lue");
  });

  test("chaque geste renvoie à l'espace affilié", () => {
    assert.ok(src.includes("ESPACE_AFFILIE_URL"), "plus de sortie vers l'espace affilie");
  });
});

describe("Ce que l'Atelier montre, il le NOMME", () => {
  test("LE RELEVÉ DIT qu'il ne compte que les anciens tunnels", () => {
    // Une seule phrase, en haut, en gras : moins cher qu'une
    // reclamation.
    assert.match(
      src,
      /ne comptent que tes ventes arrivées par les\s*\n?\s*anciens tunnels Systeme\.io/,
    );
  });

  test("aucun libellé ne prétend être le total", () => {
    // "Total gagne (net)" sur un relevé partiel, c'est le meme defaut
    // que `affiliate_stats` chez Tipote le 31 aout.
    assert.ok(!src.includes('label="Total gagné (net)"'), "un libelle promet le total");
    assert.ok(!src.includes('label="Versé (estimé)"'), "un libelle promet le verse");
    assert.match(src, /Gagné via Systeme\.io/);
    assert.match(src, /Versé par Systeme\.io/);
  });

  test("le prochain versement annoncé dit QUI le fait", () => {
    assert.match(src, /Prochain versement Systeme\.io estimé/);
  });
});
