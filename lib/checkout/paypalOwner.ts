// lib/checkout/paypalOwner.ts
//
// PAYER L'ATELIER EN PAYPAL, SUR LE COMPTE DE BÉNÉ.
//
// Beaucoup de gens n'ont pas envie de sortir leur carte et paient en
// PayPal ou pas du tout. Un bon de commande sans PayPal, ce ne sont pas
// des ventes qui passent ailleurs, ce sont des ventes qui ne se font
// pas.
//
// -- POURQUOI PAS LE SDK PAYPAL --------------------------------------
//
// Même raison que pour Stripe : l'API REST suffit, et une dépendance de
// moins est une dépendance de moins à faire monter au prochain
// `npm ci`. Le dépôt Tiquiz encaisse déjà comme ça pour les revendeurs
// (`lib/paypalRest.ts`), c'est du code éprouvé en production.
//
// -- LE PARCOURS, ET POURQUOI IL EST FAIT COMME ÇA -------------------
//
// 1. On crée une COMMANDE (`intent: CAPTURE`) et PayPal nous rend une
//    adresse d'approbation. L'acheteur y va, il approuve.
// 2. Il revient sur notre page de retour, qui ENCAISSE (capture).
// 3. **Le webhook `PAYMENT.CAPTURE.COMPLETED` ouvre l'accès**, pas la
//    page de retour.
//
// Le point 3 est le même que côté Stripe et pour la même raison : la
// page de retour est une URL comme une autre, et beaucoup d'acheteurs
// ne la voient jamais (paiement sur mobile, onglet fermé). Un accès qui
// dépend d'elle, c'est le drame Ivan reproduit à l'identique.
//
// Corollaire rassurant : une commande approuvée mais jamais encaissée
// (onglet fermé avant le retour) est annulée par PayPal au bout de
// 3 jours. Personne n'est débité pour rien.
//
// -- LES MONTANTS -----------------------------------------------------
//
// PayPal veut des euros en chaîne de caractères ("47.00"), pas des
// centimes. La conversion vit ici et NULLE PART AILLEURS : un montant
// converti à deux endroits finit par diverger d'un centime, et un
// centime d'écart entre ce qui est affiché et ce qui est prélevé, c'est
// une contestation.
//
// -- LA TVA -----------------------------------------------------------
//
// PayPal ne sait pas calculer la TVA par pays comme Stripe Tax. Le prix
// TTC est donc envoyé tel quel : l'acheteur paie exactement 47,00 €,
// comme sur le formulaire carte. La ventilation de TVA se fait dans la
// comptabilité de Béné, pas dans le tunnel. C'est une différence assumée
// entre les deux moyens de paiement, et elle est dite à l'écran.

import type { OwnerProduct } from "@/lib/checkout/catalog";
import type { OwnerPaypalAccount } from "@/lib/checkout/ownerAccount";

/** Les événements PayPal qui nous intéressent. */
export const OWNER_PAYPAL_EVENTS = [
  // L'argent est encaissé : c'est celui qui ouvre l'accès.
  "PAYMENT.CAPTURE.COMPLETED",
  // L'argent repart : celui qui le referme.
  "PAYMENT.CAPTURE.REFUNDED",
  // Un litige. On ne ferme rien dessus (ce n'est pas la même décision
  // qu'un remboursement), mais on veut le voir passer dans le journal.
  "PAYMENT.CAPTURE.REVERSED",
] as const;

/** L'adresse de l'API, selon que le compte est en réel ou en bac à sable. */
export function paypalOwnerBase(mode: "live" | "test"): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/**
 * Les centimes du catalogue, en euros tels que PayPal les attend.
 *
 * `toFixed(2)` et pas une division affichée : 4700 / 100 vaut 47 et
 * s'écrirait "47", que PayPal refuse. Il veut deux décimales.
 */
export function paypalAmount(amountCents: number): string {
  return (Math.round(amountCents) / 100).toFixed(2);
}

