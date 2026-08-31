import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

/**
 * LES CGV DE L'ATELIER DU QUIZ.
 *
 * **Ce ne sont PAS celles de Tiquiz, et la différence est le coeur du
 * fichier.** Tiquiz vend un ABONNEMENT et n'accorde aucun
 * remboursement ; l'Atelier vend un ACHAT UNIQUE à vie, à 47 € TTC,
 * avec une garantie 30 jours. Recopier les CGV de Tiquiz aurait
 * promis l'inverse de ce que la page de vente annonce.
 *
 * **RÈGLE : les CGV ne sont JAMAIS plus restrictives que la page de
 * vente.** C'est le drame du 22 août côté Tiquiz, où l'article 5
 * annonçait une renonciation que l'écran ne recueillait pas. Ici le
 * bon de commande dit "Garantie 30 jours, sans poser de questions" :
 * l'article 7 dit donc exactement ça, sans condition de résultat, sans
 * justificatif, et sans "à la discrétion du Vendeur".
 */
const fr: LegalPage = {
  title: "Conditions générales de vente",
  lastUpdated: "Dernière mise à jour : 31/08/2026",
  intro: `Les présentes conditions générales de vente régissent les relations entre ${C.name} (${C.form} au capital de ${C.capital}, RCS ${C.rcs}, TVA ${C.vat}, siège social ${C.address}), ci-après "le Vendeur", et toute personne qui commande ${C.product} sur atelierduquiz.fr, ci-après "le Client".`,
  sections: [
    {
      h: "Article 1 - Objet",
      body: [
        `Les présentes conditions définissent les modalités de vente et d'accès à ${C.product}, formation en ligne à la création de quiz de qualification, accessible à distance sur quizing.tipote.com.`,
      ],
    },
    {
      h: "Article 2 - Description de la formation",
      body: [
        "La formation est un contenu numérique fourni à distance, composé de modules quotidiens, de ressources écrites et téléchargeables, d'outils d'accompagnement et d'un espace communautaire. Elle comprend un assistant conversationnel fondé sur l'intelligence artificielle.",
        "Le Vendeur peut faire évoluer, enrichir ou réorganiser le contenu pédagogique à tout moment. Ces évolutions sont incluses dans l'accès du Client, sans supplément.",
      ],
    },
    {
      h: "Article 3 - Prix",
      body: [
        `${C.product} est vendu au prix de 47,00 € TTC, en un paiement unique. Le prix est indiqué en euros, toutes taxes comprises. La taxe applicable est déterminée par le pays de l'acheteur, conformément à la réglementation en vigueur.`,
        "Le Vendeur peut modifier son prix à tout moment. Le prix applicable est celui affiché sur le bon de commande au moment de la commande.",
      ],
    },
    {
      h: "Article 4 - Commande et paiement",
      body: [
        "La commande se fait exclusivement en ligne, sur atelierduquiz.fr. Le contrat est formé dès la validation du paiement et l'acceptation des présentes conditions.",
        "Les paiements sont réalisés par carte bancaire via Stripe, ou via PayPal. Le Vendeur n'a jamais accès aux coordonnées bancaires du Client, qui sont traitées directement par ces prestataires.",
        "Le paiement est unique : aucun prélèvement récurrent n'est mis en place, et aucune reconduction automatique n'existe pour cette offre.",
      ],
    },
    {
      h: "Article 5 - Accès et durée",
      body: [
        "L'accès est ouvert immédiatement après validation du paiement. Le Client reçoit par email un lien de connexion à son espace personnel.",
        "L'accès est accordé à vie, c'est à dire sans limite de durée, et comprend les mises à jour ultérieures du contenu. Le Vendeur s'engage à maintenir la formation accessible ou, en cas d'arrêt du service, à en informer les Clients dans un délai raisonnable et à leur permettre de récupérer les ressources téléchargeables.",
        "L'accès est personnel, non exclusif et non transférable. Le Client est responsable de la confidentialité de ses identifiants et s'engage à signaler toute utilisation frauduleuse.",
      ],
    },
    {
      h: "Article 6 - Droit de rétractation",
      body: [
        "L'accès à la formation étant ouvert immédiatement après le paiement, le Client consommateur demande expressément l'exécution du contrat avant la fin du délai de rétractation de quatorze jours et renonce expressément à ce droit, conformément aux articles L221-25 et L221-28 3° du Code de la consommation.",
        "Cette renonciation est recueillie sur le bon de commande, avant le paiement.",
        "Cette renonciation ne prive le Client d'aucun droit : la garantie commerciale prévue à l'article 7 est plus longue et plus favorable que le délai légal auquel il renonce.",
      ],
    },
    {
      h: "Article 7 - Garantie 30 jours",
      body: [
        "Le Vendeur accorde une garantie commerciale de trente jours calendaires à compter de la date de paiement.",
        "Pendant ce délai, le Client peut demander le remboursement intégral de sa commande par simple email à " + C.email + ", sans avoir à se justifier et sans condition de résultat.",
        "Le remboursement est effectué dans un délai de sept jours suivant la demande, sur le moyen de paiement utilisé lors de la commande. L'accès à la formation est clôturé au moment du remboursement.",
      ],
    },
    {
      h: "Article 8 - Obligations du Client",
      body: [
        "Le Client s'engage à ne pas partager ses identifiants, à ne pas reproduire, diffuser, revendre ni mettre à disposition de tiers, à titre gratuit ou onéreux, tout ou partie du contenu de la formation.",
        "Le Client s'engage à un usage respectueux de l'espace communautaire et de l'assistant conversationnel.",
      ],
    },
    {
      h: "Article 9 - Suspension et résiliation pour faute",
      body: [
        "Le Vendeur peut suspendre ou clôturer l'accès sans préavis en cas de partage d'identifiants, de diffusion du contenu, de fraude au paiement ou d'usage abusif. Dans ce cas, aucun remboursement n'est dû.",
      ],
    },
    {
      h: "Article 10 - Responsabilité",
      body: [
        "Le Vendeur est tenu à une obligation de moyens quant à la fourniture de la formation. Il ne garantit aucun résultat commercial : les résultats dépendent de la mise en oeuvre par le Client, de son marché et de facteurs qui échappent au Vendeur.",
        "Les contenus produits par l'assistant conversationnel sont générés automatiquement et peuvent comporter des erreurs ou des inexactitudes. Le Client reste seul responsable de leur vérification et de leur usage.",
        "La responsabilité du Vendeur est limitée au montant effectivement payé par le Client. Les dommages indirects sont exclus.",
      ],
    },
    {
      h: "Article 11 - Propriété intellectuelle",
      body: [
        `L'ensemble du contenu de ${C.product} (textes, vidéos, modèles, méthode, marques et logos) est protégé et reste la propriété du Vendeur. Le Client dispose d'un droit d'usage personnel, non exclusif et non transférable.`,
        "Les contenus créés par le Client à l'aide de la formation (ses quiz, ses textes, ses images) restent sa propriété pleine et entière.",
      ],
    },
    {
      h: "Article 12 - Programme d'affiliation",
      body: [
        "Le programme d'affiliation fait l'objet de conditions distinctes, consultables dans l'espace affilié sur affiliate.tipote.com. L'adhésion au programme est facultative et indépendante de l'achat de la formation.",
      ],
    },
    {
      h: "Article 13 - Données personnelles",
      body: [
        "Le traitement des données personnelles est décrit dans la Politique de confidentialité, accessible sur atelierduquiz.fr.",
      ],
    },
    {
      h: "Article 14 - Modification des conditions",
      body: [
        "Le Vendeur peut modifier les présentes conditions à tout moment. Les conditions applicables à une commande sont celles en vigueur au jour de cette commande, et les modifications ultérieures ne s'y appliquent pas.",
      ],
    },
    {
      h: "Article 15 - Médiation de la consommation",
      body: [
        "Conformément à l'article L612-1 du Code de la consommation, le Client consommateur peut recourir gratuitement à un médiateur de la consommation : CM2C, 14 rue Saint-Jean, 75017 Paris, www.cm2c.net.",
        "La plateforme européenne de règlement en ligne des litiges est également accessible à l'adresse ec.europa.eu/consumers/odr.",
      ],
    },
    {
      h: "Article 16 - Droit applicable et juridiction",
      body: [
        "Les présentes conditions sont soumises au droit français. Le Client consommateur conserve le bénéfice des règles de compétence légales. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier sont seuls compétents.",
      ],
    },
  ],
};

export const terms = fr;
