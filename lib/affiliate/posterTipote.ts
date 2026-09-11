// lib/affiliate/posterTipote.ts
//
// L'APPEL VERS LE REGISTRE D'AFFILIÉS DE TIPOTE, ET RIEN D'AUTRE.
//
// Un seul endroit sait construire l'adresse et poser le secret : le
// webhook (à la vente) et le rejeu (plus tard) envoient EXACTEMENT le
// même appel. Deux constructions d'adresse finiraient par diverger, et
// un rejeu qui frappe une autre porte que l'appel d'origine ne
// rattraperait rien.
//
// Jumeau de celui de Tiquiz, à une différence près : ici l'adresse de
// Tipote vient de `TIPOTE_BASE_URL` (c'est ce que ce dépôt lit depuis
// le 26 août), là bas de `TIPOTE_AFFILIATE_ENDPOINT`.

import "server-only";

import type { ActionCommission } from "./filetCommission";

/** L'adresse de chaque action, dérivée d'UNE variable. */
export function endpointTipote(action: ActionCommission): string {
  const base = (process.env.TIPOTE_BASE_URL ?? "https://app.tipote.com").trim().replace(/\/$/, "");
  return `${base}/api/affiliate/${action === "attribuer" ? "attribute-sale" : "cancel-sale"}`;
}

export type ReponseTipote =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; statut: number | null; detail: string };

/**
 * Poste un corps vers Tipote. Ne jette JAMAIS : un échec est une
 * réponse, avec son statut HTTP quand il y en a un, `null` quand c'est
 * le réseau qui a lâché. `secret` absent est un échec sans statut, et
 * il se dit : sans lui, aucune vente ne paie personne.
 */
export async function posterVersTipote(action: ActionCommission, corps: unknown): Promise<ReponseTipote> {
  const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
  if (!secret) return { ok: false, statut: null, detail: "AFFILIATE_INTERNAL_SECRET absente du serveur de l'Atelier" };
  try {
    const res = await fetch(endpointTipote(action), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      // Un appel vers l'autre app tourne DANS le webhook de paiement :
      // sans délai maximum, une panne de Tipote garderait la requête
      // ouverte jusqu'à ce que la plateforme la tue (audit du 24 août).
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(corps),
    });
    if (!res.ok) {
      const texte = await res.text().catch(() => "");
      return { ok: false, statut: res.status, detail: texte.slice(0, 200) };
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: true, json };
  } catch (e) {
    return { ok: false, statut: null, detail: e instanceof Error ? e.message : String(e) };
  }
}
