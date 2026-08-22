// lib/checkout/commissionBase.ts
//
// SUR QUEL MONTANT ON PAIE UNE AFFILIÉE : LE HT, JAMAIS LE TTC.
//
// C'est la règle appliquée depuis toujours aux ventes Systeme.io :
// `app/api/affiliate/sio-sale/route.ts` passe `extractAmountHtCents()`
// à l'attribution, avec le commentaire "Base de commission = HT (règle
// Béné : 70% Atelier / 40% Tiquiz sur le HT)".
//
// -- POURQUOI CE FICHIER EXISTE ----------------------------------------
//
// Notre bon de commande vend en TTC (`tax_behavior: "inclusive"`) : le
// prix affiché ne bouge pas, c'est la part de TVA qui varie selon le
// pays. Stripe renvoie donc `amount_total` (ce que l'acheteuse a payé)
// et `total_details.amount_tax` (la TVA dedans).
//
// Prendre `amount_total` serait invisible et coûteux : sur l'Atelier à
// 47 € avec 20 % de TVA, 70 % de 47,00 € font 32,90 € au lieu de 70 %
// de 39,17 € qui font 27,42 €. **5,48 € de trop par vente**, versés
// sans que rien ne le signale, et une différence avec les commissions
// Systeme.io de la même affiliée sur le même produit.
//
// -- CE QUE LA FONCTION REFUSE DE FAIRE --------------------------------
//
// Elle ne devine JAMAIS un taux de TVA. Si Stripe ne dit pas la taxe
// (`automatic_tax` désactivé, pays sans TVA, vente exonérée), la taxe
// vaut zéro et le HT égale le TTC : c'est la vérité de cette vente là,
// pas un défaut à corriger avec une règle de trois.

/**
 * La base de commission, en centimes.
 *
 * `total` = ce qui a été encaissé, `taxe` = la TVA comprise dedans.
 * Tout ce qui n'est pas un nombre exploitable vaut zéro : une commission
 * calculée sur `NaN` produirait une ligne de versement absurde.
 */
export function commissionBaseCents(total: unknown, taxe: unknown): number {
  const ttc = Math.round(Number(total));
  if (!Number.isFinite(ttc) || ttc <= 0) return 0;

  const tva = Math.round(Number(taxe));
  // Une taxe absente, negative ou plus grande que le total ne peut pas
  // etre vraie : on l'ignore plutot que de rendre un HT negatif.
  if (!Number.isFinite(tva) || tva <= 0 || tva >= ttc) return ttc;

  return ttc - tva;
}
