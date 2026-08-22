// lib/affiliate/ownerSale.ts
//
// UNE VENTE ENCAISSÉE CHEZ NOUS PAIE SON AFFILIÉE.
//
// -- LE TROU QUE CE FICHIER BOUCHE -------------------------------------
//
// Le tunnel Systeme.io attribuait bien : sa vente arrive sur
// `/api/affiliate/sio-sale`, qui appelle `attributeQuizingSale()`. Notre
// propre bon de commande, lui, n'appelait rien du tout. On avait déplacé
// la VENTE sans déplacer la COMMISSION.
//
// Le symptôme, c'est l'absence de symptôme : la page s'affiche, la carte
// passe, l'accès s'ouvre, l'argent arrive. Seule l'affiliée voit qu'il ne
// se passe rien chez elle, et elle ne peut rien prouver.
//
// -- APRÈS L'ACCÈS, ET JAMAIS AVANT ------------------------------------
//
// Cette fonction ne jette jamais et ne bloque rien. Une commission qui
// échoue ne doit pas priver une acheteuse de ce qu'elle a payé. Les
// échecs sont journalisés FORT : c'est de l'argent dû à quelqu'un.
//
// -- LES TROIS DÉCISIONS VIVENT AILLEURS, TESTÉES ----------------------
//
// - le taux : `affiliateMatchFor()`, un seul foyer (70 % Atelier,
//   40 % Tiquiz), jamais un pourcentage recopié ;
// - la base : `commissionBaseCents()`, le HT et jamais le TTC ;
// - l'identifiant : `readSa()`, qui refuse tout ce qui n'a pas la forme
//   d'un identifiant Systeme.io.

import "server-only";

import { affiliateMatchFor, attributeQuizingSale } from "@/lib/affiliateTracking";
import { commissionBaseCents } from "@/lib/checkout/commissionBase";
import { readSa } from "./sa";

export interface VenteACommissionner {
  /** Sert au préfixe de la référence et au journal. */
  moyen: "stripe" | "paypal";
  email: string | null;
  /** L'identifiant du paiement chez le fournisseur. Clé d'idempotence. */
  reference: string | null;
  /** Le `sa` transporté depuis le lien d'affiliation, s'il y en avait un. */
  affiliateRef: string | null;
  /** Ce qui a été encaissé, TVA comprise. */
  amountTotalCents: number;
  /**
   * La TVA comprise dans le total, quand le fournisseur la dit.
   *
   * Stripe la calcule et la renvoie. **PayPal ne la dit pas** : notre
   * commande PayPal envoie un montant unique, sans ventilation.
   *
   * DÉCISION BÉNÉ, 22 août 2026 : "pour paypal : oui on garde le TTC."
   * Une vente PayPal paie donc l'affiliée sur le TTC, soit un peu plus
   * que la même vente par carte. C'est un choix, pas un défaut, et il
   * vaut mieux que l'alternative : appliquer un taux de TVA inventé
   * produirait un versement faux qui a l'air juste.
   *
   * **Ne PAS "corriger" ça en posant 0.2 quelque part.** Le jour où
   * PayPal ventilera la taxe, c'est cette valeur là qu'on lira.
   */
  amountTaxCents: number;
  product: { id: string; label: string; affiliateApp: "quizing" | "tiquiz" };
}

export async function commissionnerVente(vente: VenteACommissionner): Promise<void> {
  try {
    const email = (vente.email ?? "").trim();
    const reference = (vente.reference ?? "").trim();
    if (!email || !reference) {
      console.error(
        `[commission] vente ${vente.moyen} sans ${!email ? "adresse" : "reference"} : ` +
          `aucune commission possible.`,
      );
      return;
    }

    const base = commissionBaseCents(vente.amountTotalCents, vente.amountTaxCents);
    if (base <= 0) {
      // On a l'adresse ET la reference : un montant a zero veut dire
      // qu'on a perdu la somme en route, pas qu'il n'y avait rien a
      // payer. Se taire ici rendrait la perte introuvable.
      console.error(
        `[commission] vente ${vente.moyen} ${reference} sans montant exploitable ` +
          `(encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c) : aucune commission.`,
      );
      return;
    }

    // Prefixe par moyen de paiement : ce n'est PAS un numero de commande
    // Systeme.io, et deux numerotations qui se melangent finissent par se
    // percuter sur la contrainte d'unicite.
    const ref = `${vente.moyen}:${reference}`;

    const resultat = await attributeQuizingSale({
      email,
      sio_order_id: ref,
      sio_payment_ref: ref,
      sale_amount_cents: base,
      product: affiliateMatchFor(vente.product.affiliateApp),
      product_name: vente.product.label,
      // `null` est le cas COURANT : sans lien d'affiliation, l'attribution
      // retombe sur la conversion par email, exactement comme Systeme.io.
      sa_hint: readSa(vente.affiliateRef),
      raw_payload: { source: `${vente.moyen}_checkout`, product: vente.product.id, reference },
    });

    if (resultat.status === "attributed") {
      console.log(
        `[commission] ${resultat.commission_cents} c pour ${resultat.sa} sur ${ref} ` +
          `(base ${base} c, encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c)`,
      );
      return;
    }
    if (resultat.status === "error") {
      console.error(`[commission] NON creee sur ${ref} : ${resultat.error}`);
      return;
    }
    // Les autres cas sont normaux et frequents (pas d'affiliee, doublon,
    // affiliee inconnue). On les trace quand meme : le jour ou une
    // affiliee dit "je n'ai pas ete payee", c'est cette ligne qui repond.
    console.log(`[commission] ${resultat.status} sur ${ref}`);
  } catch (e) {
    console.error(
      `[commission] attribution impossible : ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
