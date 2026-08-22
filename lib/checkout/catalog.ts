// lib/checkout/catalog.ts
//
// CE QUE BÉNÉ VEND ICI, ÉCRIT UNE SEULE FOIS.
//
// Chantier du 20 août 2026 : le paiement passe chez nous. La question à
// laquelle ce fichier répond est la seule qui compte au moment où l'argent
// rentre : **quel produit, à quel prix, et qu'est-ce que ça ouvre.**
//
// -- CE QUI EXISTE DÉJÀ, ET QU'ON NE REFAIT PAS ------------------------
//
// Ouvrir l'accès a déjà UN seul foyer : `grantAccessByEmail()`
// (`lib/access/grantAccess.ts`), appelé par les trois bons de commande
// Systeme.io via `handleSioAtelierWebhook()`. Notre paiement à nous
// appellera exactement la même fonction, avec le même palier.
//
// Ce n'est pas un détail de rangement : l'en-tête du webhook historique
// dit pourquoi, et c'est la leçon la plus chère de ce dépôt. "Recopiée
// par bon de commande, cette mécanique diverge. On corrige un bug d'un
// côté, pas de l'autre, et on ne le découvre qu'en voyant un client qui
// a payé sans avoir son accès."
//
// -- LA SOURCE EST DISTINCTE, ET C'EST VOULU ---------------------------
//
// Chaque bon de commande écrit sa propre `source` dans `enrollments` et
// dans les journaux. Notre paiement en a donc une à lui : sans ça, son
// idempotence se mélangerait à celle de Systeme.io, et un événement
// ancien pourrait rejouer une vente.

/** Le palier ouvert, tel que le connaît `lib/access/tiers.ts`. */
import type { AtelierTier } from "@/lib/access/tiers";

/** Les produits vendus par notre propre bon de commande. */
export type OwnerProductId = "atelier";

export interface OwnerProduct {
  /** Ce qui apparaît dans l'adresse du bon de commande. */
  id: OwnerProductId;
  /** Le nom lu par le client, sur la page ET sur le reçu Stripe. */
  label: string;
  /**
   * Le prix EN CENTIMES, **taxe comprise**.
   *
   * Béné, 12 août : "je facture toujours TTC donc par exemple c'est 47€
   * TTC, la TVA doit donc calculer pour arriver à ce montant."
   *
   * C'est exactement ce que fait Stripe avec `tax_behavior: "inclusive"` :
   * le montant payé ne bouge pas, quel que soit le pays du client, et
   * c'est la part de TVA qui varie à l'intérieur.
   *
   * ATTENTION : `tax_behavior` ne peut PLUS être modifié une fois posé sur
   * un prix Stripe. Ça se décide à la première ligne, pas après la
   * première vente.
   */
  amountCents: number;
  currency: "eur";
  /** `null` = paiement unique. L'Atelier est un achat à vie. */
  interval: "month" | "year" | null;
  /** Le palier ouvert par cette vente. */
  tier: AtelierTier;
  /** Ce qu'on écrit dans `enrollments.source` et dans les journaux. */
  source: string;
  /**
   * La famille d'affiliation, donc le taux de commission.
   *
   * Elle est NOMMÉE ici et pas devinée au moment de la vente : une vente
   * qui passe par notre bon de commande ne porte ni URL de tunnel ni
   * offer id Systeme.io, donc `detectProduct()` ne peut rien en dire.
   * Le taux lui même vit dans `lib/affiliateTracking.ts`
   * (`affiliateMatchFor`), à un seul endroit : un pourcentage recopié
   * dans un deuxième fichier finit toujours par diverger du premier.
   */
  affiliateApp: "quizing" | "tiquiz";
}

/**
 * LE CATALOGUE.
 *
 * **Un seul produit, et c'est une décision, pas un trou.** Béné, 20 août :
 * "on vend l'Atelier à 47 € uniquement." Notre bon de commande vend donc
 * l'Atelier complet, celui de `tipote.fr/atelier-du-quiz-bene`, qui ouvre
 * le palier `plus` (vérifié dans `app/api/systeme-io/webhook/route.ts`).
 *
 * Ne PAS ajouter ici l'Atelier du tunnel pub (palier `standard`) ni la
 * page de deuxième chance des bonus (`tipote.fr/atelier-du-quiz-bonus`).
 * Ces deux là continuent d'exister et de fonctionner : leurs bons de
 * commande Systeme.io et leurs webhooks (`/webhook/atelier`,
 * `/webhook/atelier-plus`, `/webhook/atelier-bonus`) sont intacts et ne
 * sont pas touchés par ce chantier. Ils ne se vendent simplement pas
 * depuis chez nous.
 */
export const OWNER_CATALOG: Readonly<Record<OwnerProductId, OwnerProduct>> = {
  atelier: {
    id: "atelier",
    label: "L'Atelier du Quiz",
    amountCents: 4700,
    currency: "eur",
    interval: null,
    tier: "plus",
    source: "stripe",
    affiliateApp: "quizing",
  },
} as const;

/** L'ordre d'affichage sur les écrans qui listent les produits. */
export const OWNER_PRODUCT_ORDER: readonly OwnerProductId[] = ["atelier"];

/**
 * Le produit désigné par un identifiant d'URL, ou `null`.
 *
 * **Un identifiant inconnu ne vend rien.** L'absence de configuration
 * FERME, comme partout ailleurs dans ce dépôt. Ici elle ne prive
 * personne : un identifiant que nous n'avons jamais émis ne peut pas
 * figurer dans un lien que nous avons envoyé.
 */
export function findOwnerProduct(id: string | null | undefined): OwnerProduct | null {
  const propre = String(id ?? "").trim().toLowerCase();
  if (!propre) return null;
  return (OWNER_CATALOG as Record<string, OwnerProduct>)[propre] ?? null;
}

/** Le palier ouvert par ce produit. Jamais deviné : lu dans le catalogue. */
export function tierForOwnerProduct(id: string | null | undefined): AtelierTier | null {
  return findOwnerProduct(id)?.tier ?? null;
}

/**
 * Le prix formaté pour l'écran.
 *
 * Il vit ici et pas dans un composant pour la raison habituelle : une page
 * de vente, un bon de commande et un email qui formatent chacun de leur
 * côté finissent par afficher trois prix différents pour la même chose.
 */
export function formatOwnerPrice(product: OwnerProduct, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: product.currency.toUpperCase(),
    // 47,00 € plutôt que 47 € : c'est un prix, pas un compte.
    minimumFractionDigits: 2,
  }).format(product.amountCents / 100);
}

/** La récurrence, en CLÉ. L'interface sait comment le dire, pas le catalogue. */
export function ownerBillingKey(product: OwnerProduct): "once" | "monthly" | "yearly" {
  if (product.interval === "month") return "monthly";
  if (product.interval === "year") return "yearly";
  return "once";
}
