// tests/logic/seo-page-vente.test.mts
//
// CE QUE LA PAGE DE VENTE DIT AUX MOTEURS, ET À QUI ELLE ENVOIE.
//
// Trois défauts constatés en ligne le 1er septembre 2026, et les trois
// étaient invisibles depuis le code :
//
//  1. la page servait DEUX balises `<title>`. `stripHeadTags` visait
//     `<title>` NU, alors que Systeme.io publie
//     `<title data-react-helmet="true">` : le retrait ne mordait pas, et
//     Google choisissait lui même lequel afficher ;
//  2. la liste complète de ses liens sortants tenait en une poignée
//     d'adresses, et QUATRE partaient chez `www.tipote.fr`, dont SA
//     PROPRE COPIE. Depuis la page qui doit remplacer l'ancienne, un
//     lien vers l'ancienne la désigne comme celle qui fait autorité ;
//  3. elle ne portait qu'un bloc `FAQPage` : rien ne disait à un moteur
//     que ce domaine EST le site de « l'Atelier du Quiz ».
//
// Le test porte sur la VRAIE capture : un test qui n'exercerait qu'une
// chaîne écrite à la main aurait été vert le jour du bug.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { OWNER_CATALOG } from "@/lib/checkout/catalog";
import { SALES_SITE_LINKS, rewriteSiteLinks } from "@/lib/sales/salesPageLinks";
import { renderSalesPage, stripHeadTags } from "@/lib/sales/servePage";

const CAPTURE = path.join(process.cwd(), "content", "sales", "atelier-du-quiz.html");

const MARQUE = {
  nom: "L'Atelier du Quiz",
  logo: "https://atelierduquiz.fr/quizing.png",
  sameAs: ["https://tiquiz.fr/"],
  formation: {
    nom: OWNER_CATALOG.atelier.label,
    prix: (OWNER_CATALOG.atelier.amountCents / 100).toFixed(2),
    url: "https://atelierduquiz.fr/commande/atelier",
    description: "Sept jours, une action par jour.",
  },
};

function rendu(publique: boolean): string {
  return renderSalesPage(
    fs.readFileSync(CAPTURE, "utf8"),
    {
      slug: "atelier-du-quiz",
      canonical: "https://atelierduquiz.fr/",
      title: "L'Atelier du Quiz",
      description: "Description.",
      locale: "fr_FR",
      marque: publique ? MARQUE : undefined,
    },
    {
      indexable: publique,
      analytics: false,
      checkoutHref: "/commande/atelier",
      siteLinks: publique ? SALES_SITE_LINKS["atelier-du-quiz"] : null,
    },
  );
}

function liens(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
}

test("le titre de la capture est retire, attributs compris", () => {
  assert.equal(
    stripHeadTags(`<head><title data-react-helmet="true">Capture</title></head>`).includes("Capture"),
    false,
  );
  assert.equal(stripHeadTags(`<head><title>Nu</title></head>`).includes("Nu"), false);
  // `<title\b` exige une frontiere de mot : un <titlebar> reste entier.
  assert.equal(stripHeadTags(`<titlebar>Garde moi</titlebar>`).includes("Garde moi"), true);
});

