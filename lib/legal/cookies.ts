import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Politique de cookies",
  lastUpdated: "Dernière mise à jour : 31/08/2026",
  intro:
    "Un cookie est un petit fichier déposé sur l'appareil du visiteur. Cette page dit lesquels sont utilisés, à quoi ils servent, et lesquels demandent un accord préalable.",
  sections: [
    {
      h: "Les cookies strictement nécessaires",
      body: [
        "Ils permettent au service de fonctionner et ne demandent pas de consentement.",
        [
          "Session de connexion : garde l'accès ouvert d'une page à l'autre.",
          "Sécurité : protège les formulaires contre les envois frauduleux.",
          "Suivi d'affiliation : lorsque la visite provient du lien d'un affilié, un cookie conserve ce lien afin que la commission lui soit attribuée. Il est conservé un an.",
        ],
      ],
    },
    {
      h: "Les cookies de mesure d'audience",
      body: [
        "Les pages de vente utilisent Google Analytics pour compter les visites et comprendre quelles pages sont lues.",
        "Ces cookies ne sont déposés qu'APRÈS accord donné dans le bandeau. Tant que rien n'a été accepté, le mode Consentement de Google est réglé sur refus et aucune mesure n'est enregistrée.",
      ],
    },
    {
      h: "Ce qui n'est pas utilisé",
      body: [
        "Aucun cookie publicitaire, aucun reciblage et aucune revente de données de navigation.",
      ],
    },
    {
      h: "Refuser ou retirer son accord",
      body: [
        "Le choix se modifie à tout moment depuis le bandeau de cookies des pages de vente.",
        "Le navigateur permet également de bloquer ou de supprimer les cookies déjà déposés. Bloquer les cookies strictement nécessaires empêche la connexion au service.",
      ],
    },
    {
      h: "Durée de conservation",
      body: [
        [
          "Session de connexion : durée de la session, ou jusqu'à la déconnexion.",
          "Suivi d'affiliation : un an.",
          "Mesure d'audience : treize mois au maximum.",
        ],
      ],
    },
    {
      h: "Une question",
      body: [`Toute question sur ces cookies peut être adressée à ${C.email}.`],
    },
  ],
};

export const cookies = fr;