async function token(compte: OwnerPaypalAccount): Promise<string | null> {
  const auth = Buffer.from(`${compte.clientId}:${compte.secret}`).toString("base64");
  try {
    const res = await fetch(`${paypalOwnerBase(compte.mode)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

export type PaypalFailure = "not_configured" | "paypal_refused" | "network";

export interface PaypalOrderResult {
  ok: boolean;
  orderId?: string;
  /** Là où on envoie l'acheteur pour qu'il approuve. */
  approveUrl?: string;
  reason?: PaypalFailure;
  /** Le message brut de PayPal, pour le journal. JAMAIS affiché. */
  detail?: string;
}

/**
 * Crée la commande PayPal et rend l'adresse d'approbation.
 *
 * `custom_id` porte l'identifiant du produit : c'est lui qu'on relira
 * dans le webhook pour savoir QUOI ouvrir. Le prix, lui, vient du
 * catalogue et jamais du navigateur, même règle que pour Stripe : un
 * montant reçu du client serait un montant négociable par le client.
 */
export async function createOwnerPaypalOrder(args: {
  compte: OwnerPaypalAccount;
  product: OwnerProduct;
  returnUrl: string;
  cancelUrl: string;
  affiliateRef?: string | null;
  /** Le CODE PUBLIC de nos liens (`?ref=`), distinct du `sa`. */
  affiliateCode?: string | null;
  /** L'adresse SAISIE sur le bon de commande. Elle gagne sur celle de PayPal. */
  email?: string | null;
}): Promise<PaypalOrderResult> {
  const jeton = await token(args.compte);
  if (!jeton) return { ok: false, reason: "not_configured", detail: "token refuse" };

  const p = args.product;
  const corps = {
    intent: "CAPTURE",
    purchase_units: [
      {
        // Ce qu'on relit dans le webhook. PayPal le recopie sur la
        // capture, donc il survit à tout le parcours.
        // L'ADRESSE SAISIE VOYAGE ICI, ET ELLE GAGNE.
        //
        // PayPal nous rend l'adresse du COMPTE PayPal, qui n'est pas
        // toujours celle utilisée chez nous (compte du conjoint, adresse
        // pro). Ouvrir l'accès sur celle-là fabrique un compte orphelin,
        // ce que l'Atelier a déjà rencontré le 7 août sur les commandes
        // de bonus.
        //
        // **Le champ est AJOUTÉ EN FIN** : une commande en cours le jour
        // du déploiement se relit exactement comme avant, aux mêmes
        // positions. C'est la même règle que côté Tiquiz.
        custom_id: buildCustomId(p.id, args.affiliateRef, args.email, args.affiliateCode),
        description: p.label.slice(0, 127),
        amount: {
          currency_code: p.currency.toUpperCase(),
          value: paypalAmount(p.amountCents),
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "L'Atelier du Quiz",
          locale: "fr-FR",
          // L'acheteur revient chez nous des qu'il a approuve, sans
          // ecran intermediaire "vous allez etre redirige".
          user_action: "PAY_NOW",
          return_url: args.returnUrl,
          cancel_url: args.cancelUrl,
        },
      },
    },
  };

  try {
    const res = await fetch(`${paypalOwnerBase(args.compte.mode)}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      links?: Array<{ rel?: string; href?: string }>;
      message?: string;
    };
    if (!res.ok || !json.id) {
      return { ok: false, reason: "paypal_refused", detail: json.message ?? `HTTP ${res.status}` };
    }
    const approve = (json.links ?? []).find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve?.href) {
      return { ok: false, reason: "paypal_refused", detail: "aucune adresse d'approbation" };
    }
    return { ok: true, orderId: json.id, approveUrl: approve.href };
  } catch (e) {
    return { ok: false, reason: "network", detail: (e as Error).message };
  }
}

export interface PaypalCaptureInfo {
  paid: boolean;
  email: string | null;
  name: string | null;
  productId: string | null;
  affiliateRef: string | null;
  /** Le code public de nos liens, quand la commande en portait un. */
  affiliateCode: string | null;
  /** L'identifiant de la capture, celui qu'on rembourse. */
  captureId: string | null;
  /**
   * Ce qui a été encaissé, en centimes.
   *
   * C'est un TTC : notre commande envoie un montant unique, PayPal ne
   * ventile rien. La TVA est calculée de NOTRE côté, au moment de la
   * facture (`lib/facture/taxeVentePaypal.ts`), et c'est elle qui donne
   * la base de commission depuis le 31 août.
   *
   * Ce champ reste donc un TTC, et il ne faut pas y retirer la taxe :
   * `commissionBaseCents` attend le total ET la taxe séparément.
   */
  amountTotalCents: number;
}

