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
// -- LE REGISTRE CENTRAL EST CELUI DE TIPOTE (26 août 2026) -----------
//
// Béné : "je veux notre propre système d'affiliation pour l'atelier
// comme pour tiquiz, je pensais que tu avais déjà bossé dessus."
//
// C'était fait à moitié. L'Atelier commissionnait bien, mais contre SON
// registre (`profiles.sio_affiliate_id`, dans sa base) : un affilié
// inscrit sur `affiliate.tipote.com` sans compte Systeme.io n'y existait
// pas, donc il n'était payé sur RIEN. Et depuis que nos liens portent
// `?ref=`, l'Atelier ne lisait même plus l'identifiant.
//
// On appelle donc **Tipote d'abord** (`affiliates`, la table que lit le
// tableau de bord des affiliés), et on ne retombe sur le registre local
// QUE si Tipote n'a attribué à personne.
//
// **L'ORDRE N'EST PAS UN DÉTAIL, ET LE REPLI NON PLUS.** Les deux bases
// ne partagent aucune contrainte d'unicité : appeler les deux à chaque
// vente paierait DEUX FOIS le même affilié, dans deux tableaux de bord
// différents, et personne ne le verrait avant le premier virement. Le
// repli ne s'exécute donc que sur un `no_affiliate_match` /
// `affiliate_not_registered` franc, jamais sur une ERREUR : une panne
// réseau ne doit pas faire basculer l'argent d'un registre à l'autre.
//
// Il existe pour une seule raison : un élève de l'Atelier qui est
// affilié LÀ-BAS et pas ici continue d'être payé exactement comme
// avant. Le jour où les deux registres seront fusionnés, il disparaît.
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
import { statutDepuisTipote, type VerdictCommission } from "@/lib/ventes/verdictCommission";
import { readSa } from "./sa";
import { marquerEnvoyee, mettreEnAttente } from "./filetCommissionStore";
import { posterVersTipote } from "./posterTipote";

export interface VenteACommissionner {
  /** Sert au préfixe de la référence et au journal. */
  moyen: "stripe" | "paypal";
  email: string | null;
  /** L'identifiant du paiement chez le fournisseur. Clé d'idempotence. */
  reference: string | null;
  /** Le `sa` transporté depuis un ANCIEN lien Systeme.io, s'il y en avait un. */
  affiliateRef: string | null;
  /**
   * Le CODE PUBLIC de nos liens actuels (`?ref=jocelyne`).
   *
   * Champ SÉPARÉ du `sa` : les deux ne se devinent jamais l'un l'autre.
   * C'est lui qui arrive sur une vente prise par un lien de l'espace
   * affilié depuis le 24 août 2026.
   */
  affiliateCode: string | null;
  /** Ce qui a été encaissé, TVA comprise. */
  amountTotalCents: number;
  /**
   * La TVA comprise dans le total, quand le fournisseur la dit.
   *
   * Stripe la calcule et la renvoie. **PayPal ne la dit pas** : notre
   * commande PayPal envoie un montant unique, sans ventilation.
   *
   * DÉCISION BÉNÉ, 31 août 2026 : "pour l'affiliation on fait
   * uniquement 40 % etc. sur le HT. Débrouille toi pour que sur PayPal
   * ça marche aussi, il y a forcément un moyen de calculer chez nous la
   * TVA si concerné ou pas."
   *
   * Ça REMPLACE sa décision du 22 août ("pour paypal : oui on garde le
   * TTC"), qui datait d'un moment où nous ne savions pas ventiler.
   * Depuis le 24 août, c'est NOUS qui émettons la facture d'une vente
   * PayPal, donc nous qui résolvons le régime de TVA de l'acheteur : le
   * webhook passe la taxe de CETTE facture là
   * (`lib/facture/taxeVentePaypal.ts`).
   *
   * **Ne PAS poser 0.2 ici, ni ailleurs.** Ce champ porte une taxe
   * CALCULÉE pour cette vente, jamais un taux appliqué de mémoire : un
   * acheteur belge, un professionnel en autoliquidation et un acheteur
   * hors UE n'ont pas la même, et un taux de mémoire les paierait tous
   * les trois faux.
   */
  amountTaxCents: number;
  product: { id: string; label: string; affiliateApp: "quizing" | "tiquiz" };
}

