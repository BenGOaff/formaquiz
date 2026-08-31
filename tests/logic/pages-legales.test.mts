// tests/logic/pages-legales.test.mts
//
// LES PAGES LÉGALES DE L'ATELIER VIVENT SUR LE DOMAINE DE L'ATELIER.
//
// Béné, 31 août 2026 : "il faut ajouter les pages légales de l'atelier
// sur le domaine de l'atelier et renvoyer vers elles. On ne veut plus
// rien qui soit lié à Systemeio tant qu'on peut l'éviter."
//
// Avant : les six liens du pied de page menaient à `www.tipote.fr`,
// c'est à dire chez Systeme.io. Un texte qu'on ne maîtrise pas, sur un
// domaine appelé à disparaître, et qui parlait de Tipote alors que
// l'acheteur commande l'Atelier.
//
// CE QUE CE TEST FIGE, et le troisième point est le plus important :
// 1. aucun lien légal ne repart chez Systeme.io ;
// 2. les CGV décrivent CE produit (achat unique, garantie 30 jours) et
//    pas celui de Tiquiz (abonnement, aucun remboursement) ;
// 3. le bon de commande recueille VRAIMENT la renonciation que les CGV
//    disent y recueillir. C'est le drame du 22 août côté Tiquiz : un
//    texte qui promet ce que l'écran ne fait pas.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { LIENS_LEGAUX } from "@/lib/checkout/brand";
import { COMPANY } from "@/lib/legal/company";
import { getLegalPage } from "@/lib/legal";
import { LEGAL_SLUGS, LEGAL_PATHS } from "@/lib/legal/types";

const COMMANDE = readFileSync("app/commande/[produit]/CommandeClient.tsx", "utf8");
const BON = readFileSync("app/commande/[produit]/page.tsx", "utf8");

test("les cinq pages legales existent et sont remplies", () => {
  for (const slug of LEGAL_SLUGS) {
    const page = getLegalPage(slug);
    assert.ok(page.title.length > 3, `${slug} : pas de titre`);
    assert.match(page.lastUpdated, /\d{2}\/\d{2}\/\d{4}/, `${slug} : pas de date`);
    assert.ok(page.sections.length >= 4, `${slug} : trop peu de sections`);
    for (const s of page.sections) {
      assert.ok(s.h.trim().length > 0, `${slug} : une section sans titre`);
      assert.ok(s.body.length > 0, `${slug} : section "${s.h}" vide`);
    }
  }
});

test("aucun lien legal ne repart chez Systeme.io", () => {
  for (const l of LIENS_LEGAUX) {
    assert.doesNotMatch(
      l.href,
      /tipote\.fr|systeme\.io/,
      `Le lien "${l.texte}" repart chez Systeme.io : ${l.href}`,
    );
  }
});

test("les cinq pages sont servies par NOUS, l'affiliation reste maintenue ailleurs", () => {
  const locaux = LIENS_LEGAUX.filter((l) => l.href.startsWith("/"));
  assert.equal(
    locaux.length,
    LEGAL_SLUGS.length,
    "Chacune des cinq pages doit etre un lien LOCAL du pied de page.",
  );
  for (const slug of LEGAL_SLUGS) {
    assert.ok(
      locaux.some((l) => l.href === LEGAL_PATHS[slug]),
      `${slug} n'est pas dans le pied de page.`,
    );
  }
  // L'exception, et sa RAISON doit rester ecrite a cote : les
  // conditions du programme vivent sur l'espace affilie, et une copie
  // ici divergerait. Une exemption sans raison est une exemption que le
  // prochain passage prend pour un oubli.
  const affiliation = LIENS_LEGAUX.find((l) => l.texte === "Affiliation");
  assert.ok(affiliation, "le lien Affiliation a disparu");
  assert.match(affiliation.href, /^https:\/\/affiliate\.tipote\.com/);
});

test("les CGV decrivent CE produit, pas l'abonnement de Tiquiz", () => {
  const cgv = JSON.stringify(getLegalPage("terms"));
  assert.match(cgv, /paiement unique/i, "les CGV doivent dire que le paiement est unique");
  assert.match(cgv, /47,00 €/, "les CGV doivent porter le prix affiche");
  assert.match(cgv, /trente jours/i, "les CGV doivent porter la garantie 30 jours");
  assert.doesNotMatch(
    cgv,
    /reconduction automatique s'applique|prélèvement automatique à chaque échéance/i,
    "Ce sont les CGV d'un ABONNEMENT : l'Atelier est un achat unique.",
  );
  assert.doesNotMatch(
    cgv,
    /Aucun remboursement ne peut être accordé/i,
    "Les CGV ne peuvent pas etre PLUS restrictives que la page de vente, " +
      "qui promet une garantie 30 jours.",
  );
});

