// tests/logic/affiliate-own-checkout.test.mts
//
// UNE AFFILIÉE QUI ENVOIE DU MONDE SUR NOTRE DOMAINE DOIT ÊTRE PAYÉE.
//
// Le bug que ces tests figent n'a AUCUN symptôme visible : la page de
// vente s'affiche, la carte passe, l'accès s'ouvre, l'argent arrive.
// Seule l'affiliée constate qu'il ne se passe rien chez elle, et elle
// n'a aucun moyen de le prouver. C'est le pire type de panne, et le
// seul filet possible est ici.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  pickSa,
  readSa,
  readSaFromBrowser,
  SA_COOKIE,
  SA_MAX_AGE_SECONDS,
  SA_PARAM,
} from "../../lib/affiliate/sa.ts";
import { commissionBaseCents } from "../../lib/checkout/commissionBase.ts";

const SA = "sa00168442b1c2d3e4f5a6b7c8d9";

// ── L'IDENTIFIANT ──

test("un sa bien forme passe, tout le reste est jete", () => {
  assert.equal(readSa(SA), SA);
  assert.equal(readSa(` ${SA} `), SA);
  // Il finit dans une requete et dans un versement : on ne fait jamais
  // confiance a ce qui arrive d'une URL publique.
  assert.equal(readSa("sa"), null);
  assert.equal(readSa("saZZZZ"), null);
  assert.equal(readSa("' or 1=1--"), null);
  assert.equal(readSa(""), null);
  assert.equal(readSa(null), null);
  assert.equal(readSa(undefined), null);
  assert.equal(readSa(42), null);
  assert.equal(readSa({}), null);
});

test("la casse ne fait pas perdre une commission", () => {
  // Systeme.io ecrit en minuscules, mais un lien recopie a la main dans
  // un post peut arriver autrement. On garde la valeur telle quelle.
  const majuscules = SA.toUpperCase();
  assert.equal(readSa(majuscules), majuscules);
});

test("l'URL gagne sur le cookie : c'est la derniere affiliee qui a ferme la vente", () => {
  const autre = "sa99968442b1c2d3e4f5a6b7c8d9";
  assert.equal(pickSa(autre, SA), autre);
  // Un parametre absent ne doit PAS effacer le cookie : quelqu'un qui
  // navigue de page en page perd son `?sa=` des le premier clic.
  assert.equal(pickSa(null, SA), SA);
  // Une valeur invalide dans l'URL non plus.
  assert.equal(pickSa("nimportequoi", SA), SA);
  assert.equal(pickSa(null, null), null);
});

test("le navigateur retrouve le sa dans l'URL ou dans le cookie", () => {
  assert.equal(readSaFromBrowser(`?${SA_PARAM}=${SA}`, ""), SA);
  assert.equal(readSaFromBrowser("", `${SA_COOKIE}=${SA}`), SA);
  // Au milieu d'autres cookies, avec des espaces, et encode.
  assert.equal(
    readSaFromBrowser("", `autre=1; ${SA_COOKIE}=${encodeURIComponent(SA)}; encore=2`),
    SA,
  );
  // Un cookie dont le nom RESSEMBLE au notre ne compte pas.
  assert.equal(readSaFromBrowser("", `x_${SA_COOKIE}=${SA}`), null);
  // Aucune affiliee : c'est le cas normal, et ca ne doit rien casser.
  assert.equal(readSaFromBrowser("?k=abc", "session=xyz"), null);
  assert.equal(readSaFromBrowser("", ""), null);
});