/**
 * ON REND LE VERDICT, ON NE LE JETTE PLUS DANS UN LOG (18 septembre 2026).
 *
 * Béné : "dans l'email que je reçois, je voudrais savoir en plus si la
 * vente est liée à un affilié, et si oui lequel."
 *
 * Cette fonction était la seule à connaître la réponse des DEUX
 * registres, et elle l'écrivait dans la sortie standard du serveur,
 * c'est à dire nulle part de consultable. Le jumeau Tiquiz a reçu
 * exactement la même correction le 17.
 *
 * Elle ne jette toujours jamais et ne bloque toujours rien : un
 * appelant qui ignore le retour se comporte exactement comme avant.
 */
export async function commissionnerVente(
  vente: VenteACommissionner,
): Promise<VerdictCommission> {
  try {
    const email = (vente.email ?? "").trim();
    const reference = (vente.reference ?? "").trim();
    if (!email || !reference) {
      console.error(
        `[commission] vente ${vente.moyen} sans ${!email ? "adresse" : "reference"} : ` +
          `aucune commission possible.`,
      );
      return {
        statut: "non_tentee",
        cents: null,
        affilie: null,
        detail: `${!email ? "adresse" : "reference"} manquante`,
      };
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
      return {
        statut: "non_tentee",
        cents: null,
        affilie: null,
        detail: "montant HT nul ou illisible",
      };
    }

    // Prefixe par moyen de paiement : ce n'est PAS un numero de commande
    // Systeme.io, et deux numerotations qui se melangent finissent par se
    // percuter sur la contrainte d'unicite.
    const ref = `${vente.moyen}:${reference}`;

    // ── 1. LE REGISTRE CENTRAL (Tipote) ──
    const central = await attribuerChezTipote({
      email,
      reference: ref,
      baseCents: base,
      produitLabel: vente.product.label,
      sa: readSa(vente.affiliateRef),
      code: vente.affiliateCode,
    });

    // ON NE BASCULE PAS sur le registre local quand Tipote a tranché,
    // ni quand il est injoignable : une panne réseau ferait partir
    // l'argent dans l'autre système, et deux registres qui paient la
    // même vente, c'est deux fois le même virement.
    if (centralATranche(central)) {
      if (central.statut === "en_attente") {
        console.error(
          `[commission] Tipote injoignable sur ${ref} : rien n'a ete ecrit, ` +
            `NI ici NI la-bas. Le rejeu s'en chargera.`,
        );
      }
      return central;
    }

    // ── 2. LE REGISTRE HISTORIQUE DE L'ATELIER ──
    //
    // Tipote ne connaît personne pour cette vente. Reste le cas d'un
    // élève de l'Atelier affilié ICI et pas encore là-bas : il continue
    // d'être payé exactement comme avant.
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
        `[commission] (registre Atelier) ${resultat.commission_cents} c pour ${resultat.sa} ` +
          `sur ${ref} (base ${base} c, encaisse ${vente.amountTotalCents} c)`,
      );
      return {
        statut: "attribuee",
        cents: Number(resultat.commission_cents) || null,
        affilie: resultat.sa ?? null,
        detail: "registre historique de l'Atelier",
        baseHtCents: base,
      };
    }
    if (resultat.status === "error") {
      console.error(`[commission] NON creee sur ${ref} : ${resultat.error}`);
      return {
        statut: "non_tentee",
        cents: null,
        affilie: null,
        detail: String(resultat.error ?? "").slice(0, 200),
        baseHtCents: base,
      };
    }
    // Les autres cas sont normaux et frequents (pas d'affiliee, doublon,
    // affiliee inconnue). On les trace quand meme : le jour ou une
    // affiliee dit "je n'ai pas ete payee", c'est cette ligne qui repond.
    console.log(`[commission] ${resultat.status} sur ${ref} (aucun des deux registres)`);
    // AUCUN DES DEUX n'a trouvé quelqu'un : c'est une vraie réponse, pas
    // une panne. Le central a déjà répondu `personne` juste au dessus.
    return {
      statut: statutDepuisTipote(resultat.status),
      cents: null,
      affilie: null,
      detail: "aucun des deux registres",
      baseHtCents: base,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[commission] attribution impossible : ${message}`);
    return {
      // Une exception ici est un cas qu'on n'a pas compris : il demande
      // un humain, et c'est ce statut qui le fait remonter.
      statut: "non_tentee",
      cents: null,
      affilie: null,
      detail: message.slice(0, 200),
    };
  }
}

/**
 * LE REGISTRE CENTRAL : la table `affiliates` de Tipote.
 *
 * C'est elle que lit `affiliate.tipote.com`, donc c'est elle qui décide
 * ce qu'un affilié voit dans son tableau de bord et ce qui part dans un
 * lot de virement. Écrire une deuxième table ici donnerait deux comptes
 * différents pour le même argent.
 *
 * Trois réponses, et elles ne se confondent pas :
 *   - `attribue`    : c'est fait, on s'arrête ;
 *   - `personne`    : Tipote ne connaît pas d'affilié pour cette vente,
 *                     l'appelant peut essayer le registre historique ;
 *   - `injoignable` : on N'A PAS PU REGARDER. Ce n'est pas la même
 *                     chose que "il n'y a personne", et confondre les
 *                     deux ferait payer deux fois (leçon du 23 août :
 *                     "je n'ai rien trouvé" et "je n'ai pas pu regarder"
 *                     sont deux réponses différentes).
 */
/**
 * CE QUE LE REGISTRE CENTRAL A RÉPONDU (18 septembre 2026).
 *
 * Ce type valait trois mots : `attribue`, `personne`, `injoignable`.
 * Il suffisait pour DÉCIDER (continuer vers le registre historique ou
 * non), et pas pour DIRE : l'email de vente doit nommer l'affilié et
 * son montant, et les deux étaient perdus ici.
 *
 * Le vocabulaire est celui de `lib/ventes/verdictCommission.ts`,
 * identique à l'octet près chez Tiquiz : les deux app appellent le même
 * registre, elles doivent en dire la même chose.
 */
type ReponseCentrale = VerdictCommission;

/** Le registre central a tranché : on ne va pas voir ailleurs. */
function centralATranche(v: VerdictCommission): boolean {
  return v.statut === "attribuee" || v.statut === "doublon" || v.statut === "en_attente";
}

async function attribuerChezTipote(v: {
  email: string;
  reference: string;
  baseCents: number;
  produitLabel: string;
  sa: string | null;
  code: string | null;
}): Promise<ReponseCentrale> {
  const corps = {
    customer_email: v.email,
    sale_amount_cents: v.baseCents,
    // `commissionBaseCents` a DÉJÀ retiré la TVA. Sans ce champ,
    // Tipote la raboterait une deuxième fois (audit du 26 août).
    base: "ht",
    // C'est NOUS qui encaissons et NOUS qui virerons : sans ce
    // champ la ligne serait comptée comme versée par Systeme.io,
    // donc exclue des lots, donc jamais payée.
    regle_par: "nous",
    // `atelier` décide du TAUX (70 %) côté Tipote. C'est la seule
    // chose qui le dit : un `source_app` faux paierait 40 %.
    source_app: "atelier",
    sio_order_id: v.reference,
    product_name: v.produitLabel,
    affiliate_ref: v.sa,
    affiliate_code: v.code,
    raw_payload: { source: "atelier_checkout", reference: v.reference },
  };

  const reponse = await posterVersTipote("attribuer", corps);
  if (!reponse.ok) {
    // ON NE PERD PLUS LA COMMISSION (11 septembre 2026). L'appel est
    // rangé tel quel et rejoué plus tard : Tipote répond `duplicate`
    // sur une clé déjà connue, donc le rejeu ne paie jamais deux fois.
    // L'appelant garde son repli sur le registre historique : ce
    // registre n'entre dans aucun lot, il ne peut donc pas payer deux
    // fois non plus.
    console.error(
      `[commission] Tipote n'a pas pris ${v.reference} (${reponse.statut ?? "reseau"}) : ${reponse.detail}`,
    );
    await mettreEnAttente({ action: "attribuer", reference: v.reference, corps, statut: reponse.statut, detail: reponse.detail });
    return {
      // `en_attente` et pas `non_tentee` : l'appel vient d'être rangé
      // pour rejeu, donc rien n'est perdu. Dire "non tentée" ferait
      // chercher une panne qui n'existe pas.
      statut: "en_attente",
      cents: null,
      affilie: null,
      detail: `Tipote n'a pas repondu (${reponse.statut ?? "reseau"}), rejeu programme`,
      baseHtCents: v.baseCents,
    };
  }
  await marquerEnvoyee("attribuer", v.reference);

  const r = (reponse.json.result ?? undefined) as
    | { status?: string; commission_cents?: number; sa?: string }
    | undefined;

  if (r?.status === "attributed") {
    console.log(
      `[commission] (registre central) ${r.commission_cents} c pour ${r.sa} sur ${v.reference}`,
    );
    return {
      statut: "attribuee",
      cents: Number(r.commission_cents) || null,
      affilie: r.sa ?? null,
      detail: null,
      baseHtCents: v.baseCents,
    };
  }
  // Un DOUBLON est un succès : la commission existe déjà chez Tipote,
  // et repartir sur le registre local en créerait une seconde.
  if (r?.status === "duplicate") {
    console.log(`[commission] deja enregistree chez Tipote sur ${v.reference}`);
    return { statut: "doublon", cents: null, affilie: r?.sa ?? null, detail: null, baseHtCents: v.baseCents };
  }
  return {
    statut: statutDepuisTipote(r?.status),
    cents: null,
    affilie: r?.sa ?? null,
    detail: null,
    baseHtCents: v.baseCents,
  };
}

