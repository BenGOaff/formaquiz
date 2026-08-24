// lib/facture/paypalVente.ts
//
// CE QU'UNE CAPTURE PAYPAL DIT DE L'ARGENT.
//
// **CE FICHIER N'EST PAS LE JUMEAU DE CELUI DE TIQUIZ, ET C'EST VOULU.**
// Tiquiz vend des ABONNEMENTS, donc des `PAYMENT.SALE.*` (API v1).
// L'Atelier vend un ACHAT UNIQUE, donc des `PAYMENT.CAPTURE.*` (API
// Orders v2). Les deux payloads n'ont ni les mêmes champs ni la même
// forme de montant :
//
//   vente v1    : amount.total    = "47.00"   amount.currency      = "EUR"
//   capture v2  : amount.value    = "47.00"   amount.currency_code = "EUR"
//
// Recopier l'un sur l'autre donnerait une facture à zéro euro, sans
// erreur nulle part. C'est exactement le piège du 7 août : raisonner sur
// la forme SUPPOSÉE d'un payload au lieu de la regarder.
//
// UNE VENTE = UNE FACTURE. Pas d'échéance ici : l'Atelier est payé une
// fois. Le déclencheur est donc la CAPTURE, jamais l'approbation de la
// commande (une commande approuvée peut ne jamais être capturée).

/** Un encaissement PayPal, réduit à ce qu'une facture demande. */
export interface EncaissementPaypal {
  /** L'identifiant de la capture. Clé d'idempotence, et ce qu'on rembourse. */
  saleRef: string;
  totalCents: number;
  currency: string;
  paidAt: string;
}

function nombreEnCents(v: unknown): number | null {
  // PayPal envoie ses montants en CHAÎNE. `Number("")` vaut 0 : sans le
  // test de chaîne vide, un montant absent deviendrait une facture à
  // zéro euro.
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function texte(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** L'encaissement porté par un `PAYMENT.CAPTURE.COMPLETED`. */
export function encaissementDepuisCapture(
  resource: unknown,
  recuLe?: string | null,
): EncaissementPaypal | null {
  const r = obj(resource);
  const saleRef = texte(r.id);
  if (!saleRef) return null;
  const montant = obj(r.amount);
  // `value` et `currency_code` : la v2, pas la v1.
  const cents = nombreEnCents(montant.value);
  if (cents === null || cents <= 0) return null;
  return {
    saleRef,
    totalCents: cents,
    currency: (texte(montant.currency_code) || "EUR").toLowerCase(),
    paidAt: texte(r.create_time) || texte(recuLe) || new Date().toISOString(),
  };
}

/** Ce qu'un remboursement annule. */
export interface RemboursementPaypal {
  /** L'identifiant du REMBOURSEMENT : la clé d'idempotence de l'avoir. */
  refundRef: string;
  /** La capture remboursée, celle dont on retrouve la facture. */
  saleRef: string | null;
  totalCents: number;
  currency: string;
  paidAt: string;
}

/**
 * Le remboursement porté par un `PAYMENT.CAPTURE.REFUNDED`.
 *
 * **La capture d'origine n'est PAS dans un champ, elle est dans les
 * LIENS.** La v2 ne porte pas de `sale_id` comme la v1 : le seul fil
 * vers la vente est `links[].href` qui finit par
 * `/payments/captures/<id>`. C'est déjà ce que fait `buildSales`, et
 * les deux lectures doivent rester d'accord.
 */
export function remboursementDepuisRefund(
  resource: unknown,
  recuLe?: string | null,
): RemboursementPaypal | null {
  const r = obj(resource);
  const refundRef = texte(r.id);
  if (!refundRef) return null;
  const montant = obj(r.amount);
  const cents = nombreEnCents(montant.value);
  if (cents === null || cents <= 0) return null;

  let saleRef: string | null = null;
  const liens = Array.isArray(r.links) ? r.links : [];
  for (const l of liens) {
    const m = texte(obj(l).href).match(/\/payments\/captures\/([^/]+)$/);
    if (m) {
      saleRef = m[1];
      break;
    }
  }

  return {
    refundRef,
    saleRef,
    totalCents: cents,
    currency: (texte(montant.currency_code) || "EUR").toLowerCase(),
    paidAt: texte(r.create_time) || texte(recuLe) || new Date().toISOString(),
  };
}
