// lib/sio/etiquetteVente.ts
//
// L'ÉTIQUETTE SYSTEME.IO D'UN ACHETEUR DE L'ATELIER.
//
// -- LE TROU QUE CE FICHIER BOUCHE (audit du 31 août 2026) -------------
//
// Le bon de commande de l'Atelier n'a JAMAIS posé la moindre étiquette,
// ni par carte ni par PayPal. Ce n'était pas une panne : c'était du
// code jamais branché, et l'en-tête du webhook le disait en toutes
// lettres ("le tag Systeme.io n'est pas encore branché").
//
// Or les emails restent chez Systeme.io. Un acheteur non étiqueté sort
// donc de toutes les séquences : pas de bienvenue, pas de relance, pas
// de segment. Et le symptôme est l'absence de symptôme, puisque son
// accès et sa facture, eux, arrivent normalement.
//
// C'est exactement le trou que Tiquiz a bouché le 22 août, laissé
// ouvert ici pendant que l'Atelier vendait.
//
// -- ON DEMANDE À TIQUIZ, ON NE RECOPIE PAS ----------------------------
//
// Tout ce qui sait parler à Systeme.io vit là-bas : la clé du compte
// propriétaire, la création du contact avec ses champs de facturation,
// la recherche PAGINÉE d'étiquette (sans laquelle une étiquette
// ancienne est introuvable, cf. la panne de la newsletter du 31 août).
// Le recopier donnerait deux implémentations qui divergent et une
// deuxième clé à maintenir.
//
// -- APRÈS L'ACCÈS, ET JAMAIS BLOQUANT ---------------------------------
//
// Cette fonction ne jette jamais. Une étiquette qui échoue ne doit PAS
// priver quelqu'un de ce qu'il vient de payer : c'est la règle du
// 7 août. Elle CRIE dans le journal, parce qu'un acheteur hors des
// séquences est un client qu'on perd sans le voir.
//
// Le délai maximum n'est pas décoratif : sans lui, une panne de Tiquiz
// garderait le webhook de paiement ouvert jusqu'à ce que la plateforme
// le tue (leçon de `commissionnerVente`, audit du 24 août).

import "server-only";

import type { Acheteur } from "@/lib/facture/identite";

/**
 * L'étiquette d'un acheteur de l'Atelier.
 *
 * Béné, 31 août 2026, en la choisissant elle même : `atelier-clients`,
 * celle que portent déjà ses clients (créée le 25 juin 2026). Les
 * étiquettes qui commencent par `ads-` ne nous concernent PAS : "c'est
 * un test en pub qui ne nous concerne pas". Et il n'y a pas d'upsell
 * sur l'Atelier.
 *
 * Ce nom a été RELEVÉ dans son compte, jamais inventé : une étiquette
 * inconnue n'est pas créée (la porte de Tiquiz refuse), donc une faute
 * de frappe ne polluerait pas sa liste, mais elle ne poserait rien non
 * plus.
 */
export const TAG_CLIENT_ATELIER = "atelier-clients";

const ADRESSE_LOCALE = /^https?:\/\/(localhost|127\.|\[::1\])/i;

/** L'adresse de Tiquiz, refusée si elle est locale. */
function tiquizBaseUrl(): string {
  const brut = (process.env.TIQUIZ_BASE_URL ?? "").trim().replace(/\/$/, "");
  // Un `??` ne protège que de la variable ABSENTE, jamais de la
  // variable FAUSSE (drame Véronique, 2 août) : un `localhost` dans un
  // `.env` de prod enverrait la requête sur le serveur lui même.
  if (!brut || ADRESSE_LOCALE.test(brut)) return "https://quiz.tipote.com";
  return brut;
}

/**
 * Pose l'étiquette d'un acheteur. Ne jette jamais, ne bloque rien.
 *
 * `tag` est un PARAMÈTRE et pas une constante lue à l'intérieur : le
 * jour où l'Atelier vend autre chose, l'appelant devra dire quoi, au
 * lieu qu'une valeur par défaut étiquette silencieusement de travers.
 */
export async function poserEtiquetteAcheteur(args: {
  email: string;
  tag: string;
  acheteur?: Acheteur | null;
  locale?: string | null;
}): Promise<boolean> {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email || !args.tag) return false;

  const secret = (process.env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.error(
      `[sio/etiquette] PARTNER_SHARED_SECRET absente : ${email} n'est pas etiquete ` +
        `${args.tag}, il sortira des sequences email.`,
    );
    return false;
  }

  try {
    const res = await fetch(`${tiquizBaseUrl()}/api/partner/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": secret },
      body: JSON.stringify({
        email,
        tag: args.tag,
        locale: args.locale ?? "fr",
        acheteur: args.acheteur ?? null,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; raison?: string }
      | null;
    if (data?.ok) return true;
    console.error(
      `[sio/etiquette] ${args.tag} NON pose pour ${email} (${res.status}) : ` +
        `${data?.raison ?? "sans detail"}. Il sortira des sequences email.`,
    );
    return false;
  } catch (e) {
    console.error(
      `[sio/etiquette] Tiquiz injoignable pour etiqueter ${email} : ` +
        `${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}
