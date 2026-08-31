import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

/**
 * LA POLITIQUE DE CONFIDENTIALITÉ DE L'ATELIER.
 *
 * **Les sous-traitants listés ici ont été RELEVÉS DANS LE CODE, pas
 * supposés** (31 août 2026) : Supabase, Stripe, PayPal, Anthropic pour
 * l'assistant, Resend pour les emails transactionnels, Systeme.io pour
 * les séquences email et les tunnels historiques, Google Analytics sur
 * les pages de vente (derrière le consentement).
 *
 * Une politique qui nomme un sous-traitant qu'on n'utilise pas, ou qui
 * en oublie un qu'on utilise, est pire qu'une politique absente : elle
 * affirme.
 */
const fr: LegalPage = {
  title: "Politique de confidentialité",
  lastUpdated: "Dernière mise à jour : 31/08/2026",
  intro: `${C.name} (${C.form}, RCS ${C.rcs}, siège ${C.address}) est responsable du traitement des données collectées sur atelierduquiz.fr et dans l'espace de formation ${C.product}. Cette page décrit ce qui est collecté, pourquoi, pour combien de temps, et comment exercer ses droits.`,
  sections: [
    {
      h: "Les données collectées",
      body: [
        [
          "Compte : adresse email, prénom et nom lorsqu'ils sont renseignés.",
          "Commande et facturation : identité de facturation, adresse, pays, numéro de TVA le cas échéant, montant et date de la commande.",
          "Paiement : aucune coordonnée bancaire n'est reçue ni conservée par l'éditeur. Les paiements sont traités directement par Stripe et PayPal.",
          "Progression pédagogique : avancement dans les modules, notes et réponses saisies dans les outils de la formation.",
          "Échanges avec l'assistant conversationnel : le contenu des questions posées et des réponses reçues.",
          "Support : le contenu des demandes adressées au support.",
          "Données techniques : adresse IP, journaux de connexion et de sécurité.",
        ],
      ],
    },
    {
      h: "Pourquoi ces données sont traitées",
      body: [
        [
          "Fournir l'accès à la formation et en assurer le fonctionnement : exécution du contrat.",
          "Émettre les factures et respecter les obligations comptables et fiscales : obligation légale.",
          "Répondre aux demandes de support : exécution du contrat.",
          "Envoyer des informations sur la formation et les nouveautés : consentement, révocable à tout moment.",
          "Assurer la sécurité du service et prévenir la fraude : intérêt légitime.",
          "Mesurer l'audience des pages de vente : consentement, recueilli par le bandeau cookies.",
        ],
      ],
    },
    {
      h: "Combien de temps elles sont conservées",
      body: [
        [
          "Compte et progression : pendant toute la durée de l'accès, puis trois ans après le dernier contact.",
          "Factures et pièces comptables : dix ans, durée légale de conservation.",
          "Échanges avec l'assistant et le support : trois ans.",
          "Journaux techniques : douze mois.",
          "Données de mesure d'audience : treize mois au maximum.",
        ],
      ],
    },
    {
      h: "Qui a accès à ces données",
      body: [
        "Les données ne sont ni vendues, ni louées, ni cédées à des tiers à des fins commerciales. Elles sont accessibles à l'éditeur et aux prestataires strictement nécessaires au fonctionnement du service, qui agissent en sous-traitants :",
        [
          "Supabase : base de données et authentification.",
          "Hostinger : hébergement de l'application, serveur situé à Paris, France.",
          "Stripe et PayPal : traitement des paiements et émission des reçus.",
          "Resend : envoi des emails transactionnels (connexion, confirmation de commande).",
          "ITACWT Limited (Systeme.io), Dublin, Irlande : envoi des séquences email et pages marketing historiques.",
          "Anthropic : traitement des requêtes adressées à l'assistant conversationnel.",
          "Google Ireland Limited : mesure d'audience sur les pages de vente, uniquement après consentement.",
        ],
      ],
    },
    {
      h: "Transferts hors de l'Union européenne",
      body: [
        "Certains sous-traitants sont établis hors de l'Union européenne, notamment aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou, le cas échéant, par une décision d'adéquation.",
      ],
    },
    {
      h: "L'assistant conversationnel",
      body: [
        "Les questions posées à l'assistant sont transmises au fournisseur du modèle pour produire une réponse. Il est recommandé de ne pas y saisir de données sensibles ni de données personnelles concernant des tiers.",
        "Ces échanges ne sont pas utilisés pour entraîner des modèles.",
      ],
    },
    {
      h: "Les droits sur ces données",
      body: [
        "Toute personne dispose d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, ainsi que du droit de définir des directives relatives au sort de ses données après son décès.",
        `Ces droits s'exercent par email à ${C.email}. Une réponse est apportée dans un délai d'un mois.`,
        "En cas de désaccord, une réclamation peut être adressée à la CNIL, 3 place de Fontenoy, 75007 Paris, www.cnil.fr.",
      ],
    },
    {
      h: "Sécurité",
      body: [
        "L'accès aux données est restreint et journalisé. Les échanges avec le service sont chiffrés en transit. Les sauvegardes sont automatiques et régulières.",
      ],
    },
    {
      h: "Cookies",
      body: [
        "L'usage des cookies est décrit dans la Politique de cookies.",
      ],
    },
    {
      h: "Modification de cette politique",
      body: [
        "Cette politique peut évoluer. La date de dernière mise à jour figure en haut de la page.",
      ],
    },
  ],
};

export const privacy = fr;
