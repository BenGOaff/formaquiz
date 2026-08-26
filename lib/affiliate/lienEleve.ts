// lib/affiliate/lienEleve.ts
//
// LE LIEN AFFILIÉ D'UN ÉLÈVE, FABRIQUÉ À UN SEUL ENDROIT.
//
// Le 26 août, en faisant porter le lien par le code public au lieu de
// l'identifiant Systeme.io, QUATRE appelants se sont retrouvés à passer
// un `sa` à une fonction qui attend un `ref` : l'onglet Affiliation, le
// kit de contenu, le QR du certificat et sa vérification. Aucun n'aurait
// planté : ils auraient rendu une chaîne vide ou l'adresse nue, donc des
// emails et des posts partagés sans aucun suivi.
//
// C'est la mécanique de "l'URL écrite en dur à deux endroits ne se
// corrige jamais qu'à moitié" (drame de l'Atelier, 3 août). D'où ce
// module : le lien d'un élève se demande ici, et nulle part ailleurs.

import "server-only";

import { ATELIER_SALES_URL, buildAffiliateLink } from "@/lib/affiliate";
import { codePublicDeLEleve } from "@/lib/affiliate/codeEleve";

export type LienEleve = {
  /** Le lien tracké, ou "" quand aucun code n'a pu être obtenu. */
  lien: string;
  /** L'adresse à afficher quand un lien tracké n'est pas disponible. */
  replinNonTracke: string;
  ref: string | null;
};

/**
 * Le lien tracké de cet élève.
 *
 * Chaîne vide plutôt qu'un lien non tracké : un lien nu se copie et se
 * partage exactement comme l'autre, et chaque partage est une vente
 * perdue que personne ne peut plus retrouver. Les écrans qui ont
 * BESOIN d'une adresse valide quoi qu'il arrive (le QR d'un certificat
 * déjà imprimé) prennent `replinNonTracke` en toute connaissance de
 * cause.
 */
export async function lienAffilieDeLEleve(args: {
  email: string | null;
  displayName?: string | null;
  sa?: string | null;
}): Promise<LienEleve> {
  const vide: LienEleve = { lien: "", replinNonTracke: ATELIER_SALES_URL, ref: null };
  if (!args.email) return vide;

  const code = await codePublicDeLEleve({
    email: args.email,
    displayName: args.displayName ?? null,
    sa: args.sa ?? null,
  });

  if (code.etat !== "ok") return vide;

  return {
    lien: buildAffiliateLink(code.ref),
    replinNonTracke: ATELIER_SALES_URL,
    ref: code.ref,
  };
}