test("le cookie dure UN AN, et ce n'est pas la fenetre d'attribution", () => {
  // Bene, 26 aout 2026 : "son cookie est posé pour 1 an sur le device de
  // son prospect." C'etait 90 jours ici alors que Tiquiz etait deja a un
  // an : deux durees pour la meme promesse selon le produit promu.
  assert.equal(SA_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);

  // CE TEST LIAIT LES DEUX, ET C'ETAIT L'ERREUR. Le COOKIE dit combien
  // de temps un CLIC compte ; la FENETRE d'attribution par email dit
  // combien de temps une CONVERSION deja enregistree compte. Ce sont
  // deux questions differentes, et les avoir mariees a fige le cookie a
  // 90 jours pendant que la promesse en annoncait 365.
  //
  // La fenetre du registre HISTORIQUE de l'Atelier reste a 90 jours,
  // volontairement : c'est un chemin de repli qu'on ne fait plus
  // grandir. Le registre central (Tipote) est a VIE, et c'est lui qui
  // repond en premier depuis le 26 aout.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/affiliateTracking.ts"),
    "utf8",
  );
  assert.ok(
    /ATTRIBUTION_WINDOW_DAYS\s*=\s*90/.test(src),
    "la fenetre du registre historique a bouge : a verifier volontairement",
  );
});

// ── LA BASE DE COMMISSION ──

test("on paie sur le HT, jamais sur le TTC", () => {
  // L'Atelier a 47 euros TTC, TVA 20% : 4700 - 783 = 3917.
  assert.equal(commissionBaseCents(4700, 783), 3917);
  // 70% de 3917 = 2742 c. Sur le TTC ce serait 3290 c, soit 5,48 euros
  // de trop par vente, verses sans que rien ne le signale.
  assert.equal(Math.round(3917 * 0.7), 2742);
  assert.equal(Math.round(4700 * 0.7), 3290);
});

test("une taxe absente ne fabrique JAMAIS un taux de TVA", () => {
  // C'est le cas de PayPal, qui ne ventile pas. On rend le montant tel
  // quel : la verite de cette vente la, pas une regle de trois.
  // Decision Bene du 22 aout : "pour paypal : oui on garde le TTC."
  assert.equal(commissionBaseCents(4700, 0), 4700);
  assert.equal(commissionBaseCents(4700, null), 4700);
  assert.equal(commissionBaseCents(4700, undefined), 4700);
  assert.equal(commissionBaseCents(4700, "pas un nombre"), 4700);
});

test("une taxe absurde ne rend jamais un HT negatif", () => {
  assert.equal(commissionBaseCents(4700, -100), 4700);
  assert.equal(commissionBaseCents(4700, 4700), 4700);
  assert.equal(commissionBaseCents(4700, 99999), 4700);
});

test("pas de vente, pas de base", () => {
  assert.equal(commissionBaseCents(0, 0), 0);
  assert.equal(commissionBaseCents(-1, 0), 0);
  assert.equal(commissionBaseCents(null, 0), 0);
  assert.equal(commissionBaseCents("47", 0), 47);
});

// ── LA CHAÎNE, EN TROIS PIÈCES ──
//
// Elles sont dans trois fichiers différents et aucune ne sert seule.
// En zapper une remet le bug, en silence.

test("1. le middleware range le sa des la premiere page", () => {
  const mw = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(mw.includes("SA_COOKIE"), "le middleware ne pose plus le cookie");
  assert.ok(
    mw.includes("readSa("),
    "le middleware ecrit une valeur non validee dans un cookie",
  );
  // La page de vente est justement celle ou le lien atterrit : si sa
  // reecriture ne porte pas le cookie, tout le reste est inutile.
  const i = mw.indexOf("NextResponse.rewrite");
  assert.ok(i > 0, "la reecriture de la page de vente a disparu");
  assert.ok(
    mw.slice(Math.max(0, i - 120), i + 60).includes("poseSa("),
    "la page de vente ne pose pas le cookie : le lien d'affiliation ne sert a rien",
  );
});

