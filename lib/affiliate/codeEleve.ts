// lib/affiliate/codeEleve.ts
//
// LE CODE PUBLIC D'UN ÉLÈVE, DEMANDÉ AU REGISTRE CENTRAL.
//
// Béné, 26 août 2026, capture de l'onglet Affiliation à l'appui :
// "t'as pas oublié un truc ?" L'écran demandait un identifiant
// Systeme.io et fabriquait un lien vers leur tunnel, la veille du jour
// où l'Atelier est passé sur notre bon de commande.
//
// -- POURQUOI ON DEMANDE AU LIEU DE GARDER --------------------------
//
// La table `affiliates` vit chez Tipote, et c'est elle qui porte les
// clics, les conversions, les commissions et les versements. La copier
// ici donnerait DEUX registres, donc deux réponses différentes le jour
// où l'un prend du retard : c'est très exactement la faute qu'on répare,
// puisque l'Atelier avait le sien (`profiles.sio_affiliate_id`) et qu'il
// ne parlait à personne.
//
// -- CE QUI SE PASSE QUAND ÇA NE RÉPOND PAS -------------------------
//
// On rend `injoignable`, et l'écran le DIT. Il n'invente PAS un lien de
// repli : un lien fabriqué localement ne serait connu de personne, donc
// il ne commissionnerait rien, et l'élève partagerait pour rien sans
// pouvoir s'en apercevoir. Un `ok: false` produit toujours quelque chose
// à l'écran (règle du 3 août).

import "server-only";

export type CodeEleve =
  | { etat: "ok"; ref: string; sa: string; statut: string }
  | { etat: "exclu" }
  | { etat: "deja-affilie" }
  | { etat: "injoignable" };

export async function codePublicDeLEleve(args: {
  email: string;
  displayName?: string | null;
  locale?: string | null;
  /** L'identifiant Systeme.io que l'élève a collé, quand il en a un. */
  sa?: string | null;
}): Promise<CodeEleve> {
  const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
  if (!secret) {
    console.error(
      "[affiliation] AFFILIATE_INTERNAL_SECRET absente : impossible de " +
        "demander son code public au registre central.",
    );
    return { etat: "injoignable" };
  }

  const base = (process.env.TIPOTE_BASE_URL ?? "https://app.tipote.com")
    .trim()
    .replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/api/affiliate/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      // Un écran qui attend indéfiniment est un écran vide : le délai
      // maximum vaut ici comme dans le webhook (audit du 24 août).
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        email: args.email,
        displayName: args.displayName ?? null,
        locale: args.locale ?? "fr",
        sa: args.sa ?? null,
      }),
    });

    const corps = (await res.json().catch(() => null)) as
      | { ok?: boolean; ref?: string; sa?: string; statut?: string; reason?: string }
      | null;

    if (res.ok && corps?.ok && typeof corps.ref === "string" && corps.ref) {
      return {
        etat: "ok",
        ref: corps.ref,
        sa: String(corps.sa ?? ""),
        statut: String(corps.statut ?? "active"),
      };
    }

    // Le serveur renvoie la RAISON, l'écran écrit la phrase : c'est la
    // règle depuis la suppression d'un quiz (3 août).
    if (corps?.reason === "exclu") return { etat: "exclu" };
    if (corps?.reason === "email_deja_affiliee") return { etat: "deja-affilie" };

    console.error(
      `[affiliation] le registre central a refusé le code : ${res.status} ${corps?.reason ?? ""}`,
    );
    return { etat: "injoignable" };
  } catch (e) {
    console.error("[affiliation] registre central injoignable :", (e as Error).message);
    return { etat: "injoignable" };
  }
}
