import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales d'utilisation",
  lastUpdated: "Dernière mise à jour : 31/08/2026",
  intro: `Les présentes conditions encadrent l'utilisation du site atelierduquiz.fr et de l'espace de formation ${C.product}, édités par ${C.name}. Elles complètent les Conditions générales de vente, qui régissent l'achat.`,
  sections: [
    {
      h: "Article 1 - Acceptation",
      body: [
        "L'utilisation du site et de l'espace de formation implique l'acceptation pleine et entière des présentes conditions. L'utilisateur qui ne les accepte pas doit renoncer à utiliser le service.",
      ],
    },
    {
      h: "Article 2 - Accès au service",
      body: [
        "Le site est accessible librement. L'espace de formation est réservé aux personnes ayant acquis un accès.",
        "Le service est fourni en l'état et accessible en continu, sauf interruption pour maintenance, mise à jour ou cas de force majeure. L'éditeur s'efforce de prévenir des interruptions programmées lorsque c'est possible.",
      ],
    },
    {
      h: "Article 3 - Compte et identifiants",
      body: [
        "L'utilisateur s'engage à fournir des informations exactes lors de la création de son compte, à préserver la confidentialité de ses identifiants et à signaler sans délai toute utilisation non autorisée.",
        "Un accès est strictement personnel. Le partage d'identifiants entraîne la suspension de l'accès, sans remboursement.",
      ],
    },
    {
      h: "Article 4 - Usage attendu",
      body: [
        "L'utilisateur s'engage à ne pas perturber le fonctionnement du service, à ne pas tenter d'accéder à des espaces non autorisés, à ne pas extraire massivement le contenu, et à ne pas utiliser le service à des fins illicites.",
        "Dans l'espace communautaire, l'utilisateur s'engage à un ton respectueux et s'interdit tout propos injurieux, discriminatoire ou diffamatoire, ainsi que toute publicité non sollicitée.",
      ],
    },
    {
      h: "Article 5 - Assistant conversationnel",
      body: [
        "La formation comprend un assistant fondé sur l'intelligence artificielle. Ses réponses sont générées automatiquement, peuvent comporter des erreurs et ne constituent ni un conseil juridique, ni un conseil fiscal, ni une garantie de résultat.",
        "L'utilisateur reste responsable de la vérification et de l'usage des contenus produits. Les échanges peuvent être conservés pour assurer le fonctionnement du service et en améliorer la qualité, dans les conditions décrites par la Politique de confidentialité.",
      ],
    },
    {
      h: "Article 6 - Contenus créés par l'utilisateur",
      body: [
        "Les contenus créés par l'utilisateur restent sa propriété. Il garantit détenir les droits nécessaires sur les éléments qu'il publie, notamment les textes et les images, et reste seul responsable de leur légalité.",
      ],
    },
    {
      h: "Article 7 - Propriété intellectuelle de l'éditeur",
      body: [
        `Le contenu pédagogique, la méthode, les modèles, les marques et les logos de ${C.product} restent la propriété de ${C.name}. L'accès confère un droit d'usage personnel, non exclusif et non transférable, et n'emporte aucune cession de droits.`,
      ],
    },
    {
      h: "Article 8 - Suspension",
      body: [
        "L'éditeur peut suspendre ou clôturer un accès en cas de manquement aux présentes conditions, sans préavis lorsque le manquement est grave, et sans remboursement dans les cas prévus par les Conditions générales de vente.",
      ],
    },
    {
      h: "Article 9 - Données personnelles",
      body: [
        "Les traitements de données sont décrits dans la Politique de confidentialité.",
      ],
    },
    {
      h: "Article 10 - Modification",
      body: [
        "L'éditeur peut modifier les présentes conditions. La version applicable est celle publiée sur le site au moment de l'utilisation.",
      ],
    },
    {
      h: "Article 11 - Droit applicable",
      body: [
        "Les présentes conditions sont soumises au droit français.",
      ],
    },
  ],
};

export const termsOfUse = fr;