/** "47.00" -> 4700. Tout ce qui n'est pas un montant vaut zéro. */
export function paypalAmountToCents(raw: unknown): number {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/**
 * `atelier|SA|adresse@saisie.fr|CODE`
 *
 * **Le 4e champ est AJOUTÉ EN FIN, et ce n'est pas cosmétique** : une
 * commande PayPal déjà en cours le jour du déploiement se relit
 * exactement comme avant, aux mêmes positions. C'est la règle appliquée
 * côté Tiquiz le 24 août, et elle est testée.
 *
 * PayPal borne `custom_id` à 127 caractères. **L'ORDRE DES SACRIFICES
 * COMPTE** : on lâche d'abord le `sa` d'un ancien lien, puis le code
 * public, JAMAIS l'adresse. Une attribution perdue peut se retrouver par
 * la conversion enregistrée à l'email ; un accès ouvert sur la mauvaise
 * adresse ne se retrouve pas.
 */
export function buildCustomId(
  productId: string,
  affiliateRef?: string | null,
  email?: string | null,
  affiliateCode?: string | null,
): string {
  const ref = String(affiliateRef ?? "").trim();
  const code = String(affiliateCode ?? "").trim();
  const adresse = String(email ?? "").trim().toLowerCase();
  const complet = `${productId}|${ref}|${adresse}|${code}`;
  if (complet.length <= 127) return complet;
  const sansRef = `${productId}||${adresse}|${code}`;
  if (sansRef.length <= 127) {
    console.warn(`[paypal] custom_id trop long : le sa est lache pour ${adresse}.`);
    return sansRef;
  }
  const sansRien = `${productId}||${adresse}|`;
  if (sansRien.length <= 127) {
    console.warn(`[paypal] custom_id trop long : sa ET code laches pour ${adresse}.`);
    return sansRien;
  }
  console.warn(`[paypal] custom_id trop long pour ${adresse} : adresse tronquee, acces a verifier.`);
  return sansRien.slice(0, 127);
}

/** Sépare `atelier|SA|adresse|CODE` en ses morceaux. */
export function readCustomId(raw: string | null | undefined): {
  productId: string | null;
  affiliateRef: string | null;
  affiliateCode: string | null;
  email: string | null;
} {
  const s = String(raw ?? "").trim();
  if (!s) return { productId: null, affiliateRef: null, affiliateCode: null, email: null };
  const [produit, ref, adresse, code] = s.split("|");
  return {
    productId: produit || null,
    affiliateRef: ref || null,
    // Absent des commandes antérieures au 26 août : `null`, et
    // l'attribution retombe sur le `sa` et l'email, comme avant.
    affiliateCode: (code ?? "").trim() || null,
    // Les anciennes commandes n'ont que deux champs : `email` vaut alors
    // `null`, et on retombe sur l'adresse du compte PayPal comme avant.
    email: (adresse ?? "").trim().toLowerCase() || null,
  };
}

/** La forme d'une commande PayPal, réduite à ce qu'on lit. */
interface OrderShape {
  status?: string;
  payer?: {
    email_address?: string | null;
    name?: { given_name?: string | null } | null;
  } | null;
  purchase_units?: Array<{
    custom_id?: string | null;
    amount?: { value?: string | null } | null;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string | null } | null;
      }>;
    } | null;
  }>;
}

function readOrder(json: OrderShape): PaypalCaptureInfo {
  const unit = json.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const { productId, affiliateRef, affiliateCode, email: saisi } = readCustomId(unit?.custom_id);
  return {
    paid: json.status === "COMPLETED" && capture?.status === "COMPLETED",
    // L'ADRESSE SAISIE GAGNE sur celle du compte PayPal. Voir
    // `buildCustomId`. Sans commande récente, `saisi` vaut null et on
    // retombe exactement sur le comportement d'avant.
    email: saisi ?? json.payer?.email_address ?? null,
    name: json.payer?.name?.given_name ?? null,
    productId,
    affiliateRef,
    affiliateCode,
    captureId: capture?.id ?? null,
    // Ce que la CAPTURE a vraiment pris d'abord (c'est l'argent reel),
    // le montant demande ensuite. Les deux sont egaux en temps normal ;
    // quand ils different, c'est la capture qui fait foi.
    amountTotalCents:
      paypalAmountToCents(capture?.amount?.value) || paypalAmountToCents(unit?.amount?.value),
  };
}

