// tests/logic/coach-routing.test.mts
//
// Le coach commun (Béné, 2 août 2026) : "il répond à 2 questions par jour
// puis il renvoie vers un plan payant de Tiquiz OU vers l'Atelier suivant
// les besoins de l'user. Si question technique : plan payant. Si question
// stratégie : Atelier." Et sur l'argent : "oui toujours affilié, je ne
// veux jamais les léser."
//
// Ce test protège deux promesses commerciales. Une erreur ici, ce n'est
// pas un pixel : c'est vendre la mauvaise chose à quelqu'un, ou voler
// une commission à un affilié.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  classifyCoachNeed,
  buildCoachUpsell,
  guestQuota,
  GUEST_DAILY_QUESTIONS,
  TIQUIZ_PLANS_URL,
  ATELIER_URL,
} from "../../lib/coach/needRouting.ts";

describe("Technique ou stratégie : vers quoi on oriente", () => {
  test("un blocage dans l'outil mène au plan payant", () => {
    for (const q of [
      "Où est le bouton pour publier mon quiz ?",
      "Je ne trouve pas le réglage pour changer la couleur",
      "Comment faire pour exporter mes leads en CSV ?",
      "J'ai un message d'erreur quand j'intègre mon quiz",
      "Le tag Systeme.io ne fonctionne pas",
      "J'ai atteint la limite du plan gratuit",
    ]) {
      assert.equal(classifyCoachNeed(q), "technique", q);
    }
  });

  test("un blocage de méthode mène à l'Atelier", () => {
    for (const q of [
      "Je ne sais pas quel type de quiz choisir, profil ou score ?",
      "Par où je commence pour trouver une idée de quiz ?",
      "Quelles questions poser à mon audience ?",
      "Mon quiz ne convertit pas, personne ne répond",
      "Je suis perdue, je ne sais pas quoi vendre après le quiz",
      "Quelle stratégie pour ma séquence email ?",
    ]) {
      assert.equal(classifyCoachNeed(q), "strategie", q);
    }
  });

  test("dans le doute : stratégie", () => {
    // Proposer un abonnement a quelqu'un qui cherche de la methode, c'est
    // lui vendre la mauvaise chose ; il revient decu. L'inverse coute une
    // hesitation.
    assert.equal(classifyCoachNeed("Bonjour"), "strategie");
    assert.equal(classifyCoachNeed(""), "strategie");
    assert.equal(classifyCoachNeed("j'ai besoin d'aide"), "strategie");
  });

  test("le cas exact de Véronique tombe du bon côté", () => {
    // Elle avait choisi le mauvais mode : c'est de la methode, pas un
    // reglage. C'est l'Atelier qui l'a debloquee, et c'est vers lui qu'il
    // faut envoyer la prochaine.
    assert.equal(
      classifyCoachNeed("Je crois que je ne comprends pas la manière de scorer"),
      "strategie",
    );
  });
});

describe("Le lien porte l'affilié quand on connaît le PARRAIN", () => {
  test("technique : plans Tiquiz, avec le sa", () => {
    const u = buildCoachUpsell("technique", "sa0007878317200141bbe3de2b6644176621db2c6580");
    assert.equal(u.url, `${TIQUIZ_PLANS_URL}?sa=sa0007878317200141bbe3de2b6644176621db2c6580`);
  });

  test("stratégie : l'Atelier, avec le sa", () => {
    const u = buildCoachUpsell("strategie", "sa0007878317200141bbe3de2b6644176621db2c6580");
    assert.equal(u.url, `${ATELIER_URL}?sa=sa0007878317200141bbe3de2b6644176621db2c6580`);
  });

  test("parrain inconnu : lien nu, et c'est VOLONTAIRE", () => {
    // Les inscrits arrivent de Systeme.io, qui a deja pose son cookie
    // d'affiliation. Un lien nu laisse ce cookie decider, donc l'affilie
    // qui a reellement amene la personne touche sa commission. Coller un
    // sa par defaut ecraserait cette attribution.
    assert.equal(buildCoachUpsell("technique", null).url, TIQUIZ_PLANS_URL);
    assert.equal(buildCoachUpsell("technique", "").url, TIQUIZ_PLANS_URL);
    assert.equal(buildCoachUpsell("technique", "   ").url, TIQUIZ_PLANS_URL);
  });

  test("une valeur douteuse est refusée, pas collée dans l'URL", () => {
    // Meme regle que l'espace affiliation : un identifiant Systeme.io,
    // rien d'autre. Un "sa" trop court n'en est pas un.
    for (const junk of ["https://evil.test", "sa 123", "a", "x".repeat(200), "?utm=1", "sa123"]) {
      assert.equal(buildCoachUpsell("strategie", junk).url, ATELIER_URL, junk);
    }
  });
});

describe("Deux questions par jour pour les gratuits", () => {
  test("la première passe, et il en reste une", () => {
    assert.deepEqual(guestQuota(0), { allowed: true, remaining: 1, isLast: false });
  });

  test("la deuxième passe, et c'est la dernière", () => {
    // On repond A la question ET on propose la suite : on ne coupe
    // jamais quelqu'un au milieu d'une phrase pour lui vendre un truc.
    assert.deepEqual(guestQuota(1), { allowed: true, remaining: 0, isLast: true });
  });

  test("la troisième est refusée", () => {
    assert.equal(guestQuota(2).allowed, false);
    assert.equal(guestQuota(99).allowed, false);
  });

  test("un compteur absurde ne rend pas le coach gratuit à vie", () => {
    assert.equal(guestQuota(-5).allowed, true);
    assert.equal(guestQuota(-5).remaining, GUEST_DAILY_QUESTIONS - 1);
  });
});