test("la garantie des CGV dit la MEME chose que le bon de commande", () => {
  // Bene, 31 aout : "c'est 30j et si aucun lead capture malgre les
  // conseils appliques, on rembourse." La condition doit etre ecrite
  // des DEUX cotes, et le titre ne doit pas promettre plus.
  const article = getLegalPage("terms").sections.find((s) => s.h.includes("Garantie"));
  assert.ok(article, "pas d'article Garantie dans les CGV");
  const texte = JSON.stringify(article);

  // Le titre du bon de commande ne promet pas l'inconditionnel.
  assert.doesNotMatch(
    BON,
    /sans poser de questions/i,
    "Le bon de commande promettrait une garantie inconditionnelle que les CGV refusent.",
  );
  assert.match(BON, /Garantie 30 jours/);

  // La duree et la condition, des deux cotes.
  assert.match(texte, /trente jours/i);
  assert.match(texte, /appliqué les conseils/i);
  assert.match(texte, /aucun contact/i);
  assert.match(BON, /appliques les conseils|appliques? les conseils/i);
  assert.match(BON, /aucun contact/i);

  // Et aucun justificatif n'est exige : c'est ce que la page promet.
  assert.match(texte, /[Aa]ucun justificatif n'est exigé/);
});

test("le bon de commande recueille VRAIMENT les CGV et la renonciation", () => {
  // C'est la moitie qui manquait cote Tiquiz le 22 aout : le texte
  // promettait une renonciation que l'ecran ne recueillait pas.
  assert.match(COMMANDE, /Conditions générales de vente/);
  assert.match(COMMANDE, /L221-25/);
  assert.match(COMMANDE, /L221-28/);
  assert.match(COMMANDE, /renonces expressément/);
  const cgv = JSON.stringify(getLegalPage("terms"));
  assert.match(
    cgv,
    /recueillie sur le bon de commande, avant le paiement/i,
    "l'article 6 doit dire OU la renonciation est recueillie",
  );
});

test("les liens legaux du paiement ouvrent un nouvel onglet", () => {
  // Un paiement est en cours : faire quitter la page fait tout
  // reprendre (regle du 24 aout).
  const bloc = COMMANDE.slice(COMMANDE.indexOf("mentionsLegales"));
  const liens = bloc.match(/<a\s[\s\S]*?>/g) ?? [];
  assert.ok(liens.length >= 2, "les deux liens legaux ont disparu du bon de commande");
  for (const a of liens) {
    assert.match(a, /target="_blank"/, `lien sans nouvel onglet : ${a}`);
    assert.match(a, /rel="noopener noreferrer"/, `lien sans rel de securite : ${a}`);
  }
  assert.doesNotMatch(bloc, /<Link\s/, "un lien legal ne passe jamais par <Link> de Next");
});

test("la renonciation est rendue dans les TROIS branches du composant", () => {
  // La branche d'erreur carte et la branche sans cle Stripe laissent
  // toutes les deux payer par PayPal. Une regle recopiee dans une seule
  // branche finit toujours par en oublier une.
  const rendus = COMMANDE.match(/\{mentionsLegales\}/g) ?? [];
  assert.equal(rendus.length, 3, `rendue ${rendus.length} fois au lieu de 3`);
});

test("l'identite du vendeur des pages vient de COMPANY, jamais recopiee", () => {
  const mentions = JSON.stringify(getLegalPage("legal"));
  assert.ok(mentions.includes(COMPANY.rcs), "le RCS des mentions ne vient pas de COMPANY");
  assert.ok(mentions.includes(COMPANY.vat), "la TVA des mentions ne vient pas de COMPANY");
  assert.ok(mentions.includes(COMPANY.address), "l'adresse ne vient pas de COMPANY");
});

test("on ne s'adresse pas au lecteur au feminin sur le chemin d'achat", () => {
  // Bene, 23 et 24 aout : "arrete de penser que je n'ai que des users
  // feminines". Les prenoms de ces depots le disent : Francois Xavier,
  // Eric, Maurice, Ivan. Un accord au feminin sur la page ou quelqu'un
  // sort sa carte dit "ce produit n'est pas pour toi".
  //
  // On ne regarde QUE l'adresse directe au lecteur, et on saute les
  // commentaires de code : un test qui rougit pour rien finit desactive.
  for (const [nom, source] of [["bon de commande", BON], ["paiement", COMMANDE]] as const) {
    const lignes = source
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
    const fautes = lignes.filter((l) =>
      /\btu (es|seras) [a-zà-ÿ]*(?:ée|ue)\b/i.test(l) || /\b(prêt·e|inscrit·e|affilié·e)\b/i.test(l),
    );
    assert.deepEqual(fautes, [], `accord au feminin dans le ${nom}`);
  }
});