test("la page ne porte QU'UN titre et QU'UNE canonique", () => {
  const html = rendu(true);
  assert.equal((html.match(/<title\b/gi) ?? []).length, 1, "deux titres, Google choisit");
  assert.equal((html.match(/rel=["']?canonical/gi) ?? []).length, 1);
  assert.equal((html.match(/name=["']description["']/gi) ?? []).length, 1);
});

test("les liens legaux menent a NOS routes, pas a celles de Systeme.io", () => {
  // LE PIÈGE QUE CE TEST FERME. Les chemins de Systeme.io
  // (`/mentions-legales`, `/politique-de-confidentialite`,
  // `/atelier-du-quiz-cgv`) n'existent PAS chez nous : les recopier
  // aurait posé des 404 dans le pied de page de la page qui vend.
  const tous = liens(rendu(true));
  for (const chemin of ["/", "/legal", "/privacy", "/terms"]) {
    assert.ok(tous.includes(chemin), `le pied de page doit mener à ${chemin}`);
    if (chemin === "/") continue;
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "app", chemin.slice(1))),
      `${chemin} n'existe pas dans app/ : le pied de page mène à un 404`,
    );
  }
  for (const ancien of Object.keys(SALES_SITE_LINKS["atelier-du-quiz"])) {
    assert.equal(
      tous.some((h) => h.toLowerCase() === ancien.toLowerCase()),
      false,
      `${ancien} traîne encore dans la page`,
    );
  }
});

test("derriere la cle d'apercu, on ne touche a aucun lien de site", () => {
  const tous = liens(rendu(false));
  assert.ok(tous.includes("https://www.tipote.fr/mentions-legales"));
  assert.equal(tous.includes("/legal"), false);
});

test("ce qui suit le ? est conserve, et l'inconnu n'est pas touche", () => {
  const cibles = { "https://www.tipote.fr/mentions-legales": "/legal" };
  const a = rewriteSiteLinks(`<a href="https://www.tipote.fr/mentions-legales?x=1">m</a>`, cibles);
  assert.ok(a.html.includes(`href="/legal?x=1"`));
  const b = rewriteSiteLinks(`<a href="https://www.tipote.fr/autre-chose">m</a>`, cibles);
  assert.ok(b.html.includes("https://www.tipote.fr/autre-chose"));
});

test("la marque se declare, et le produit est un COURS", () => {
  // LE TYPE COMPTE. L'Atelier est une formation de sept jours, pas un
  // logiciel : annoncer `SoftwareApplication` serait pire que ne rien
  // annoncer, un moteur qui lit une contradiction cesse de faire
  // confiance au reste du bloc.
  const blocs = [...rendu(true).matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
  )].map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));
  const graphe = blocs.find((b) => Array.isArray(b["@graph"]));
  assert.ok(graphe, "aucun bloc Organization + WebSite");
  const types = graphe["@graph"].map((x: { "@type": string }) => x["@type"]);
  assert.deepEqual(types, ["Organization", "WebSite", "Course"]);

  const cours = graphe["@graph"][2];
  // `hasCourseInstance` est EXIGÉ par Google pour qu'un `Course` soit
  // valide : sans lui, le bloc est ignoré en silence.
  assert.equal(cours.hasCourseInstance["@type"], "CourseInstance");
  // LE PRIX VIENT DU CATALOGUE. Un tarif recopié ici et le tarif du bon
  // de commande finiraient par diverger, et c'est Google qui
  // afficherait l'ancien, longtemps après la correction.
  assert.equal(cours.offers.price, (OWNER_CATALOG.atelier.amountCents / 100).toFixed(2));
});

test("derriere la cle, la marque ne se declare PAS", () => {
  // Deux pages qui prétendent être le site officiel se font
  // concurrence sur exactement la même requête.
  assert.equal(rendu(false).includes('"@graph"'), false);
});

test("le sitemap et le robots existent, et le sitemap ne liste aucun certificat", () => {
  const sitemap = fs.readFileSync(path.join(process.cwd(), "app", "sitemap.ts"), "utf8");
  const robots = fs.readFileSync(path.join(process.cwd(), "app", "robots.ts"), "utf8");
  assert.match(robots, /sitemap:/, "le robots.txt doit déclarer le sitemap");
  // Chaque certificat porte le jeton d'une personne réelle : une liste
  // de jetons est une liste de clients. Ils restent indexables un par
  // un, on ne publie pas l'annuaire.
  assert.equal(sitemap.includes('"/cert'), false, "le sitemap listerait des clients");
  for (const chemin of ["/legal", "/terms", "/terms-of-use", "/privacy", "/cookies"]) {
    assert.ok(sitemap.includes(`"${chemin}"`), `${chemin} manque au sitemap`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "app", chemin.slice(1))),
      `${chemin} est annoncé au sitemap mais n'existe pas`,
    );
  }
});
