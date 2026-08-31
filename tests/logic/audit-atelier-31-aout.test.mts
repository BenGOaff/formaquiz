// tests/logic/audit-atelier-31-aout.test.mts
//
// AUDIT DE L'ATELIER, 31 AOÛT 2026 : deux trous, et les deux
// invisibles jusqu'à ce qu'ils coûtent quelque chose.
//
// Ces deux modules importent `supabaseAdmin` ou `server-only` : aucun
// test ne peut les CHARGER. On lit donc leur source. C'est exactement
// le piège nommé le 24 août (le verrou des webhooks vivait dans un
// module intestable, et c'est LITTÉRALEMENT là que le bug s'était
// installé).

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { isUsableOrigin, resolveAppUrl, CANONICAL_APP_URL } from "@/lib/appUrl";

const GRANT = readFileSync("lib/plusTrial/grant.ts", "utf8");

/** Les fichiers qui fabriquent une adresse vue par un humain. */
const FABRIQUENT_UNE_URL = [
  "app/api/auth/forgot/route.ts",
  "app/api/auth/magic-link/route.ts",
  "lib/access/grantAccess.ts",
  "lib/email/templates.ts",
  "app/api/plus-trial/widget/route.ts",
  "app/api/integrations/tiquiz/callback/route.ts",
];

test("1. une adresse email ne se cherche JAMAIS avec ilike", () => {
  // Dans un LIKE Postgres, `_` est un JOKER. Or `_` est parfaitement
  // legal dans une adresse : `jean_dupont@gmail.com` matchait donc
  // `jeanXdupont@gmail.com`.
  //
  // Sur le controle d'idempotence du mois offert, un faux positif
  // REFUSE le cadeau a quelqu'un qui ne l'a jamais recu, en silence.
  assert.doesNotMatch(
    GRANT,
    /\.ilike\(\s*["'][a-z_]*email/,
    "Une comparaison d'email doit etre exacte (.eq), jamais un motif.",
  );
  assert.match(GRANT, /\.eq\("sio_email", sioEmail\)/);
});

test("1b. la comparaison exacte est sure : la colonne est ecrite en minuscule", () => {
  // `.eq` ne serait PAS sur si une ecriture posait une majuscule.
  // C'est la condition qui rend la correction valable, donc elle se
  // teste.
  assert.match(GRANT, /const sioEmail = args\.sioEmail\.trim\(\)\.toLowerCase\(\)/);
  // On ne regarde que les ECRITURES, pas la declaration de type
  // (`sio_email: string` dans ClaimFields).
  const toutes = GRANT.match(/sio_email: [a-zA-Z]+/g) ?? [];
  const ecritures = toutes.filter((e) => e !== "sio_email: string");
  assert.ok(ecritures.length >= 3, `moins d'ecritures que prevu : ${ecritures.length}`);
  for (const e of ecritures) {
    assert.match(e, /sio_email: sioEmail/, `ecriture non normalisee : ${e}`);
  }
});

test("2. aucun fabricant d'URL ne retombe sur un `??`", () => {
  // Drame Veronique (2 aout) : "je demande un nouveau mot de passe, je
  // clique, et j'arrive sur localhost n'autorise pas la connexion".
  // Un `??` ne protege que du MANQUANT, jamais du FAUX.
  //
  // `lib/appUrl.ts` VALIDE, et il existait deja dans ce depot. Il
  // n'etait simplement pas branche : un garde-fou ecrit et non appele
  // ne protege personne.
  for (const f of FABRIQUENT_UNE_URL) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(
      src,
      /process\.env\.(NEXT_PUBLIC_)?APP_URL\s*\?\?/,
      `${f} lit APP_URL avec un ?? au lieu de passer par lib/appUrl.ts`,
    );
    assert.match(
      src,
      /(resolveAppUrl|getAppUrl)\(/,
      `${f} fabrique une URL sans passer par le garde-fou`,
    );
  }
});

test("3. le garde-fou refuse vraiment une adresse locale", () => {
  // Un garde-fou qu'on branche sans verifier qu'il mord, c'est la
  // lecon du 31 aout au matin.
  for (const local of [
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://[::1]:3002",
    "https://poste.local",
  ]) {
    assert.equal(isUsableOrigin(local), false, `${local} devrait etre refuse`);
  }
  assert.equal(isUsableOrigin("https://quizing.tipote.com"), true);
  assert.equal(isUsableOrigin("pas une url"), false);
});

test("4. une variable PRESENTE et absurde ne gagne pas sur l'origine reelle", () => {
  // C'est le scenario exact du drame : la variable existe, elle est
  // fausse, et l'ancien code faisait `env || origine`.
  const avant = process.env.APP_URL;
  try {
    process.env.APP_URL = "http://localhost:3002";
    assert.equal(
      resolveAppUrl("https://quizing.tipote.com"),
      "https://quizing.tipote.com",
      "une APP_URL locale doit ceder a l'origine reelle de la requete",
    );
    assert.equal(
      resolveAppUrl(null),
      CANONICAL_APP_URL,
      "sans origine de requete, on retombe sur le domaine canonique",
    );
  } finally {
    if (avant === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = avant;
  }
});
