// lib/appUrl.ts — URL publique de l'app, lue au RUNTIME.
//
// On privilegie APP_URL (runtime) a NEXT_PUBLIC_APP_URL (inline au build)
// pour eviter qu'une valeur gravee au build (ex. localhost:3002) fuite dans
// les liens partages. Cf. lib/email/templates.ts.
//
// -- POURQUOI ON VALIDE, ET PAS SEULEMENT `??` (drame Véronique, 2 août) -
//
// Côté Tiquiz, une cliente a demandé un nouveau mot de passe et est
// tombée sur "localhost n'autorise pas la connexion". Le code faisait
// `process.env.X ?? "https://quiz.tipote.com"`, et la variable était
// PRÉSENTE avec une valeur absurde : un `??` ne protège que du MANQUANT,
// jamais du FAUX. Le lien demandait vraiment à la cliente d'ouvrir un
// serveur sur SA machine.
//
// La cascade de ce fichier avait exactement la même forme. Elle valide
// maintenant ce qu'elle trouve : une adresse locale n'est jamais une
// réponse valable, quelle que soit sa provenance. Aucun appelant ne peut
// y perdre, puisque le seul cas qui change est celui où la valeur était
// inutilisable.
//
// L'enjeu a grandi le 20 août : ce module sert désormais à construire
// l'adresse de RETOUR d'un paiement. Une adresse locale y enverrait
// l'acheteuse sur sa propre machine juste après avoir payé, c'est à dire
// au pire moment possible.

/** Domaine de secours si rien d'exploitable n'est disponible. */
export const CANONICAL_APP_URL = "https://quizing.tipote.com";

/** Une adresse sur laquelle on peut vraiment envoyer quelqu'un ? */
export function isUsableOrigin(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  // `new URL("http://[::1]:3000").hostname` vaut "[::1]", crochets
  // compris : sans les retirer, l'IPv6 locale passait au travers.
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h.endsWith(".local")) return false;
  if (/^127\./.test(h)) return false;
  return true;
}

function propre(raw: string | null | undefined): string {
  return String(raw ?? "").trim().replace(/\/$/, "");
}

/**
 * URL publique de l'app.
 *
 * Ordre : `APP_URL`, puis `NEXT_PUBLIC_APP_URL`, puis, quand l'appelant
 * la connaît, l'origine de la requête en cours (le domaine par lequel la
 * personne est réellement arrivée), puis le domaine canonique.
 *
 * Le repli sur la requête n'est pas cosmétique : c'est ce qui empêche un
 * `.env` de prod mal renseigné de casser un lien envoyé à quelqu'un.
 */
export function resolveAppUrl(requestOrigin?: string | null): string {
  for (const candidat of [
    propre(process.env.APP_URL),
    propre(process.env.NEXT_PUBLIC_APP_URL),
    propre(requestOrigin),
  ]) {
    if (isUsableOrigin(candidat)) return candidat;
  }
  return CANONICAL_APP_URL;
}

/**
 * Compatibilité : l'ancien nom, sans origine de requête.
 *
 * Gardé parce qu'il est appelé partout dans les emails, et parce que le
 * renommer en masse dans le même commit mélangerait deux changements. Il
 * fait maintenant le tour de validation, donc il ne peut plus produire un
 * lien vers `localhost`.
 */
export function getAppUrl(): string {
  return resolveAppUrl(null);
}
