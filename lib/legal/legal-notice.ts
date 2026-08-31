import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Mentions légales",
  lastUpdated: "Dernière mise à jour : 31/08/2026",
  sections: [
    {
      h: "Éditeur du site",
      body: [
        [
          `Raison sociale : ${C.name} (${C.form})`,
          `Capital social : ${C.capital}`,
          `RCS : ${C.rcs}`,
          `Numéro de TVA intracommunautaire : ${C.vat}`,
          `Siège social : ${C.address}`,
          `Directrice de la publication : ${C.director}`,
          `Contact : ${C.email}`,
        ],
      ],
    },
    {
      h: "Hébergement",
      body: [
        [
          "Application et site : Hostinger, serveur situé à Paris, France",
          "Base de données et authentification : Supabase",
          "Certaines pages marketing historiques : ITACWT Limited (Systeme.io), Dublin, Irlande",
        ],
      ],
    },
    {
      h: "Propriété intellectuelle",
      body: [
        `L'ensemble des contenus de ce site et de ${C.product} (textes, vidéos, visuels, méthode, marques et logos) est protégé par le droit de la propriété intellectuelle et reste la propriété de ${C.name}. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable, est interdite.`,
      ],
    },
    {
      h: "Responsabilité",
      body: [
        "L'éditeur s'efforce d'assurer l'exactitude des informations publiées, sans pouvoir en garantir l'exhaustivité. Les liens vers des sites tiers sont fournis à titre d'information : l'éditeur n'exerce aucun contrôle sur leur contenu et décline toute responsabilité à leur égard.",
      ],
    },
    {
      h: "Signaler un contenu",
      body: [
        `Toute demande relative à un contenu publié sur ce site peut être adressée à ${C.email}.`,
      ],
    },
  ],
};

export const legal = fr;