/**
 * UN REMBOURSEMENT ANNULE LA COMMISSION, DES DEUX CÔTÉS.
 *
 * Depuis que les commissions de l'Atelier vivent chez Tipote, annuler
 * seulement dans le registre local laisserait la ligne centrale mûrir :
 * 30 jours plus tard elle entrerait dans un lot, et l'argent partirait
 * sur une vente remboursée. C'est exactement le trou du 26 août, à
 * l'envers.
 *
 * **La clé doit être EXACTEMENT celle de la création** (`stripe:<ref>`,
 * `paypal:<ref>`) : une clé qui ne correspond pas n'annule rien, en
 * silence.
 *
 * Ne jette JAMAIS. Un remboursement doit fermer l'accès même si Tipote
 * ne répond pas ; l'inverse ferait rejouer le remboursement en boucle.
 */
export async function annulerCommissionChezTipote(
  reference: string,
  motif: "remboursement" | "impaye" | "fraude" = "remboursement",
): Promise<void> {
  const cle = String(reference ?? "").trim();
  if (!cle) {
    console.error(`[commission] annulation centrale impossible (aucune reference) : a verifier a la main.`);
    return;
  }

  const corps = { source_app: "atelier", sio_order_id: cle, motif };
  const reponse = await posterVersTipote("annuler", corps);
  if (!reponse.ok) {
    // MEME FILET QUE L'ATTRIBUTION : une annulation qui ne passe pas
    // laisserait la commission murir et partir au lot. Elle attend, et
    // elle est rejouee avant la maturation (30 jours), tant que Tipote
    // finit par repondre.
    console.error(
      `[commission] annulation NON prise (${reponse.statut ?? "reseau"}) sur ${cle} : ${reponse.detail}. ` +
        `Mise en attente : sans rejeu, la commission peut encore partir en virement.`,
    );
    await mettreEnAttente({ action: "annuler", reference: cle, corps, statut: reponse.statut, detail: reponse.detail });
    return;
  }
  await marquerEnvoyee("annuler", cle);
  console.log(`[commission] annulation centrale demandee sur ${cle} (${motif})`);
}