/**
 * Encaisse la commande approuvée.
 *
 * Idempotent du côté de PayPal : rappeler une capture déjà faite rend
 * une erreur `ORDER_ALREADY_CAPTURED`, qu'on traite comme un succès en
 * relisant la commande. Sans ça, un acheteur qui rafraîchit sa page de
 * retour verrait une erreur alors que son argent est bien passé.
 */
export async function captureOwnerPaypalOrder(args: {
  compte: OwnerPaypalAccount;
  orderId: string;
}): Promise<PaypalCaptureInfo | null> {
  const jeton = await token(args.compte);
  if (!jeton) return null;
  const base = paypalOwnerBase(args.compte.mode);

  try {
    const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(args.orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as OrderShape & {
      details?: Array<{ issue?: string }>;
    };
    if (res.ok) return readOrder(json);

    // Déjà encaissée : ce n'est pas un échec, c'est un rafraîchissement.
    const dejaFaite = (json.details ?? []).some((d) => d.issue === "ORDER_ALREADY_CAPTURED");
    if (dejaFaite) return await getOwnerPaypalOrder(args);
    return null;
  } catch {
    return null;
  }
}

/** Relit une commande sans rien encaisser. */
export async function getOwnerPaypalOrder(args: {
  compte: OwnerPaypalAccount;
  orderId: string;
}): Promise<PaypalCaptureInfo | null> {
  const jeton = await token(args.compte);
  if (!jeton) return null;
  try {
    const res = await fetch(
      `${paypalOwnerBase(args.compte.mode)}/v2/checkout/orders/${encodeURIComponent(args.orderId)}`,
      { headers: { Authorization: `Bearer ${jeton}` } },
    );
    if (!res.ok) return null;
    return readOrder((await res.json()) as OrderShape);
  } catch {
    return null;
  }
}

/**
 * Rembourse une capture, en totalité.
 *
 * Sert à l'écran d'administration. On ne propose PAS le remboursement
 * partiel : côté Stripe il ne coupe pas l'accès, et offrir ici un geste
 * dont la conséquence diffère selon le moyen de paiement serait un piège
 * pour celle qui clique.
 */
export async function refundOwnerPaypalCapture(args: {
  compte: OwnerPaypalAccount;
  captureId: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const jeton = await token(args.compte);
  if (!jeton) return { ok: false, detail: "token refuse" };
  try {
    const res = await fetch(
      `${paypalOwnerBase(args.compte.mode)}/v2/payments/captures/${encodeURIComponent(args.captureId)}/refund`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, detail: json.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

/**
 * Vérifie qu'un appel de webhook vient VRAIMENT de PayPal.
 *
 * PayPal ne signe pas avec un secret partagé comme Stripe : on lui
 * renvoie l'en-tête et le corps, et c'est LUI qui dit si c'est authentique.
 * Ça coûte un aller-retour réseau, et c'est le seul moyen fiable.
 *
 * Sans `PAYPAL_WEBHOOK_ID_OWNER`, on ne peut rien vérifier : la fonction
 * rend `false`. L'absence FERME, comme partout ailleurs.
 */
export async function verifyOwnerPaypalWebhook(args: {
  compte: OwnerPaypalAccount;
  webhookId: string;
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const jeton = await token(args.compte);
  if (!jeton || !args.webhookId) return false;

  const h = (n: string) => args.headers.get(n) ?? "";
  const corps = {
    auth_algo: h("paypal-auth-algo"),
    cert_url: h("paypal-cert-url"),
    transmission_id: h("paypal-transmission-id"),
    transmission_sig: h("paypal-transmission-sig"),
    transmission_time: h("paypal-transmission-time"),
    webhook_id: args.webhookId,
    webhook_event: JSON.parse(args.rawBody),
  };
  if (!corps.transmission_id || !corps.transmission_sig) return false;

  try {
    const res = await fetch(
      `${paypalOwnerBase(args.compte.mode)}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      },
    );
    if (!res.ok) return false;
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
