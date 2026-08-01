// lib/affiliateContentSpace.ts
//
// Arborescence de l'espace Contenu de l'affilié Atelier.
//
// C'est le MÊME modèle mental que l'espace affilié de Tipote
// (affiliate.tipote.com/contenus) : on descend dans des dossiers, on
// remonte par le fil d'Ariane, et chaque rayon porte le même nom des deux
// côtés. Un affilié qui promeut l'Atelier depuis l'un ou l'autre doit
// retrouver exactement la même organisation.
//
// Une seule différence, voulue : ici il n'y a pas d'étage "produit". Chez
// Tipote, /contenus commence par choisir entre l'Atelier et Tiquiz ; dans
// l'Atelier il n'y a qu'un produit à promouvoir, donc on entre directement
// dans les rayons. Ajouter un dossier à un seul élément serait un clic
// pour rien.

export const CONTENT_SECTIONS = [
  "emails",
  "reseaux",
  "articles",
  "logo",
  "generer",
] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];

export function isContentSection(v: string | undefined): v is ContentSection {
  return !!v && (CONTENT_SECTIONS as readonly string[]).includes(v);
}

/** Libellés affichés, alignés mot pour mot sur l'espace affilié Tipote. */
export const SECTION_LABEL: Record<ContentSection, string> = {
  emails: "Emails de vente",
  reseaux: "Réseaux sociaux",
  articles: "Articles de blog",
  logo: "Logo et branding",
  generer: "Générer du contenu",
};

export const SECTION_DESC: Record<ContentSection, string> = {
  emails:
    "La campagne complète, prête à coller dans ton outil d'emailing. Ton lien est déjà dedans.",
  reseaux:
    "Les posts et leurs visuels, à copier et publier tels quels. Carrousels inclus.",
  articles:
    "Des angles d'articles à développer sur ton blog, avec ton lien en conclusion.",
  logo: "Le kit visuel officiel de l'Atelier : logos, icônes, mockups, jaquette.",
  generer:
    "Un rédacteur IA qui connaît l'Atelier par coeur et écrit pour TON audience.",
};

export const CONTENT_ROOT = "/affiliation/contenu";

export function contentHref(section?: ContentSection): string {
  return section ? `${CONTENT_ROOT}/${section}` : CONTENT_ROOT;
}

/** Nom commercial, jamais traduit ni abrégé. */
export const PRODUCT_NAME = "L'Atelier du Quiz";