test("2. le bon de commande transmet le sa, sans passer par un etat React", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/commande/[produit]/CommandeClient.tsx"),
    "utf8",
  );
  assert.ok(src.includes("readSaFromBrowser"), "le bon de commande ne lit plus le sa");
  // Un effet de CE composant tourne APRES ceux de ses enfants : le
  // fournisseur Stripe aurait deja demande la session. Lire dans un
  // `useState` rempli par un effet perdrait donc la commission, sans que
  // rien ne s'affiche de travers.
  assert.ok(
    !/useEffect\([^)]*setSa/.test(src),
    "le sa est repasse par un etat : il arrivera trop tard",
  );
  // Les DEUX moyens de paiement le transmettent.
  const occurrences = src.split("ref: refAffiliee()").length - 1;
  assert.equal(occurrences, 2, "un des deux moyens de paiement ne transmet pas le sa");
});

test("3. les deux webhooks creent la commission, APRES l'acces", () => {
  for (const fichier of [
    "app/api/commande/webhook/route.ts",
    "app/api/commande/paypal/webhook/route.ts",
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), fichier), "utf8");
    const iAcces = src.indexOf("grantAccessByEmail(");
    const iCommission = src.indexOf("commissionnerVente(");
    assert.ok(iCommission > 0, `${fichier} ne cree aucune commission`);
    assert.ok(
      iCommission > iAcces,
      `${fichier} commissionne AVANT d'ouvrir l'acces : une commission qui echoue priverait ` +
        `une acheteuse de ce qu'elle a paye`,
    );
  }
});

test("le taux n'est ecrit qu'a UN endroit", () => {
  // Un pourcentage recopie dans un deuxieme fichier finit toujours par
  // diverger du premier, et personne ne s'en apercoit avant un versement.
  const racine = process.cwd();
  const fichiers = [
    "lib/affiliate/ownerSale.ts",
    "lib/checkout/catalog.ts",
    "app/api/commande/webhook/route.ts",
    "app/api/commande/paypal/webhook/route.ts",
  ];
  for (const f of fichiers) {
    const src = fs.readFileSync(path.join(racine, f), "utf8");
    // On ignore les commentaires : ils PARLENT des taux, c'est voulu.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert.ok(
      !/[^0-9.]0\.[47]\b/.test(code),
      `${f} contient un taux de commission en dur`,
    );
  }
});

test("PayPal passe une taxe a zero, et personne n'y met 20%", () => {
  // Decision Bene du 22 aout : la vente PayPal paie sur le TTC. Le jour
  // ou quelqu'un voudra "corriger" ca en posant un taux francais en dur,
  // ce test le dira : un taux inventé produit un versement faux qui a
  // l'air juste, et il serait faux pour toute acheteuse hors de France.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/paypal/webhook/route.ts"),
    "utf8",
  );
  assert.ok(/amountTaxCents:\s*0\b/.test(src), "la vente PayPal ne passe plus une taxe a zero");
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.ok(!/0\.2\b/.test(code), "un taux de TVA est apparu en dur sur la vente PayPal");
});

test("le catalogue nomme sa famille d'affiliation", () => {
  // Une vente Stripe ne porte ni URL de tunnel ni offer id Systeme.io :
  // `detectProduct()` ne peut rien en dire. Sans ce champ, le webhook
  // devrait deviner le taux.
  const src = fs.readFileSync(path.join(process.cwd(), "lib/checkout/catalog.ts"), "utf8");
  assert.ok(src.includes("affiliateApp"), "le catalogue ne dit plus a quel programme il appartient");
  assert.ok(/affiliateApp:\s*"quizing"/.test(src), "l'Atelier n'est plus rattache au programme");
});

test("la reference de commission porte son moyen de paiement", () => {
  // Elle vit dans la MEME colonne que les numeros de commande
  // Systeme.io. Sans prefixe, deux numerotations independantes finissent
  // par se percuter sur la contrainte d'unicite, et la deuxieme vente
  // serait silencieusement traitee comme un doublon.
  const src = fs.readFileSync(path.join(process.cwd(), "lib/affiliate/ownerSale.ts"), "utf8");
  assert.ok(
    src.includes("`${vente.moyen}:${reference}`"),
    "la reference n'est plus prefixee : collision possible avec Systeme.io",
  );
});
